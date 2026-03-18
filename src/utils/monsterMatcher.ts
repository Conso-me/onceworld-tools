/**
 * モンスターアイコンのテンプレートマッチングエンジン。
 *
 * initMatcher() で静的JSON + IndexedDBカスタムをマージしメモリキャッシュ。
 * matchMonsterIcon() で dHash を計算し全テンプレートと比較。
 * 属性フィルタで候補を絞り込み、誤認識を防ぐ。
 */

import type { Element } from "../types/game";
import { getMonsterByName, isBuiltinMonster } from "../data/monsters";
import { computeDHashFromRegion, hammingDistance, hexToHash } from "./imageHash";
import { getAllTemplates, migrateBuiltinTemplates } from "./monsterTemplateDB";
import staticTemplates from "../../docs/data/monsterTemplates.json";

export type MatchConfidence = "high" | "medium" | "low";

export interface MatchResult {
  name: string;
  confidence: MatchConfidence;
  distance: number;
}

interface CachedTemplate {
  name: string;
  hash: bigint;
  element?: Element;
}

let cache: CachedTemplate[] | null = null;

/**
 * テンプレートキャッシュを初期化（またはリフレッシュ）する。
 * OCR実行前に1回呼ぶ。
 *
 * 1. 静的JSONテンプレートをロード（ビルド時バンドル）
 * 2. IndexedDBからカスタムテンプレートを取得
 * 3. マージ（同名はカスタム優先）
 */
export async function initMatcher(): Promise<number> {
  // 初回マイグレーション: 組み込みモンスターのIndexedDBテンプレートを削除
  await migrateBuiltinTemplates(isBuiltinMonster);

  // 静的テンプレートをMapに投入
  const merged = new Map<string, { name: string; hash: string }>();
  for (const t of staticTemplates as { name: string; hash: string }[]) {
    merged.set(t.name, t);
  }

  // カスタムテンプレートで上書き（同名はカスタム優先）
  const customTemplates = await getAllTemplates();
  for (const t of customTemplates) {
    merged.set(t.name, { name: t.name, hash: t.hash });
  }

  // キャッシュに変換
  cache = Array.from(merged.values()).map((t) => {
    const monster = getMonsterByName(t.name);
    return {
      name: t.name,
      hash: hexToHash(t.hash),
      element: monster?.element,
    };
  });
  return cache.length;
}

/** キャッシュをクリアする */
export function clearMatcherCache(): void {
  cache = null;
}

/** テンプレートが登録済みかどうか */
export function hasTemplates(): boolean {
  return cache !== null && cache.length > 0;
}

/**
 * 画像領域のアイコンをテンプレートと照合する。
 *
 * @param filterElement 属性フィルタ。指定時はその属性のテンプレートのみ比較。
 *                      一致候補がない場合は全テンプレートにフォールバック。
 * @returns 最も近いテンプレートの情報。閾値超過時は null。
 */
export function matchMonsterIcon(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  filterElement?: Element,
): MatchResult | null {
  if (!cache || cache.length === 0) return null;

  // テンプレートは中央70%クロップでハッシュ登録済み。
  // アイコン位置推定のずれに対応するため、クロップ有り・無し両方のハッシュを計算し
  // 各テンプレートとの距離の小さい方を採用する。
  const iconHashFull = computeDHashFromRegion(ctx, x, y, w, h);
  const hm = Math.round(w * 0.15);
  const vm = Math.round(h * 0.15);
  const iconHashCrop = computeDHashFromRegion(ctx, x + hm, y + vm, w - 2 * hm, h - 2 * vm);

  // 属性フィルタで候補を絞り込み
  let candidates = cache;
  if (filterElement) {
    const filtered = cache.filter((t) => t.element === filterElement);
    if (filtered.length > 0) candidates = filtered;
    // フィルタ結果が空の場合は全テンプレートにフォールバック
  }

  let bestDist = Infinity;
  let bestName = "";

  for (const t of candidates) {
    const dist = Math.min(
      hammingDistance(iconHashCrop, t.hash),
      hammingDistance(iconHashFull, t.hash),
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestName = t.name;
    }
  }

  if (bestDist > 15) return null;

  const confidence: MatchConfidence =
    bestDist <= 5 ? "high" :
    bestDist <= 10 ? "medium" :
    "low";

  return { name: bestName, confidence, distance: bestDist };
}
