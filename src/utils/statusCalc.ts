import type { SimConfig, CoreStats, StatBreakdown } from "../types/game";
import { getEquipmentByName } from "../data/equipment";
import { getAccessoryByName } from "../data/accessories";
import { getPetByName, getActiveSkills } from "../data/petSkills";
import statPointsData from "../../docs/data/stat-points.json";

const STAT_KEYS = ["vit", "spd", "atk", "int", "def", "mdef", "luck"] as const;

function zeroStats(): CoreStats {
  return { vit: 0, spd: 0, atk: 0, int: 0, def: 0, mdef: 0, luck: 0 };
}

/** 利用可能な振り分けポイント総量
 *
 * 式: (basePoints × (1 + reinCount)) + cosmoCubeBonus + pinnacleBonus
 * 参照: formulas.md D10
 *   basePoints × (1 + reinCount) … 天命輪廻で基礎ポイントが乗算される
 *   pinnacleBonus … 天命輪廻10/11/12回時の追加ボーナス（乗算外・加算）
 */
export function getAvailablePoints(cfg: SimConfig): number {
  const entry = statPointsData.levelPoints.find((e) => e.level === cfg.charLevel);
  const base = entry?.points ?? 0;

  // 基礎ポイントに (1 + 天命輪廻回数) を乗算
  const multiplied = base * (1 + cfg.reinCount);

  // 天命輪廻10/11/12 時の頂点ボーナス（乗算後に加算）
  const pinnacleBonus =
    statPointsData.extremeReincarnation.find((e) => e.count === cfg.reinCount)?.bonus ?? 0;

  // コスモキューブ（天命輪廻回数 × 10,000）
  const cosmoCubeBonus = cfg.hasCosmoCube ? cfg.reinCount * 10000 : 0;

  const subtotal = multiplied + pinnacleBonus + cosmoCubeBonus;
  return Math.floor(subtotal * (1 + cfg.johaneCount / 100));
}

/** 1ステータスへの割り振り上限（基底10,000） */
export function getPerStatLimit(cfg: SimConfig): number {
  return 10000
    + cfg.kinikiBookCount * 80
    + cfg.sageItemCount * 10
    + (cfg.hasChoyoContract ? 900000 : 0);
}

export function calcAllocatedPoints(cfg: SimConfig): number {
  return (
    cfg.allocVit + cfg.allocSpd + cfg.allocAtk + cfg.allocInt +
    cfg.allocDef + cfg.allocMdef + cfg.allocLuck
  );
}

function allocStats(cfg: SimConfig): CoreStats {
  return {
    vit: cfg.allocVit, spd: cfg.allocSpd, atk: cfg.allocAtk, int: cfg.allocInt,
    def: cfg.allocDef, mdef: cfg.allocMdef, luck: cfg.allocLuck,
  };
}

function equipmentStats(cfg: SimConfig): CoreStats {
  const slots = [cfg.equipWeapon, cfg.equipHead, cfg.equipBody, cfg.equipHand, cfg.equipShield, cfg.equipFoot];
  const result = zeroStats();
  for (const name of slots) {
    if (!name) continue;
    const item = getEquipmentByName(name);
    if (!item) continue;
    for (const k of STAT_KEYS) result[k] += item[k] ?? 0;
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

// Stat key lookup maps
const FLAT_MAP: Record<string, keyof CoreStats | null> = {
  VIT: "vit", SPD: "spd", ATK: "atk", INT: "int",
  DEF: "def", "M-DEF": "mdef", LUCK: "luck",
};
const PCT_MAP: Record<string, keyof CoreStats | null> = {
  "VIT%": "vit", "SPD%": "spd", "ATK%": "atk", "INT%": "int",
  "DEF%": "def", "M-DEF%": "mdef", "LUCK%": "luck",
};
const FINAL_PCT_MAP: Record<string, keyof CoreStats | null> = {
  "最終VIT%": "vit", "最終SPD%": "spd", "最終ATK%": "atk", "最終INT%": "int",
  "最終DEF%": "def", "最終M-DEF%": "mdef", "最終LUCK%": "luck",
};

function accFlatStats(cfg: SimConfig): CoreStats {
  const result = zeroStats();
  for (const accName of [cfg.acc1, cfg.acc2]) {
    if (!accName) continue;
    const acc = getAccessoryByName(accName);
    if (!acc) continue;
    for (const eff of acc.effects) {
      const key = FLAT_MAP[eff.type];
      if (key) result[key] += eff.value;
    }
  }
  return result;
}

function accPctBonus(cfg: SimConfig): CoreStats {
  const result = zeroStats();
  for (const accName of [cfg.acc1, cfg.acc2]) {
    if (!accName) continue;
    const acc = getAccessoryByName(accName);
    if (!acc) continue;
    for (const eff of acc.effects) {
      const key = PCT_MAP[eff.type];
      if (key) result[key] += eff.value;
    }
  }
  return result;
}

function petFlatStats(cfg: SimConfig): CoreStats {
  const result = zeroStats();
  if (!cfg.petName || cfg.petLevel === 0) return result;
  const pet = getPetByName(cfg.petName);
  if (!pet) return result;
  for (const skill of getActiveSkills(pet, cfg.petLevel)) {
    const key = FLAT_MAP[skill.type];
    if (key) result[key] += skill.value;
  }
  return result;
}

function petPctBonus(cfg: SimConfig): CoreStats {
  const result = zeroStats();
  if (!cfg.petName || cfg.petLevel === 0) return result;
  const pet = getPetByName(cfg.petName);
  if (!pet) return result;
  for (const skill of getActiveSkills(pet, cfg.petLevel)) {
    const key = PCT_MAP[skill.type];
    if (key) result[key] += skill.value;
  }
  return result;
}

function petFinalPctBonus(cfg: SimConfig): CoreStats {
  const result = zeroStats();
  if (!cfg.petName || cfg.petLevel === 0) return result;
  const pet = getPetByName(cfg.petName);
  if (!pet) return result;
  for (const skill of getActiveSkills(pet, cfg.petLevel)) {
    const key = FINAL_PCT_MAP[skill.type];
    if (key) result[key] += skill.value;
  }
  return result;
}

export function calcStatus(cfg: SimConfig): StatBreakdown {
  const alloc = allocStats(cfg);
  const equip = equipmentStats(cfg);
  const protein = proteinStats(cfg);
  const accFlat = accFlatStats(cfg);
  const petFlat = petFlatStats(cfg);

  const prePct = zeroStats();
  for (const k of STAT_KEYS) {
    prePct[k] = alloc[k] + equip[k] + protein[k] + accFlat[k] + petFlat[k];
  }

  const accPct = accPctBonus(cfg);
  const petPct = petPctBonus(cfg);
  const pctBonus = zeroStats();
  for (const k of STAT_KEYS) pctBonus[k] = accPct[k] + petPct[k];

  const afterPct = zeroStats();
  for (const k of STAT_KEYS) {
    afterPct[k] = Math.floor(prePct[k] * (1 + pctBonus[k] / 100));
  }

  const finalPctBonus = petFinalPctBonus(cfg);
  const final = zeroStats();
  for (const k of STAT_KEYS) {
    final[k] = Math.floor(afterPct[k] * (1 + finalPctBonus[k] / 100));
  }

  const hp = Math.floor((final.vit * 18 + 100) * (1 + cfg.kinikiLiquidCount / 100));

  return { alloc, equipment: equip, protein, accFlat, petFlat, prePct, pctBonus, afterPct, finalPctBonus, final, hp };
}
