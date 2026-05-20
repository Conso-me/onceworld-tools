import type { CoreStats, EquipmentItem } from "../types/game";
import { getEquipmentBySlot } from "../data/equipment";
import { calcItemGoldCost } from "./statusCalc";

const STAT_KEYS = ["vit", "spd", "atk", "int", "def", "mdef", "luck"] as const;
const ARMOR_SLOTS = ["頭", "服", "手", "盾", "脚"] as const;
const MAX_ENH = 1100;
const MAX_GOLD_ENH = 1000;
const GOLD_COST_FACTOR = 10_000_000;
const GOLD_STAT_PER_G = 10_000;
const TIER_EXTRA = 10_000_000_000; // G101〜 の段階コスト係数（statusCalc.ts と同値）

export type StatWeights = Record<keyof CoreStats, number>;

export const DEFAULT_WEIGHTS: StatWeights = {
  mdef: 4,
  int: 3,
  atk: 2,
  luck: 2,
  def: 0,
  vit: 0,
  spd: 0,
};

export interface EquipOptResult {
  rank: number;
  weapon: EquipmentItem | null;
  armors: EquipmentItem[];
  goldLevels: number[];
  totalCost: number;
  score: number;
  hasSetBonus: boolean;
  series: string | null;
  stats: CoreStats;
}

function canEnhance(item: EquipmentItem): boolean {
  return item.material !== "強化できない";
}

function val1100(item: EquipmentItem, k: keyof CoreStats): number {
  const base = item[k] ?? 0;
  return canEnhance(item) ? Math.floor(base * (1 + MAX_ENH * 0.1)) : base;
}

function baseStatSum(item: EquipmentItem): number {
  return STAT_KEYS.reduce((s, k) => s + (item[k] ?? 0), 0);
}

function scoreItemAt1100(item: EquipmentItem, weights: StatWeights): number {
  return STAT_KEYS.reduce((s, k) => s + val1100(item, k) * weights[k], 0);
}

function computeGoldEnhStat(item: EquipmentItem, k: keyof CoreStats, g: number): number {
  const v = val1100(item, k);
  if (!canEnhance(item) || g === 0 || v === 0) return v;
  return Math.floor(v * (1 + (25 / 111) * g) + GOLD_STAT_PER_G * g);
}

function slotScore(
  item: EquipmentItem,
  g: number,
  weights: StatWeights,
  setMult: number,
): number {
  return STAT_KEYS.reduce(
    (s, k) => s + computeGoldEnhStat(item, k, g) * weights[k] * setMult,
    0,
  );
}

function computeTotalScore(
  items: EquipmentItem[],
  goldLevels: number[],
  weights: StatWeights,
  setMult: number,
): number {
  return items.reduce((s, item, i) => s + slotScore(item, goldLevels[i], weights, setMult), 0);
}

function computeEquipStats(
  items: EquipmentItem[],
  goldLevels: number[],
): CoreStats {
  const result: CoreStats = { vit: 0, spd: 0, atk: 0, int: 0, def: 0, mdef: 0, luck: 0 };
  for (let i = 0; i < items.length; i++) {
    for (const k of STAT_KEYS) {
      result[k] += computeGoldEnhStat(items[i], k, goldLevels[i]);
    }
  }
  return result;
}

function computeTotalCost(
  items: EquipmentItem[],
  goldLevels: number[],
): number {
  return items.reduce((sum, item, i) => {
    const g = goldLevels[i];
    if (g <= 0 || !canEnhance(item)) return sum;
    return sum + calcItemGoldCost(baseStatSum(item), g);
  }, 0);
}

function optimizeGoldAlloc(
  items: EquipmentItem[],
  weights: StatWeights,
  budget: number,
  maxGoldEnh: number,
): number[] {
  if (budget <= 0) return items.map(() => 0);

  // 各スロットの G1本あたりのスタット上昇量（Gレベルに関わらず一定）
  const gainPerG = items.map((item) => {
    if (!canEnhance(item)) return 0;
    const bSum = baseStatSum(item);
    if (bSum === 0) return 0;
    return STAT_KEYS.reduce((s, k) => {
      const v = val1100(item, k);
      if (v === 0) return s;
      return s + weights[k] * (v * (25 / 111) + GOLD_STAT_PER_G);
    }, 0);
  });

  // 段階ごとのバケット: tier t = G(100t+1)〜G(100t+100) の範囲
  // G101以降はコストが急増するため、tier境界をまたいで最適配分する
  interface Bucket {
    itemIdx: number;
    tier: number;
    eff: number;   // スタット上昇 / Gコスト（このtier内では一定）
    capacity: number; // このtierで追加できる最大G数
    costPerG: number;
  }

  const buckets: Bucket[] = [];
  for (let i = 0; i < items.length; i++) {
    if (gainPerG[i] === 0) continue;
    const bSum = baseStatSum(items[i]);
    for (let t = 0; t * 100 < maxGoldEnh; t++) {
      const tierEnd = Math.min((t + 1) * 100, maxGoldEnh);
      const capacity = tierEnd - t * 100;
      // tier t の G1本あたりコスト = baseSum × 基本係数 + t² × 段階係数
      const costPerG = bSum * GOLD_COST_FACTOR + t * t * TIER_EXTRA;
      buckets.push({ itemIdx: i, tier: t, eff: gainPerG[i] / costPerG, capacity, costPerG });
    }
  }

  // 効率の高い順に配分（同アイテムのtier 0は必ずtier 1より先に来る）
  buckets.sort((a, b) => b.eff - a.eff);

  const levels = items.map(() => 0);
  let remaining = budget;

  for (const { itemIdx: i, tier, capacity, costPerG } of buckets) {
    if (remaining <= 0) break;
    // 前のtierが完了していない場合はスキップ（バジェット不足で途中止まりの場合）
    if (levels[i] < tier * 100) continue;
    const toAdd = Math.min(capacity, Math.floor(remaining / costPerG));
    if (toAdd > 0) {
      levels[i] += toAdd;
      remaining -= toAdd * costPerG;
    }
  }

  return levels;
}

export function optimizeEquipment(
  excluded: Set<string>,
  weights: StatWeights,
  budget: number,
  includeWeapon = true,
  maxGoldEnh: number = MAX_GOLD_ENH,
): EquipOptResult[] {
  const filter = (items: EquipmentItem[]) => items.filter((i) => !excluded.has(i.name));

  const head = filter(getEquipmentBySlot("頭"));
  const body = filter(getEquipmentBySlot("服"));
  const hand = filter(getEquipmentBySlot("手"));
  const shield = filter(getEquipmentBySlot("盾"));
  const foot = filter(getEquipmentBySlot("脚"));

  if (
    head.length === 0 ||
    body.length === 0 ||
    hand.length === 0 ||
    shield.length === 0 ||
    foot.length === 0
  ) {
    return [];
  }

  interface ArmorCombo {
    items: EquipmentItem[];
    score: number;
    hasSetBonus: boolean;
    series: string | null;
  }

  const armorCombos: ArmorCombo[] = [];
  for (const h of head) {
    for (const b of body) {
      for (const ha of hand) {
        for (const sh of shield) {
          for (const f of foot) {
            const items = [h, b, ha, sh, f];
            const series = h.series ?? null;
            const hasSet =
              series !== null && items.every((i) => (i.series ?? null) === series);
            const setMult = hasSet ? 1.1 : 1.0;
            const score = items.reduce(
              (s, item) => s + scoreItemAt1100(item, weights) * setMult,
              0,
            );
            armorCombos.push({ items, score, hasSetBonus: hasSet, series });
          }
        }
      }
    }
  }

  armorCombos.sort((a, b) => b.score - a.score);
  const topArmors = armorCombos.slice(0, 20);

  const results: Omit<EquipOptResult, "rank">[] = [];

  if (includeWeapon) {
    const weapons = filter(getEquipmentBySlot("武器"));
    if (weapons.length === 0) return [];

    const topWeapons = [...weapons]
      .sort((a, b) => scoreItemAt1100(b, weights) - scoreItemAt1100(a, weights))
      .slice(0, 10);

    for (const weapon of topWeapons) {
      for (const armor of topArmors) {
        const allItems = [weapon, ...armor.items];
        const goldLevels = optimizeGoldAlloc(allItems, weights, budget, maxGoldEnh);
        const setMult = armor.hasSetBonus ? 1.1 : 1.0;
        const score = computeTotalScore(allItems, goldLevels, weights, setMult);
        const totalCost = computeTotalCost(allItems, goldLevels);
        const stats = computeEquipStats(allItems, goldLevels);
        results.push({
          weapon,
          armors: armor.items,
          goldLevels,
          totalCost,
          score,
          hasSetBonus: armor.hasSetBonus,
          series: armor.series,
          stats,
        });
      }
    }
  } else {
    for (const armor of topArmors) {
      const goldLevels = optimizeGoldAlloc(armor.items, weights, budget, maxGoldEnh);
      const setMult = armor.hasSetBonus ? 1.1 : 1.0;
      const score = computeTotalScore(armor.items, goldLevels, weights, setMult);
      const totalCost = computeTotalCost(armor.items, goldLevels);
      const stats = computeEquipStats(armor.items, goldLevels);
      results.push({
        weapon: null,
        armors: armor.items,
        goldLevels,
        totalCost,
        score,
        hasSetBonus: armor.hasSetBonus,
        series: armor.series,
        stats,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 10).map((r, i) => ({ ...r, rank: i + 1 }));
}

export { ARMOR_SLOTS };
