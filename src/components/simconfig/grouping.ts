import {
  equipment,
  accessories,
  getPetsByPrimaryStat,
} from "../../data";
import type { PetStatCategory } from "../../data";
import type { EquipmentSlot, AccessoryItem, EquipmentItem } from "../../types/game";

// ── Pet grouping ──────────────────────────────────────────────────────────────

export const PET_STAT_CATEGORY_ORDER: PetStatCategory[] = [
  "体力", "攻撃力", "魔力", "防御力", "魔法防御力", "幸運", "攻撃速度",
  "経験値", "捕獲率", "ドロップ率", "MOV", "HP回復", "その他",
];

// Computed once — pet data is static
export const petStatGroups = getPetsByPrimaryStat();

// ── Equipment grouping ────────────────────────────────────────────────────────

export const EQUIP_SERIES_ORDER = ["皮", "鉄", "プラチナ", "魔導士", "獄炎", "ドラゴン", "暴君", "悪魔", "その他"] as const;
export type EquipSeries = typeof EQUIP_SERIES_ORDER[number];

// Computed once — slot → series → items (items named "なし" are excluded)
export const equipGroups = (() => {
  const slotMap = new Map<EquipmentSlot, Map<EquipSeries, EquipmentItem[]>>();
  for (const item of equipment) {
    if (item.name === "なし") continue;
    if (!slotMap.has(item.slot)) slotMap.set(item.slot, new Map());
    const seriesMap = slotMap.get(item.slot)!;
    const series: EquipSeries = (item.series as EquipSeries) ?? "その他";
    if (!seriesMap.has(series)) seriesMap.set(series, []);
    seriesMap.get(series)!.push(item);
  }
  return slotMap;
})();

export function getEquipStatSummary(item: EquipmentItem): string {
  const stats = [
    { key: "ATK", val: item.atk }, { key: "INT", val: item.int },
    { key: "DEF", val: item.def }, { key: "M-DEF", val: item.mdef },
    { key: "VIT", val: item.vit }, { key: "SPD", val: item.spd },
    { key: "LUCK", val: item.luck },
  ].filter((s) => s.val > 0).sort((a, b) => b.val - a.val);
  return stats.slice(0, 2).map((s) => `${s.key} +${s.val}`).join("・");
}

// ── Accessory grouping ────────────────────────────────────────────────────────

export const ACC_CATEGORY_ORDER = ["体力", "攻撃力", "魔力", "防御力", "魔法防御力", "幸運", "攻撃速度", "経験値", "捕獲率", "ドロップ率", "MOV", "HP回復", "その他"] as const;
export type AccCategory = typeof ACC_CATEGORY_ORDER[number];

export function accEffectCat(type: string): AccCategory {
  const baseType = type.endsWith("%") ? type.slice(0, -1) : type;
  if (baseType.startsWith("VIT"))    return "体力";
  if (baseType.startsWith("ATK"))    return "攻撃力";
  if (baseType.startsWith("INT"))    return "魔力";
  if (baseType.startsWith("M-DEF"))  return "魔法防御力";
  if (baseType.startsWith("DEF"))    return "防御力";
  if (baseType.startsWith("LUCK"))   return "幸運";
  if (baseType.startsWith("SPD"))    return "攻撃速度";
  if (baseType === "経験値")         return "経験値";
  if (baseType === "捕獲率")         return "捕獲率";
  if (baseType === "ドロップ率")     return "ドロップ率";
  if (baseType === "MOV")            return "MOV";
  if (baseType === "HP回復")         return "HP回復";
  return "その他";
}

// Computed once — accessory data is static
// Multi-effect accessories appear in all matching categories
export const accGroups = (() => {
  const map = new Map<AccCategory, AccessoryItem[]>();
  for (const acc of accessories) {
    const cats = new Set<AccCategory>(
      acc.effects.length > 0
        ? acc.effects.map(e => accEffectCat(e.type))
        : ["その他"]
    );
    for (const cat of cats) {
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(acc);
    }
  }
  return map;
})();

const ACC_EFFECT_TYPE_CATEGORY_KEY: Record<string, string> = {
  "経験値": "経験値",
  "捕獲率": "捕獲率",
  "ドロップ率": "ドロップ率",
  "HP回復": "HP回復",
};

export function getAccSummary(acc: AccessoryItem, tFn?: (key: string) => string): string {
  const effects = acc.effects;
  // 全effectが同じ%値 → "ALL+X%" で圧縮
  if (effects.length >= 3 && effects.every(e => e.type.endsWith("%") && e.value === effects[0].value)) {
    return `ALL+${effects[0].value}%`;
  }
  return effects.map((e) => {
    const baseType = e.type.endsWith("%") ? e.type.slice(0, -1) : e.type;
    const catKey = ACC_EFFECT_TYPE_CATEGORY_KEY[baseType];
    const label = tFn && catKey ? tFn(`accCategory.${catKey}`) : baseType;
    return `${label} +${e.value}${e.type.endsWith("%") ? "%" : ""}`;
  }).join("・");
}

export function getAccMaxLvLabel(maxLevel: number, tFn: (key: string) => string): string {
  return maxLevel >= 9999 ? tFn("cannotEnhance") : `Lv~${maxLevel}`;
}

/** アクセサリーの実効最大レベル（9999 以上は上限なし扱いで 1000 に制限） */
export function effectiveAccMax(maxLevel: number): number {
  return Math.min(maxLevel, 1000);
}

/** アクセサリー選択時のデフォルトレベル（最大レベルをそのままセット） */
export function defaultAccLevel(maxLevel: number): number {
  return maxLevel;
}
