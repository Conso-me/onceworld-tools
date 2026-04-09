import type { PetDamageConfig, PetStatResult, CoreStats, Element, AttackType, MonsterBase } from "../types/game";

const floor = Math.floor;

const STAT_KEYS = ["vit", "spd", "atk", "int", "def", "mdef", "luck"] as const;
type StatKey = typeof STAT_KEYS[number];

export const DEFAULT_PET_DAMAGE_CONFIG: PetDamageConfig = {
  petMonsterName: "",
  petLevel: 1,
  sengiCount: 0,
  hadesHelmetCount: 0,
  mushroomFire: 0,
  mushroomWater: 0,
  mushroomWood: 0,
  mushroomLight: 0,
  mushroomDark: 0,
  hasMushroomHouse: false,
  powderVit: 0,
  powderSpd: 0,
  powderAtk: 0,
  powderInt: 0,
  powderDef: 0,
  powderMdef: 0,
  powderLuck: 0,
};

export function calcPetMaxLevel(hadesHelmetCount: number): number {
  return Math.min(200 + hadesHelmetCount, 1200);
}

export function calcPetLevelBonus(level: number): number {
  if (level <= 200) {
    return (level - 1) * 0.1;
  }
  return (level - 1) * 0.1 + (level - 200);
}

export function calcPetStat(
  baseValue: number,
  powder: number,
  sengiCount: number,
  level: number,
): number {
  const levelBonus = calcPetLevelBonus(level);
  return floor((baseValue + powder) * (1 + (sengiCount + 1) * (sengiCount * 3 + levelBonus)));
}

export function getPetAttackMode(attackType: AttackType): "物理" | "魔法" | "魔弾" {
  return attackType;
}

function getMushroomBonus(element: Element, config: PetDamageConfig): number {
  const count =
    element === "火" ? config.mushroomFire :
    element === "水" ? config.mushroomWater :
    element === "木" ? config.mushroomWood :
    element === "光" ? config.mushroomLight :
    config.mushroomDark;
  return count * (config.hasMushroomHouse ? 100 : 1);
}

function findHighestStatKey(
  bases: Record<StatKey, number>,
  powders: Record<StatKey, number>,
): StatKey {
  const tieBreaker: StatKey[] = ["vit", "spd", "atk", "int", "def", "mdef", "luck"];
  let bestKey: StatKey = tieBreaker[0];
  let bestValue = bases[bestKey] + powders[bestKey];
  for (let i = 1; i < tieBreaker.length; i++) {
    const key = tieBreaker[i];
    const value = bases[key] + powders[key];
    if (value > bestValue) {
      bestValue = value;
      bestKey = key;
    }
  }
  return bestKey;
}

export function calcPetStats(config: PetDamageConfig, monsterBase: MonsterBase): PetStatResult {
  const maxLevel = calcPetMaxLevel(config.hadesHelmetCount);
  const level = Math.min(config.petLevel, maxLevel);

  const bases: Record<StatKey, number> = {
    vit:  monsterBase.vit,
    spd:  monsterBase.spd,
    atk:  monsterBase.atk,
    int:  monsterBase.int,
    def:  monsterBase.def,
    mdef: monsterBase.mdef,
    luck: monsterBase.luck,
  };

  const powders: Record<StatKey, number> = {
    vit:  config.powderVit,
    spd:  config.powderSpd,
    atk:  config.powderAtk,
    int:  config.powderInt,
    def:  config.powderDef,
    mdef: config.powderMdef,
    luck: config.powderLuck,
  };

  const highestKey = findHighestStatKey(bases, powders);
  const mushroomBonus = getMushroomBonus(monsterBase.element, config);

  const final: CoreStats = { vit: 0, spd: 0, atk: 0, int: 0, def: 0, mdef: 0, luck: 0 };
  for (const key of STAT_KEYS) {
    final[key] = calcPetStat(bases[key], powders[key], config.sengiCount, level);
    if (key === highestKey) {
      final[key] += mushroomBonus;
    }
  }

  const hp = final.vit * 18 + 100;
  const element: Element = monsterBase.element;
  const attackMode = getPetAttackMode(monsterBase.attackType);

  return { final, hp, element, attackMode, maxLevel };
}
