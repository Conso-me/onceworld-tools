#!/usr/bin/env tsx
/**
 * fill-missing-en.ts
 *
 * 新アプデ後にゲームデータへ英語訳が抜けていないか検知し、
 * Claude API で機械翻訳してファイルを更新、GitHub Issue を作成する。
 *
 * 使い方:
 *   npm run fill-en              # 通常実行（ファイル更新 + Issue 作成）
 *   npm run fill-en -- --dry-run # 確認のみ（ファイル変更・Issue 作成なし）
 *
 * 必要な環境変数:
 *   ANTHROPIC_API_KEY  (省略時はプレースホルダーで代替)
 *   ※ GitHub Issue 作成は gh CLI の認証を使用
 */

import * as fs from "fs/promises";
import { writeFileSync, unlinkSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const ENEMY_PRESETS_PATH = path.join(ROOT, "src/data/enemyPresets.ts");
const ACCESSORIES_PATH = path.join(ROOT, "docs/data/accessories.json");
const WIKI_URL = "https://wikiwiki.jp/onceworld/";

const DRY_RUN = process.argv.includes("--dry-run");

// ── 検知 ──────────────────────────────────────────────────────────────────────

interface MissingItem {
  source: "enemyPresets" | "accessories";
  field: "mapLabelEn" | "labelEn" | "locationEn" | "nameEn";
  japanese: string;
}

function detectMissingInEnemyPresets(source: string): MissingItem[] {
  const missing: MissingItem[] = [];
  const seen = new Set<string>();

  function add(field: MissingItem["field"], japanese: string) {
    const key = `${field}:${japanese}`;
    if (!seen.has(key)) {
      seen.add(key);
      missing.push({ source: "enemyPresets", field, japanese });
    }
  }

  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // mapLabel 行に mapLabelEn がない
    const mapLabelMatch = line.match(/^\s+mapLabel: "([^"]+)",\s*$/);
    if (mapLabelMatch) {
      const next = lines[i + 1] ?? "";
      if (!next.includes("mapLabelEn:")) {
        add("mapLabelEn", mapLabelMatch[1]);
      }
    }

    // label 行に labelEn がない（mapLabel は除外済み）
    const labelMatch = line.match(/^\s+label: "([^"]+)",\s*$/);
    if (labelMatch) {
      const next = lines[i + 1] ?? "";
      if (!next.includes("labelEn:")) {
        add("labelEn", labelMatch[1]);
      }
    }
  }

  // location に locationEn がないプリセット行
  const locationRegex = /location: "([^"]+)"(?!\s*,\s*locationEn)/g;
  let m: RegExpExecArray | null;
  while ((m = locationRegex.exec(source)) !== null) {
    add("locationEn", m[1]);
  }

  return missing;
}

interface AccessoryEntry {
  name: string;
  nameEn?: string;
  [key: string]: unknown;
}

async function detectMissingInAccessories(): Promise<{
  data: AccessoryEntry[];
  missing: MissingItem[];
}> {
  const raw = await fs.readFile(ACCESSORIES_PATH, "utf-8");
  const data: AccessoryEntry[] = JSON.parse(raw);
  const missing: MissingItem[] = [];

  for (const item of data) {
    if (!item.nameEn?.trim()) {
      missing.push({ source: "accessories", field: "nameEn", japanese: item.name });
    }
  }

  return { data, missing };
}

// ── 翻訳 ──────────────────────────────────────────────────────────────────────

async function translateBatch(texts: string[]): Promise<Map<string, string>> {
  if (texts.length === 0) return new Map();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  ANTHROPIC_API_KEY が未設定。プレースホルダーで代替します。");
    return new Map(texts.map((t) => [t, `[要翻訳] ${t}`]));
  }

  const unique = [...new Set(texts)];
  const prompt = `OnceWorld（日本語モバイルゲーム）のテキストを日本語→英語に翻訳してください。
マップ名・エリア名・出現位置などを自然な英語にしてください。

位置サフィックスは統一した訳語を使用:
- 入口付近 → Near Entrance
- 出口付近 → Near Exit
- 中央に複数 → Multiple in Center
- レア出現 → Rare Spawn
- ボス → Boss
- ボス取り巻き → Boss Escorts
- ボス部屋 → Boss Room
- 左右の小部屋 → Side Rooms
- 海の中 → In the Sea
- レアモンスター → Rare Monster
- 層 → Floor（例: "16層" → "Floor 16"）
- 禁域 → Forbidden

JSONオブジェクトのみを返してください。説明不要。
形式: {"日本語テキスト": "English translation", ...}

翻訳対象:
${unique.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

  const resp = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    }
  );

  const content: string = resp.data.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]+\}/);
  if (!jsonMatch) throw new Error(`翻訳レスポンスの解析失敗:\n${content}`);

  return new Map(Object.entries(JSON.parse(jsonMatch[0]) as Record<string, string>));
}

// ── ファイル更新 ───────────────────────────────────────────────────────────────

function applyToEnemyPresetsSource(
  source: string,
  translations: Map<string, string>
): string {
  const lines = source.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    result.push(line);

    // mapLabelEn の挿入
    const mapLabelMatch = line.match(/^(\s+)(mapLabel: "([^"]+)",)\s*$/);
    if (mapLabelMatch) {
      const next = lines[i + 1] ?? "";
      if (!next.includes("mapLabelEn:")) {
        const [, indent, , japanese] = mapLabelMatch;
        const en = translations.get(japanese) ?? `[要翻訳] ${japanese}`;
        result.push(`${indent}mapLabelEn: "${en}",`);
      }
    }

    // labelEn の挿入
    const labelMatch = line.match(/^(\s+)(label: "([^"]+)",)\s*$/);
    if (labelMatch) {
      const next = lines[i + 1] ?? "";
      if (!next.includes("labelEn:")) {
        const [, indent, , japanese] = labelMatch;
        const en = translations.get(japanese) ?? `[要翻訳] ${japanese}`;
        result.push(`${indent}labelEn: "${en}",`);
      }
    }
  }

  // locationEn の挿入（行ベースで処理済みの文字列に対してregex適用）
  let output = result.join("\n");
  output = output.replace(
    /(location: "([^"]+)")(?!\s*,\s*locationEn)/g,
    (_match, locationPart: string, japanese: string) => {
      const en = translations.get(japanese) ?? `[要翻訳] ${japanese}`;
      return `${locationPart}, locationEn: "${en}"`;
    }
  );

  return output;
}

function applyToAccessories(
  data: AccessoryEntry[],
  translations: Map<string, string>
): AccessoryEntry[] {
  return data.map((item) => {
    if (!item.nameEn?.trim()) {
      return {
        ...item,
        nameEn: translations.get(item.name) ?? `[要翻訳] ${item.name}`,
      };
    }
    return item;
  });
}

// ── GitHub Issue 作成 ─────────────────────────────────────────────────────────

function buildIssueBody(
  items: MissingItem[],
  translations: Map<string, string>
): string {
  const date = new Date().toISOString().slice(0, 10);

  const bySource = new Map<MissingItem["source"], MissingItem[]>();
  for (const item of items) {
    const list = bySource.get(item.source) ?? [];
    list.push(item);
    bySource.set(item.source, list);
  }

  const sections: string[] = [];

  for (const [src, srcItems] of bySource) {
    const label = src === "enemyPresets" ? "モンスタープリセット (`src/data/enemyPresets.ts`)" : "アクセサリー (`docs/data/accessories.json`)";
    const rows = srcItems.map((i) => {
      const en = translations.get(i.japanese) ?? "(翻訳失敗)";
      return `| \`${i.field}\` | ${i.japanese} | ${en} |`;
    });

    sections.push(
      `### ${label}\n\n| フィールド | 日本語 | 機械翻訳 |\n|---|---|---|\n${rows.join("\n")}`
    );
  }

  return `## 機械翻訳レビュー依頼

**作成日**: ${date}
**対象**: 新アプデで追加されたテキストの英語訳（機械翻訳済み）

以下の項目について、[Wiki](${WIKI_URL}) を参照して翻訳の正確さを確認してください。

${sections.join("\n\n")}

## 対応方法

1. Wiki で正式名称・説明文を確認
2. 機械翻訳と異なる場合は該当ファイルを直接修正
3. 確認完了したらこの Issue をクローズ

> ⚠️ \`[要翻訳]\` プレフィックスが付いている場合、翻訳 API が使われなかった項目です。手動で翻訳してください。
`;
}

function createGithubIssue(title: string, body: string): void {
  // i18n-review ラベルが存在しない場合は作成
  try {
    execSync(
      `gh label create "i18n-review" --description "機械翻訳のWiki確認待ち" --color "0052CC" 2>/dev/null || true`,
      { stdio: "pipe" }
    );
  } catch {
    // ignore
  }

  const bodyFile = path.join(ROOT, ".tmp-issue-body.md");
  writeFileSync(bodyFile, body);

  try {
    const url = execSync(
      `gh issue create --title "${title}" --body-file "${bodyFile}" --label "i18n-review"`,
      { encoding: "utf-8" }
    ).trim();
    console.log(`✅ GitHub Issue 作成: ${url}`);
  } finally {
    unlinkSync(bodyFile);
  }
}

// ── メイン ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}英語訳チェック開始...\n`);

  // 1. 検知
  const presetsSource = await fs.readFile(ENEMY_PRESETS_PATH, "utf-8");
  const presetsMissing = detectMissingInEnemyPresets(presetsSource);
  const { data: accData, missing: accMissing } = await detectMissingInAccessories();

  const allMissing = [...presetsMissing, ...accMissing];

  if (allMissing.length === 0) {
    console.log("✅ 英語訳の抜けなし。作業不要です。");
    return;
  }

  console.log(`⚠️  未翻訳: ${allMissing.length} 件`);
  for (const item of allMissing) {
    console.log(`   [${item.source}] ${item.field}: "${item.japanese}"`);
  }
  console.log();

  if (DRY_RUN) {
    console.log("[DRY RUN] ファイル変更・Issue 作成をスキップ。");
    return;
  }

  // 2. 翻訳
  console.log("🤖 Claude API で機械翻訳中...");
  const translations = await translateBatch(allMissing.map((i) => i.japanese));
  console.log(`   ${translations.size} 件翻訳完了\n`);

  // 3. ファイル更新
  if (presetsMissing.length > 0) {
    console.log("📝 enemyPresets.ts を更新中...");
    const updated = applyToEnemyPresetsSource(presetsSource, translations);
    await fs.writeFile(ENEMY_PRESETS_PATH, updated, "utf-8");
    console.log("   完了\n");
  }

  if (accMissing.length > 0) {
    console.log("📝 accessories.json を更新中...");
    const updated = applyToAccessories(accData, translations);
    await fs.writeFile(ACCESSORIES_PATH, JSON.stringify(updated, null, 2) + "\n", "utf-8");
    console.log("   完了\n");
  }

  // 4. GitHub Issue 作成
  console.log("📌 GitHub Issue を作成中...");
  const date = new Date().toISOString().slice(0, 10);
  const title = `[i18n] 機械翻訳レビュー待ち (${date}) — ${allMissing.length}件`;
  const body = buildIssueBody(allMissing, translations);
  createGithubIssue(title, body);
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
