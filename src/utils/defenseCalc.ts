/**
 * OnceWorld 被ダメ無効ライン計算
 *
 * ダメージ計算式:
 * - 物理: ((敵ATK × 1.75) - (自DEF + 自M_DEF / 10)) × 4 × 属性 × 乱数
 * - 魔法: ((敵INT × 1.75) - (自M_DEF + 自DEF / 10)) × 4 × 属性 × 乱数
 *
 * 被ダメ1〜9ライン条件:
 * - 計算結果が0以下になると、1〜9のランダムダメージになる
 */

export interface DefenseRequirement {
  /** DEFのみで無効化する場合の必要値 */
  defOnly: number;
  /** M_DEFのみで無効化する場合の必要値 */
  mdefOnly: number;
}

export interface DamageCalcResult {
  /** 物理攻撃を無効化するための必要防御力 */
  physical: DefenseRequirement;
  /** 魔法攻撃を無効化するための必要防御力 */
  magical: DefenseRequirement;
}

/**
 * 物理攻撃を無効化するのに必要なDEF/M_DEFを計算
 *
 * 条件: 自DEF + 自M_DEF / 10 >= 敵ATK × 1.75
 */
export function calcPhysicalDefenseRequirement(
  enemyAtk: number
): DefenseRequirement {
  const threshold = enemyAtk * 1.75;

  return {
    // DEFのみで無効化: DEF >= 敵ATK × 1.75
    defOnly: Math.ceil(threshold),
    // M_DEFのみで無効化: M_DEF / 10 >= 敵ATK × 1.75 → M_DEF >= 敵ATK × 17.5
    mdefOnly: Math.ceil(threshold * 10),
  };
}

/**
 * 魔法攻撃を無効化するのに必要なDEF/M_DEFを計算
 *
 * 条件: 自M_DEF + 自DEF / 10 >= 敵INT × 1.75
 */
export function calcMagicalDefenseRequirement(
  enemyInt: number
): DefenseRequirement {
  const threshold = enemyInt * 1.75;

  return {
    // DEFのみで無効化: DEF / 10 >= 敵INT × 1.75 → DEF >= 敵INT × 17.5
    defOnly: Math.ceil(threshold * 10),
    // M_DEFのみで無効化: M_DEF >= 敵INT × 1.75
    mdefOnly: Math.ceil(threshold),
  };
}

/**
 * 現在のDEF/M_DEFで受けるダメージを計算
 */
export function calcDamage(
  attackerStat: number,
  defenderDef: number,
  defenderMdef: number,
  isPhysical: boolean,
  elementMultiplier: number = 1.0
): { min: number; max: number; average: number } {
  let reduction: number;

  if (isPhysical) {
    // 物理: (自DEF + 自M_DEF / 10)
    reduction = defenderDef + defenderMdef / 10;
  } else {
    // 魔法: (自M_DEF + 自DEF / 10)
    reduction = defenderMdef + defenderDef / 10;
  }

  const baseDamage = (attackerStat * 1.75 - reduction) * 4 * elementMultiplier;

  if (baseDamage <= 0) {
    // 被ダメ無効化ライン達成
    return { min: 1, max: 9, average: 5 };
  }

  // 乱数は0.9〜1.1
  const min = Math.floor(baseDamage * 0.9);
  const max = Math.ceil(baseDamage * 1.1);
  const average = Math.round(baseDamage);

  return { min, max, average };
}

/**
 * 指定したDEF/M_DEFの組み合わせで無効化できるか判定
 */
export function canNullifyDamage(
  attackerStat: number,
  defenderDef: number,
  defenderMdef: number,
  isPhysical: boolean
): boolean {
  const threshold = attackerStat * 1.75;

  if (isPhysical) {
    return defenderDef + defenderMdef / 10 >= threshold;
  } else {
    return defenderMdef + defenderDef / 10 >= threshold;
  }
}

/**
 * 現在のDEF/M-DEFを考慮して、あとどれだけ追加すれば無効化できるかを計算
 *
 * 物理: DEF + M-DEF/10 >= threshold → additionalDef: ceil(threshold - DEF - MDEF/10), additionalMdef: ceil((threshold - DEF)*10 - MDEF)
 * 魔法: M-DEF + DEF/10 >= threshold → additionalMdef: ceil(threshold - MDEF - DEF/10), additionalDef: ceil((threshold - MDEF)*10 - DEF)
 */
export function calcAdditionalDefNeeded(
  attackerStat: number,
  currentDef: number,
  currentMdef: number,
  isPhysical: boolean
): { additionalDef: number; additionalMdef: number } {
  const threshold = attackerStat * 1.75;

  if (isPhysical) {
    return {
      additionalDef: Math.max(0, Math.ceil(threshold - currentDef - currentMdef / 10)),
      additionalMdef: Math.max(0, Math.ceil((threshold - currentDef) * 10 - currentMdef)),
    };
  } else {
    return {
      additionalMdef: Math.max(0, Math.ceil(threshold - currentMdef - currentDef / 10)),
      additionalDef: Math.max(0, Math.ceil((threshold - currentMdef) * 10 - currentDef)),
    };
  }
}

/**
 * 敵のATK/INTから必要な防御力をまとめて計算
 */
export function calcDefenseRequirements(
  enemyAtk: number,
  enemyInt: number
): DamageCalcResult {
  return {
    physical: calcPhysicalDefenseRequirement(enemyAtk),
    magical: calcMagicalDefenseRequirement(enemyInt),
  };
}
