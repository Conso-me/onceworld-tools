import type { SimConfig, CoreStats, StatBreakdown } from "../types/game";
import { getEquipmentByName } from "../data/equipment";
import { getAccessoryByName, calcAccEffectAtLevel } from "../data/accessories";
import { getPetByName, getActiveSkills } from "../data/petSkills";
import statPointsData from "../../docs/data/stat-points.json";

const STAT_KEYS = ["vit", "spd", "atk", "int", "def", "mdef", "luck"] as const;
const ARMOR_SLOTS = ["equipHead", "equipBody", "equipHand", "equipShield", "equipFoot"] as const;

const GOLD_COST_FACTOR = 10_000_000;
const TIER_EXTRA = 10_000_000_000;

function tierSurcharge(g: number): number {
  const fullTiers = Math.floor(g / 100);
  const remainder = g % 100;
  let total = 0;
  // 段階コスト/step: n² + n - 1 倍 × TIER_EXTRA (n=1:100億, n=2:500億, ...)
  for (let n = 1; n < fullTiers; n++) total += 100 * (n * n + n - 1) * TIER_EXTRA;
  if (fullTiers > 0) total += remainder * (fullTiers * fullTiers + fullTiers - 1) * TIER_EXTRA;
  return total;
}

/** 1装備スロットの金強化コスト（段階コスト込み） */
export function calcItemGoldCost(baseStatSum: number, g: number): number {
  if (g <= 0) return 0;
  return g * baseStatSum * GOLD_COST_FACTOR + tierSurcharge(g);
}

function zeroStats(): CoreStats {
  return { vit: 0, spd: 0, atk: 0, int: 0, def: 0, mdef: 0, luck: 0 };
}

/** 利用可能な振り分けポイント総量 */
export function getAvailablePoints(cfg: SimConfig): number {
  const entry = statPointsData.levelPoints.find((e) => e.level === cfg.charLevel);
  const base = entry?.points ?? 0;
  // v2.2.0: 天命輪廻1回以上から転生不要（reinCount=0 のみ転生ボーナス適用）
  const rebirthBonus = cfg.reinCount === 0 ? cfg.tenseisCount * 30 : 0;
  const multiplied = (base + rebirthBonus) * (1 + cfg.reinCount);
  // 旧式: 0-9 → 300×reinCount² / 10+ → 30000+floor(5000×(reinCount-9)^1.25)
  // v2.2.0: 0-9も+10以降と同じ式に統一（天命輪廻ごとの基礎振り分けポイント変更）
  const pinnacleBonus = cfg.reinCount >= 1
    ? 30000 + Math.floor(5000 * Math.pow(Math.max(0, cfg.reinCount - 9), 1.25))
    : 0;
  const cosmoCubeBonus = cfg.hasCosmoCube ? cfg.reinCount * 10000 : 0;
  const subtotal = multiplied + pinnacleBonus + cosmoCubeBonus;
  const withJohane = Math.floor(subtotal * (1 + cfg.johaneCount / 100) * (1 + cfg.johanneAltarCount * 0.002));
  return withJohane + cfg.statusTenshouCount * 10000;
}

/** 1ステータスへの割り振り上限（天命輪廻ベース） */
export function getPerStatLimit(cfg: SimConfig): number {
  return Math.max(1, cfg.reinCount - 9) * 1_000_000;
}

export function calcAllocatedPoints(cfg: SimConfig): number {
  return cfg.allocVit + cfg.allocSpd + cfg.allocAtk + cfg.allocInt
    + cfg.allocDef + cfg.allocMdef + cfg.allocLuck;
}

function allocStats(cfg: SimConfig): CoreStats {
  return {
    vit: cfg.allocVit, spd: cfg.allocSpd, atk: cfg.allocAtk, int: cfg.allocInt,
    def: cfg.allocDef, mdef: cfg.allocMdef, luck: cfg.allocLuck,
  };
}

/** セット効果検出：頭/服/手/盾/脚 が同一非nullシリーズで揃っているか */
function detectSetBonus(cfg: SimConfig): { active: boolean; series: string | null } {
  const names = ARMOR_SLOTS.map((k) => cfg[k] as string);
  if (names.some((n) => !n)) return { active: false, series: null };
  const seriesList = names.map((n) => getEquipmentByName(n)?.series ?? null);
  if (seriesList.some((s) => !s)) return { active: false, series: null };
  const first = seriesList[0]!;
  return seriesList.every((s) => s === first)
    ? { active: true, series: first }
    : { active: false, series: null };
}

/** 装備スタット（強化値・金強化値を適用済み）
 *  通常強化式: floor(base * (1 + enhance * 0.1))
 *  金強化式:   floor(val1100 * (1 + (25/111) * goldEnh) + 10000 * goldEnh)  ※val1100>0のみ
 *  "強化できない" アイテムは enhance / goldEnh を無視
 */
function equipmentStats(cfg: SimConfig): CoreStats {
  const slots: [string, number, number][] = [
    [cfg.equipWeapon, cfg.enhWeapon, cfg.goldEnhWeapon],
    [cfg.equipHead,   cfg.enhHead,   cfg.goldEnhHead],
    [cfg.equipBody,   cfg.enhBody,   cfg.goldEnhBody],
    [cfg.equipHand,   cfg.enhHand,   cfg.goldEnhHand],
    [cfg.equipShield, cfg.enhShield, cfg.goldEnhShield],
    [cfg.equipFoot,   cfg.enhFoot,   cfg.goldEnhFoot],
  ];
  const result = zeroStats();
  for (const [name, enh, goldEnh] of slots) {
    if (!name) continue;
    const item = getEquipmentByName(name);
    if (!item) continue;
    const canEnhance = item.material !== "強化できない";
    const factor = canEnhance ? 1 + enh * 0.1 : 1;
    for (const k of STAT_KEYS) {
      const base = item[k] ?? 0;
      const val1100 = Math.floor(base * factor);
      const gN = (canEnhance && goldEnh > 0 && val1100 > 0) ? goldEnh : 0;
      result[k] += gN > 0
        ? Math.floor(val1100 * (1 + (25 / 111) * gN) + 10000 * gN)
        : val1100;
    }
  }
  return result;
}

/**
 * 金強化に必要なゴールド総量（段階コスト込み）
 * 各スロット: calcItemGoldCost(初期ステ合計, goldEnh)
 */
export function calcGoldEnhCost(cfg: SimConfig): number {
  const slots: [string, number][] = [
    [cfg.equipWeapon, cfg.goldEnhWeapon],
    [cfg.equipHead,   cfg.goldEnhHead],
    [cfg.equipBody,   cfg.goldEnhBody],
    [cfg.equipHand,   cfg.goldEnhHand],
    [cfg.equipShield, cfg.goldEnhShield],
    [cfg.equipFoot,   cfg.goldEnhFoot],
  ];
  let total = 0;
  for (const [name, goldEnh] of slots) {
    if (!name || goldEnh <= 0) continue;
    const item = getEquipmentByName(name);
    if (!item || item.material === "強化できない") continue;
    const baseSum = STAT_KEYS.reduce((s, k) => s + (item[k] ?? 0), 0);
    total += calcItemGoldCost(baseSum, goldEnh);
  }
  return total;
}

function proteinStats(cfg: SimConfig): CoreStats {
  const mult = 1 + cfg.pShakerCount / 100;
  return {
    vit:  Math.floor(cfg.proteinVit  * mult),
    spd:  Math.floor(cfg.proteinSpd  * mult),
    atk:  Math.floor(cfg.proteinAtk  * mult),
    int:  Math.floor(cfg.proteinInt  * mult),
    def:  Math.floor(cfg.proteinDef  * mult),
    mdef: Math.floor(cfg.proteinMdef * mult),
    luck: Math.floor(cfg.proteinLuck * mult),
  };
}

// Effect type classification
const FLAT_TYPES = new Set(["VIT","SPD","ATK","INT","DEF","M-DEF","MDEF","LUCK"]);
const FLAT_MAP: Record<string, keyof CoreStats> = {
  VIT:"vit", SPD:"spd", ATK:"atk", INT:"int", DEF:"def", "M-DEF":"mdef", LUCK:"luck",
};
const PCT_MAP: Record<string, keyof CoreStats> = {
  "VIT%":"vit","SPD%":"spd","ATK%":"atk","INT%":"int","DEF%":"def","M-DEF%":"mdef","LUCK%":"luck",
};
const FINAL_PCT_MAP: Record<string, keyof CoreStats> = {
  "最終VIT%":"vit","最終SPD%":"spd","最終ATK%":"atk","最終INT%":"int",
  "最終DEF%":"def","最終M-DEF%":"mdef","最終LUCK%":"luck",
};

/** アクセサリーフラット補正（4枠・レベルスケール済み） */
function accFlatStats(cfg: SimConfig): CoreStats {
  const result = zeroStats();
  const slots: [string, number][] = [
    [cfg.acc1, cfg.acc1Level], [cfg.acc2, cfg.acc2Level],
    [cfg.acc3, cfg.acc3Level], [cfg.acc4, cfg.acc4Level],
  ];
  for (const [name, level] of slots) {
    if (!name) continue;
    const acc = getAccessoryByName(name);
    if (!acc) continue;
    for (const eff of acc.effects) {
      const key = FLAT_MAP[eff.type];
      if (!key) continue;
      result[key] += calcAccEffectAtLevel(eff.value, eff.scalePercent, true, level);
    }
  }
  return result;
}

/** アクセサリー%補正（4枠・レベルスケール済み） */
function accPctBonus(cfg: SimConfig): CoreStats {
  const result = zeroStats();
  const slots: [string, number][] = [
    [cfg.acc1, cfg.acc1Level], [cfg.acc2, cfg.acc2Level],
    [cfg.acc3, cfg.acc3Level], [cfg.acc4, cfg.acc4Level],
  ];
  for (const [name, level] of slots) {
    if (!name) continue;
    const acc = getAccessoryByName(name);
    if (!acc) continue;
    for (const eff of acc.effects) {
      const key = PCT_MAP[eff.type];
      if (!key) continue;
      result[key] += calcAccEffectAtLevel(eff.value, eff.scalePercent, false, level);
    }
  }
  return result;
}

function petFlatFor(petName: string, petLevel: number): CoreStats {
  const result = zeroStats();
  if (!petName || petLevel === 0) return result;
  const pet = getPetByName(petName);
  if (!pet) return result;
  for (const skill of getActiveSkills(pet, petLevel)) {
    if (skill.value === null) continue;
    const key = FLAT_MAP[skill.type];
    if (key) result[key] += skill.value;
  }
  return result;
}

function petPctFor(petName: string, petLevel: number): CoreStats {
  const result = zeroStats();
  if (!petName || petLevel === 0) return result;
  const pet = getPetByName(petName);
  if (!pet) return result;
  for (const skill of getActiveSkills(pet, petLevel)) {
    if (skill.value === null) continue;
    const key = PCT_MAP[skill.type];
    if (key) result[key] += skill.value;
  }
  return result;
}

function petFinalPctFor(petName: string, petLevel: number): CoreStats {
  const result = zeroStats();
  if (!petName || petLevel === 0) return result;
  const pet = getPetByName(petName);
  if (!pet) return result;
  for (const skill of getActiveSkills(pet, petLevel)) {
    if (skill.value === null) continue;
    const key = FINAL_PCT_MAP[skill.type];
    if (key) result[key] += skill.value;
  }
  return result;
}

function sumStats(...statsList: CoreStats[]): CoreStats {
  const result = zeroStats();
  for (const s of statsList) {
    for (const k of STAT_KEYS) result[k] += s[k];
  }
  return result;
}

export function calcStatus(cfg: SimConfig): StatBreakdown {
  const alloc = allocStats(cfg);
  const equip = equipmentStats(cfg);
  const protein = proteinStats(cfg);
  const accFlat = accFlatStats(cfg);

  const petFlat = sumStats(
    petFlatFor(cfg.petName, cfg.petLevel),
    petFlatFor(cfg.pet2Name, cfg.pet2Level),
    petFlatFor(cfg.pet3Name, cfg.pet3Level),
  );
  const petPct = sumStats(
    petPctFor(cfg.petName, cfg.petLevel),
    petPctFor(cfg.pet2Name, cfg.pet2Level),
    petPctFor(cfg.pet3Name, cfg.pet3Level),
  );
  const finalPctBonus = sumStats(
    petFinalPctFor(cfg.petName, cfg.petLevel),
    petFinalPctFor(cfg.pet2Name, cfg.pet2Level),
    petFinalPctFor(cfg.pet3Name, cfg.pet3Level),
  );

  // セット効果：alloc + equip + protein に ×1.10
  const { active: setBonus, series: setBonusSeries } = detectSetBonus(cfg);
  const setMult = setBonus ? 1.1 : 1.0;

  const accPct = accPctBonus(cfg);
  const pctBonus = zeroStats();
  for (const k of STAT_KEYS) pctBonus[k] = accPct[k] + petPct[k];

  const prePct = zeroStats();
  for (const k of STAT_KEYS) {
    prePct[k] = Math.floor((alloc[k] + equip[k] + protein[k]) * setMult) + accFlat[k] + petFlat[k];
  }

  const afterPct = zeroStats();
  for (const k of STAT_KEYS) {
    afterPct[k] = Math.floor(prePct[k] * (1 + pctBonus[k] / 100));
  }

  const final = zeroStats();
  for (const k of STAT_KEYS) {
    final[k] = Math.floor(afterPct[k] * (1 + finalPctBonus[k] / 100));
  }

  const hp = Math.floor((final.vit * 18 + 100) * (1 + cfg.kinikiLiquidCount / 100));

  return {
    alloc, equipment: equip, protein, accFlat, petFlat,
    prePct, pctBonus, afterPct, finalPctBonus, final, hp,
    setBonus, setBonusSeries,
  };
}

export { FLAT_TYPES };
