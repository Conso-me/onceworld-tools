import type { CoreStats, EquipmentItem } from "../types/game";
import { getEquipmentBySlot } from "../data/equipment";

const STAT_KEYS = ["vit", "spd", "atk", "int", "def", "mdef", "luck"] as const;
const ARMOR_SLOTS = ["頭", "服", "手", "盾", "脚"] as const;
const MAX_ENH = 1100;
const MAX_GOLD_ENH = 100;
const GOLD_COST_FACTOR = 10_000_000;

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
  weapon: EquipmentItem;
  armors: EquipmentItem[];
  goldLevels: number[];
  totalCost: number;
  score: number;
  hasSetBonus: boolean;
  series: string | null;
  stats: CoreStats;
  mov: number;
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
  if (!canEnhance(item) || k === "spd" || g === 0) return val1100(item, k);
  const v = val1100(item, k);
  return Math.floor(v * (1 + (25 / 111) * g) + GOLD_COST_FACTOR * g);
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
  weapon: EquipmentItem,
  armors: EquipmentItem[],
  goldLevels: number[],
  weights: StatWeights,
  setMult: number,
): number {
  const all = [weapon, ...armors];
  return all.reduce((s, item, i) => s + slotScore(item, goldLevels[i], weights, setMult), 0);
}

function computeEquipStats(
  weapon: EquipmentItem,
  armors: EquipmentItem[],
  goldLevels: number[],
): CoreStats {
  const all = [weapon, ...armors];
  const result: CoreStats = { vit: 0, spd: 0, atk: 0, int: 0, def: 0, mdef: 0, luck: 0 };
  for (let i = 0; i < all.length; i++) {
    for (const k of STAT_KEYS) {
      result[k] += computeGoldEnhStat(all[i], k, goldLevels[i]);
    }
  }
  return result;
}

function computeTotalCost(
  weapon: EquipmentItem,
  armors: EquipmentItem[],
  goldLevels: number[],
): number {
  const all = [weapon, ...armors];
  return all.reduce((sum, item, i) => {
    const g = goldLevels[i];
    if (g <= 0 || !canEnhance(item)) return sum;
    return sum + g * baseStatSum(item) * GOLD_COST_FACTOR;
  }, 0);
}

function optimizeGoldAlloc(
  weapon: EquipmentItem,
  armors: EquipmentItem[],
  weights: StatWeights,
  budget: number,
): number[] {
  const all = [weapon, ...armors];
  if (budget <= 0) return all.map(() => 0);

  const efficiencies = all.map((item) => {
    if (!canEnhance(item)) return 0;
    const bSum = baseStatSum(item);
    if (bSum === 0) return 0;
    const gainPerG = STAT_KEYS.filter((k) => k !== "spd").reduce((s, k) => {
      const v = val1100(item, k);
      return s + weights[k] * (v * (25 / 111) + GOLD_COST_FACTOR);
    }, 0);
    return gainPerG / (bSum * GOLD_COST_FACTOR);
  });

  const order = [0, 1, 2, 3, 4, 5].sort((a, b) => efficiencies[b] - efficiencies[a]);
  let remaining = budget;
  const levels = all.map(() => 0);

  for (const i of order) {
    if (remaining <= 0 || efficiencies[i] === 0) continue;
    const bSum = baseStatSum(all[i]);
    const costPerG = bSum * GOLD_COST_FACTOR;
    const maxAffordable = Math.floor(remaining / costPerG);
    const g = Math.min(MAX_GOLD_ENH, maxAffordable);
    levels[i] = g;
    remaining -= g * costPerG;
  }

  return levels;
}

export function optimizeEquipment(
  excluded: Set<string>,
  weights: StatWeights,
  budget: number,
): EquipOptResult[] {
  const filter = (items: EquipmentItem[]) => items.filter((i) => !excluded.has(i.name));

  const weapons = filter(getEquipmentBySlot("武器"));
  const head = filter(getEquipmentBySlot("頭"));
  const body = filter(getEquipmentBySlot("服"));
  const hand = filter(getEquipmentBySlot("手"));
  const shield = filter(getEquipmentBySlot("盾"));
  const foot = filter(getEquipmentBySlot("脚"));

  if (
    weapons.length === 0 ||
    head.length === 0 ||
    body.length === 0 ||
    hand.length === 0 ||
    shield.length === 0 ||
    foot.length === 0
  ) {
    return [];
  }

  // Step 1: アーマー5スロット全列挙（最大9^5=59,049）
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

  // Step 2: 武器上位10件
  const topWeapons = [...weapons]
    .sort((a, b) => scoreItemAt1100(b, weights) - scoreItemAt1100(a, weights))
    .slice(0, 10);

  // Step 3: 200通りの詳細評価（ゴールド強化込み）
  const results: Omit<EquipOptResult, "rank">[] = [];

  for (const weapon of topWeapons) {
    for (const armor of topArmors) {
      const goldLevels = optimizeGoldAlloc(weapon, armor.items, weights, budget);
      const setMult = armor.hasSetBonus ? 1.1 : 1.0;
      const score = computeTotalScore(weapon, armor.items, goldLevels, weights, setMult);
      const totalCost = computeTotalCost(weapon, armor.items, goldLevels);
      const stats = computeEquipStats(weapon, armor.items, goldLevels);
      const allItems = [weapon, ...armor.items];
      const mov = allItems.reduce((s, item) => s + (item.mov ?? 0), 0);
      results.push({
        weapon,
        armors: armor.items,
        goldLevels,
        totalCost,
        score,
        hasSetBonus: armor.hasSetBonus,
        series: armor.series,
        stats,
        mov,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, 10).map((r, i) => ({ ...r, rank: i + 1 }));
}

export { ARMOR_SLOTS };
