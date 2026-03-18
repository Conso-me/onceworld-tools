/**
 * モンスターアイコンのテンプレートマッチングエンジン。
 *
 * initMatcher() で IndexedDB からテンプレートを一括ロードしメモリキャッシュ。
 * matchMonsterIcon() で dHash を計算し全テンプレートと比較。
 * 属性フィルタで候補を絞り込み、誤認識を防ぐ。
 */

import type { Element } from "../types/game";
import { getMonsterByName } from "../data/monsters";
import { computeDHashFromRegion, hammingDistance, hexToHash } from "./imageHash";
import { getAllTemplates, type MonsterTemplate } from "./monsterTemplateDB";

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
 * OCR実行前に1回呼ぶ。テンプレート未登録時は空配列。
 * 各テンプレートにモンスターの属性情報も紐づける。
 */
export async function initMatcher(): Promise<number> {
  const templates = await getAllTemplates();
  cache = templates.map((t) => {
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

  const iconHash = computeDHashFromRegion(ctx, x, y, w, h);

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
    const dist = hammingDistance(iconHash, t.hash);
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
