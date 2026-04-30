import type { SimConfig, CoreStats, StatBreakdown } from "../types/game";
import { getEquipmentByName } from "../data/equipment";
import { getAccessoryByName, calcAccEffectAtLevel } from "../data/accessories";
import { getPetByName, getActiveSkills } from "../data/petSkills";
import statPointsData from "../../docs/data/stat-points.json";

const STAT_KEYS = ["vit", "spd", "atk", "int", "def", "mdef", "luck"] as const;
const ARMOR_SLOTS = ["equipHead", "equipBody", "equipHand", "equipShield", "equipFoot"] as const;

function zeroStats(): CoreStats {
  return { vit: 0, spd: 0, atk: 0, int: 0, def: 0, mdef: 0, luck: 0 };
}

/** 利用可能な振り分けポイント総量 */
export function getAvailablePoints(cfg: SimConfig): number {
  const entry = statPointsData.levelPoints.find((e) => e.level === cfg.charLevel);
  const base = entry?.points ?? 0;
  const rebirthBonus = cfg.reinCount < 10 ? cfg.tenseisCount * 30 : 0;
  const multiplied = (base + rebirthBonus) * (1 + cfg.reinCount);
  const pinnacleBonus =
    cfg.reinCount >= 10 ? Math.floor(5000 * Math.pow(cfg.reinCount - 9, 1.25)) : 0;
  const cosmoCubeBonus = cfg.reinCount * 10000;
  const reincarnationBonus = cfg.reinCount >= 1 ? 990000 : 0;
  const subtotal = multiplied + pinnacleBonus + cosmoCubeBonus + reincarnationBonus;
  return Math.floor(subtotal * (1 + cfg.johaneCount / 100) * (1 + cfg.johanneAltarCount * 0.002));
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

/** 装備スタット（強化値を乗算済み）
 *  強化式: floor(base * (1 + enhance * 0.1))
 *  "強化できない" アイテムは enhance を無視
 */
function equipmentStats(cfg: SimConfig): CoreStats {
  const slots: [string, number][] = [
    [cfg.equipWeapon, cfg.enhWeapon],
    [cfg.equipHead,   cfg.enhHead],
    [cfg.equipBody,   cfg.enhBody],
    [cfg.equipHand,   cfg.enhHand],
    [cfg.equipShield, cfg.enhShield],
    [cfg.equipFoot,   cfg.enhFoot],
  ];
  const result = zeroStats();
  for (const [name, enh] of slots) {
    if (!name) continue;
    const item = getEquipmentByName(name);
    if (!item) continue;
    const canEnhance = item.material !== "強化できない";
    const factor = canEnhance ? 1 + enh * 0.1 : 1;
    for (const k of STAT_KEYS) {
      result[k] += Math.floor((item[k] ?? 0) * factor);
    }
  }
  return result;
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
