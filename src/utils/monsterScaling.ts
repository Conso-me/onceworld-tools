import type { MonsterBase, ScaledMonster } from "../types/game";

function scaleStat(baseStat: number, level: number): number {
  return Math.floor(baseStat * ((level - 1) * 0.1 + 1));
}

export function scaleMonster(base: MonsterBase, level: number): ScaledMonster {
  const scaledVit = scaleStat(base.vit, level);
  const scaledSpd = scaleStat(base.spd, level);
  const scaledAtk = scaleStat(base.atk, level);
  const scaledInt = scaleStat(base.int, level);
  const scaledDef = scaleStat(base.def, level);
  const scaledMdef = scaleStat(base.mdef, level);
  const scaledLuck = scaleStat(base.luck, level);
  const hp = scaledVit * 18 + 100;

  return {
    ...base,
    level,
    scaledVit,
    scaledSpd,
    scaledAtk,
    scaledInt,
    scaledDef,
    scaledMdef,
    scaledLuck,
    hp,
  };
}
