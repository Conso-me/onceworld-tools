/**
 * スクリーンショットOCRからチーム構造（レベル+チーム分け+属性）を抽出する
 *
 * 処理フロー:
 * 1. Tesseract.js (eng) で全文OCR → word単位のbounding box取得
 * 2. `Lv.XXX` パターンを抽出（OCR誤読 "Lu.", "v." 等も考慮）
 * 3. A/B/C ラベルをy座標で検出 → チームの境界を特定
 * 4. 各 Lv.XXX を最も近い上方のチームラベルに帰属
 * 5. フォールバック: ラベル検出失敗時はy座標のギャップでクラスタリング
 * 6. 各モンスターの属性アイコン色を検出（Lv.テキスト上方の最高彩度ピクセル）
 *
 * モンスターの特定はOCRでは行わない（スプライト画像のみで文字がないため）。
 * レベル・チーム構造・属性を抽出し、モンスター選択はユーザーが手動で行う。
 */

import type { Element } from "../types/game";
import { initMatcher, matchMonsterIcon, type MatchConfidence } from "./monsterMatcher";

type TeamId = "A" | "B" | "C";

export interface OcrSlot {
  level: number;
  x: number; // bounding box の x 座標
  y: number; // bounding box の y 座標
  element?: Element; // 属性アイコンから検出した属性
  matchedMonster?: string; // テンプレート照合で特定したモンスター名
  matchConfidence?: MatchConfidence; // 照合の信頼度
  matchRegion?: { x: number; y: number; w: number; h: number }; // デバッグ用マッチ領域
}

export interface OcrTeamResult {
  teams: Record<TeamId, OcrSlot[]>;
  rawText: string;
}

interface WordBox {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

// Tesseract worker のキャッシュ
let cachedWorker: Awaited<ReturnType<typeof createWorker>> | null = null;
let workerTimer: ReturnType<typeof setTimeout> | null = null;

type TesseractModule = typeof import("tesseract.js");

async function createWorker() {
  const Tesseract: TesseractModule = await import("tesseract.js");
  const worker = await Tesseract.createWorker("eng");
  return worker;
}

async function getWorker() {
  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = null;
  }

  if (!cachedWorker) {
    cachedWorker = await createWorker();
  }

  // 60秒無操作で terminate
  workerTimer = setTimeout(async () => {
    if (cachedWorker) {
      await cachedWorker.terminate();
      cachedWorker = null;
    }
    workerTimer = null;
  }, 60_000);

  return cachedWorker;
}

// Lv.XXX パターン — OCR誤読も考慮
// 正常: "Lv.1089", "Lv.739"
// 誤読: "Lu.541" (v→u), "v.23" (L欠落), "Ly.100" (v→y)
const LV_PATTERN = /[Ll]?[VvUuYy]\.?\s*(\d+)/;

export async function ocrParseScreenshot(
  imageSource: File | string
): Promise<OcrTeamResult> {
  const worker = await getWorker();
  // blocks: true が必要 — word単位のbounding boxを取得するため
  const result = await worker.recognize(imageSource, {}, { blocks: true });

  const words: WordBox[] = [];
  for (const block of result.data.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          words.push({
            text: word.text,
            bbox: word.bbox,
          });
        }
      }
    }
  }

  // Lv.XXX パターンを抽出
  const lvEntries: { level: number; x: number; y: number }[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const match = w.text.match(LV_PATTERN);
    if (match) {
      lvEntries.push({ level: parseInt(match[1], 10), x: w.bbox.x0, y: w.bbox.y0 });
      continue;
    }

    // "Lv." と数字が別wordになるケース
    if (/^[Ll][Vv]\.?$/i.test(w.text) && i + 1 < words.length) {
      const next = words[i + 1];
      const numMatch = next.text.match(/^(\d+)/);
      if (numMatch && Math.abs(next.bbox.y0 - w.bbox.y0) < 30) {
        lvEntries.push({ level: parseInt(numMatch[1], 10), x: w.bbox.x0, y: w.bbox.y0 });
        i++; // skip next
      }
    }
  }

  // チームラベル検出: A/B/C + "チーム" or 単独
  const teamLabels: { team: TeamId; y: number }[] = [];
  const teamPattern = /^([ABC])\s*チ/;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const combined = teamPattern.exec(w.text);
    if (combined) {
      teamLabels.push({ team: combined[1] as TeamId, y: w.bbox.y0 });
      continue;
    }

    if (/^[ABC]$/.test(w.text) && i + 1 < words.length) {
      const next = words[i + 1];
      if (/^チ/.test(next.text) && Math.abs(next.bbox.y0 - w.bbox.y0) < 30) {
        teamLabels.push({ team: w.text as TeamId, y: w.bbox.y0 });
      }
    }
  }

  // y座標でソート
  teamLabels.sort((a, b) => a.y - b.y);
  lvEntries.sort((a, b) => a.y - b.y);

  const teams: Record<TeamId, OcrSlot[]> = { A: [], B: [], C: [] };

  if (teamLabels.length >= 2) {
    // ラベルベースの帰属
    for (const lv of lvEntries) {
      let assignedTeam: TeamId = teamLabels[0].team;
      for (const label of teamLabels) {
        if (label.y <= lv.y + 10) {
          assignedTeam = label.team;
        } else {
          break;
        }
      }
      teams[assignedTeam].push({ level: lv.level, x: lv.x, y: lv.y });
    }
  } else {
    // フォールバック: y座標のギャップでクラスタリング
    const clusters = clusterByYGap(lvEntries);
    const teamIds: TeamId[] = ["A", "B", "C"];
    for (let i = 0; i < Math.min(clusters.length, 3); i++) {
      teams[teamIds[i]] = clusters[i];
    }
  }

  // 属性色検出
  try {
    await detectElementColors(imageSource, teams);
  } catch {
    // 色検出失敗時は属性なしで続行
  }

  // モンスターアイコン照合
  try {
    await matchMonsterIcons(imageSource, teams);
  } catch {
    // 照合失敗時はモンスター未特定で続行
  }

  return {
    teams,
    rawText: result.data.text,
  };
}

// ── 属性色検出 ──────────────────────────────────────────────────────────────

async function detectElementColors(
  imageSource: File | string,
  teams: Record<TeamId, OcrSlot[]>
): Promise<void> {
  const img = await loadImageElement(imageSource);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0);

  for (const tid of ["A", "B", "C"] as TeamId[]) {
    for (const slot of teams[tid]) {
      slot.element = detectElementAtPosition(ctx, slot.x, slot.y, img.width, img.height);
    }
  }
}

function loadImageElement(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (typeof url === "string") URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    let url: string | undefined;
    if (source instanceof File) {
      url = URL.createObjectURL(source);
      img.src = url;
    } else {
      img.src = source;
    }
  });
}

/**
 * Lv.テキスト位置の上方を走査し、属性アイコンの色を検出する。
 * 属性アイコンは小さな円形で高彩度の単色のため、
 * 走査領域内で最も彩度の高いピクセルクラスタを取得して色相で分類する。
 */
function detectElementAtPosition(
  ctx: CanvasRenderingContext2D,
  lvX: number,
  lvY: number,
  imgW: number,
  imgH: number,
): Element | undefined {
  let bestSat = 0;
  let bestR = 0, bestG = 0, bestB = 0;

  // Lv.テキスト上方の広い領域をグリッド走査
  for (let dy = -180; dy <= -40; dy += 8) {
    for (let dx = -20; dx <= 180; dx += 8) {
      const cx = lvX + dx;
      const cy = lvY + dy;
      if (cx < 3 || cy < 3 || cx >= imgW - 3 || cy >= imgH - 3) continue;

      // 7x7 ピクセルの平均色を取得
      const data = ctx.getImageData(cx - 3, cy - 3, 7, 7).data;
      let r = 0, g = 0, b = 0;
      const count = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i + 1]; b += data[i + 2];
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (sat > bestSat) {
        bestSat = sat;
        bestR = r; bestG = g; bestB = b;
      }
    }
  }

  // 彩度が低い場合は属性不明
  if (bestSat < 80) return undefined;

  return classifyElementColor(bestR, bestG, bestB);
}

function classifyElementColor(r: number, g: number, b: number): Element | undefined {
  const hue = rgbToHue(r, g, b);
  if (hue <= 40 || hue >= 330) return "火";
  if (hue > 40 && hue <= 75) return "光";
  if (hue > 75 && hue <= 165) return "木";
  if (hue > 165 && hue <= 260) return "水";
  if (hue > 260 && hue < 330) return "闇";
  return undefined;
}

function rgbToHue(r: number, g: number, b: number): number {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}

// ── クラスタリング ─────────────────────────────────────────────────────────

function clusterByYGap(entries: { level: number; x: number; y: number }[]): OcrSlot[][] {
  if (entries.length === 0) return [];

  const clusters: OcrSlot[][] = [[{ level: entries[0].level, x: entries[0].x, y: entries[0].y }]];

  for (let i = 1; i < entries.length; i++) {
    const gap = entries[i].y - entries[i - 1].y;
    const slot: OcrSlot = { level: entries[i].level, x: entries[i].x, y: entries[i].y };
    if (gap > 50) {
      clusters.push([slot]);
    } else {
      clusters[clusters.length - 1].push(slot);
    }
  }

  return clusters;
}

// ── モンスターアイコン照合 ────────────────────────────────────────────────────

async function matchMonsterIcons(
  imageSource: File | string,
  teams: Record<TeamId, OcrSlot[]>,
): Promise<void> {
  let count: number;
  try {
    count = await initMatcher();
  } catch (e) {
    console.warn("[matchMonsterIcons] initMatcher failed:", e);
    return;
  }
  if (count === 0) return; // テンプレート未登録

  const img = await loadImageElement(imageSource);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0);

  // チーム内のスロット間隔からアイコンサイズを推定（チーム間のギャップを除外）
  const allSlots: OcrSlot[] = [];
  for (const tid of ["A", "B", "C"] as TeamId[]) {
    allSlots.push(...teams[tid]);
  }
  let iconSize = Math.round(img.width * 0.08); // 画像幅ベースのデフォルト
  const intraTeamGaps: number[] = [];
  for (const tid of ["A", "B", "C"] as TeamId[]) {
    const slots = teams[tid];
    if (slots.length < 2) continue;
    const sortedX = slots.map((s) => s.x).sort((a, b) => a - b);
    for (let i = 1; i < sortedX.length; i++) {
      const gap = sortedX[i] - sortedX[i - 1];
      if (gap > 30 && gap < img.width * 0.3) intraTeamGaps.push(gap);
    }
  }
  if (intraTeamGaps.length > 0) {
    intraTeamGaps.sort((a, b) => a - b);
    iconSize = intraTeamGaps[Math.floor(intraTeamGaps.length / 2)]; // 中央値で外れ値耐性
  }

  console.log(`[matchMonsterIcons] img=${img.width}x${img.height}, iconSize=${iconSize}, slots=${allSlots.length}`);

  for (const tid of ["A", "B", "C"] as TeamId[]) {
    const slots = teams[tid];
    if (slots.length === 0) continue;

    for (const slot of slots) {
      // 複数の候補位置・サイズを試して最良マッチを採用
      let bestResult: MatchResult | null = null;
      let bestRegion: { x: number; y: number; w: number; h: number } | null = null;

      // アイコンサイズの候補（推定値の80%~120%）
      const sizes = [iconSize, Math.round(iconSize * 0.8), Math.round(iconSize * 1.2)];
      // Lv.テキストからの相対位置候補
      const xOffsets = [-0.15, 0, 0.15, 0.3];
      const yOffsets = [-1.4, -1.2, -1.0, -0.8];

      for (const sz of sizes) {
        for (const xOff of xOffsets) {
          for (const yOff of yOffsets) {
            const ix = Math.max(0, Math.round(slot.x + sz * xOff));
            const iy = Math.max(0, Math.round(slot.y + sz * yOff));
            const iw = Math.min(sz, img.width - ix);
            const ih = Math.min(sz, img.height - iy);
            if (iw <= 20 || ih <= 20 || iy + ih > slot.y) continue;

            const result = matchMonsterIcon(ctx, ix, iy, iw, ih, slot.element);
            if (result && (!bestResult || result.distance < bestResult.distance)) {
              bestResult = result;
              bestRegion = { x: ix, y: iy, w: iw, h: ih };
            }
          }
        }
      }

      if (bestResult) {
        slot.matchedMonster = bestResult.name;
        slot.matchConfidence = bestResult.confidence;
        slot.matchRegion = bestRegion!;
        console.log(`[matchMonsterIcons] ${tid} Lv.${slot.level} → ${bestResult.name} (dist=${bestResult.distance}, ${bestResult.confidence}) region=${JSON.stringify(bestRegion)}`);
      } else {
        console.log(`[matchMonsterIcons] ${tid} Lv.${slot.level} → no match`);
      }
    }
  }
}
