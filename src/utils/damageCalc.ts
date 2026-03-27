/**
 * OnceWorld ダメージ計算ユーティリティ
 *
 * 物理/魔弾: (ATK or INT) × 1.75 - effectiveDef) × 4 × 属性 × 乱数(0.9-1.1) × クリ(2.5) × 多段
 * 主人公魔法: ((INT + 解析書) × 1.25 × 魔法倍率 - effectiveDef) × 4 × 属性 × 乱数 × クリ（多段なし）
 * 最小ダメ: baseDamage <= 0 → 1〜9
 * 多段: SPD 3000→2, 10000→3, 30000→4, 100000→5
 */

export interface DamageRange {
  min: number;
  max: number;
  avg: number;
  critMin: number;
  critMax: number;
  critAvg: number;
  isNullified: boolean;
}

/**
 * 有効防御値を計算
 * 物理: DEF + floor(M-DEF / 10)
 * 魔法/魔弾: M-DEF + floor(DEF / 10)
 */
export function calcEffectiveDef(
  def: number,
  mdef: number,
  isPhysical: boolean
): number {
  if (isPhysical) {
    return def + Math.floor(mdef / 10);
  }
  return mdef + Math.floor(def / 10);
}

/**
 * 物理/魔弾ダメージ計算（ペット・敵の攻撃）
 * (stat × 1.75 - effectiveDef) × 4 × elementAffinity
 */
export function calcPhysicalDamage(
  atk: number,
  enemyDef: number,
  enemyMdef: number,
  elementAffinity: number = 1.0
): DamageRange {
  const effectiveDef = calcEffectiveDef(enemyDef, enemyMdef, true);
  const base = Math.max(atk * 1.75 - effectiveDef, 0) * 4 * elementAffinity;
  return makeDamageRange(base);
}

/**
 * 主人公魔法ダメージ計算
 * ((INT + analysisBook) × 1.25 × magicMult - effectiveDef) × 4 × elementAffinity × finalMult
 */
export function calcPlayerMagicDamage(
  int: number,
  analysisBook: number,
  magicMult: number,
  enemyDef: number,
  enemyMdef: number,
  elementAffinity: number = 1.0,
  finalMult: number = 1.0
): DamageRange {
  const effectiveDef = calcEffectiveDef(enemyDef, enemyMdef, false);
  const rawAtk = int + analysisBook;
  const base =
    Math.max(rawAtk * 1.25 * magicMult - effectiveDef, 0) *
    4 *
    elementAffinity *
    finalMult;
  return makeDamageRange(base);
}

/**
 * ペット/敵の魔弾ダメージ計算
 * (INT × 1.75 × preMult - effectiveDef) × 4 × elementAffinity × finalMult
 * preMult: 防御計算前に掛ける倍率（魔晶立方体・防御前モード時）
 * finalMult: 最終ダメージに掛ける倍率（魔晶立方体・最終モード時）
 */
export function calcPetMagicDamage(
  int: number,
  enemyDef: number,
  enemyMdef: number,
  elementAffinity: number = 1.0,
  finalMult: number = 1.0,
  preMult: number = 1.0
): DamageRange {
  const effectiveDef = calcEffectiveDef(enemyDef, enemyMdef, false);
  const base = Math.max(int * 1.75 * preMult - effectiveDef, 0) * 4 * elementAffinity * finalMult;
  return makeDamageRange(base);
}

function makeDamageRange(base: number): DamageRange {
  if (base <= 0) {
    return {
      min: 1,
      max: 9,
      avg: 5,
      critMin: 1,
      critMax: 9,
      critAvg: 5,
      isNullified: true,
    };
  }
  const min = Math.floor(base * 0.9);
  const max = Math.floor(base * 1.1);
  const avg = Math.floor(base);
  return {
    min,
    max,
    avg,
    critMin: Math.floor(min * 2.5),
    critMax: Math.floor(max * 2.5),
    critAvg: Math.floor(avg * 2.5),
    isNullified: false,
  };
}

/**
 * 多段攻撃回数を計算
 * 主人公魔法(魔攻)は常に1回
 */
export function calcMultiHitCount(
  spd: number,
  isPlayerMagic: boolean
): number {
  if (isPlayerMagic) return 1;
  if (spd >= 100000) return 5;
  if (spd >= 30000) return 4;
  if (spd >= 10000) return 3;
  if (spd >= 3000) return 2;
  return 1;
}

/**
 * 確殺攻撃回数を計算 (最小ダメージベース)
 */
export function calcHitsToKill(
  enemyHP: number,
  minDamagePerHit: number,
  multiHit: number
): number {
  if (minDamagePerHit <= 0) return Infinity;
  const dmgPerTurn = minDamagePerHit * multiHit;
  return Math.ceil(enemyHP / dmgPerTurn);
}

/**
 * 物理ダメージを1にする最低ATK（1ダメ以上与えるために必要）
 * ATK * 1.75 > effectiveDef → ATK > effectiveDef / 1.75
 */
export function calcMinAtkToHit(
  enemyDef: number,
  enemyMdef: number
): number {
  const effectiveDef = calcEffectiveDef(enemyDef, enemyMdef, true);
  return Math.ceil(effectiveDef / 1.75);
}

/**
 * 魔弾ダメージを1にする最低INT
 * preMult: 防御前モード時は crystalCubeMult を渡す（最終モード時は1）
 */
export function calcMinIntToHitMadan(
  enemyDef: number,
  enemyMdef: number,
  preMult: number = 1.0
): number {
  const effectiveDef = calcEffectiveDef(enemyDef, enemyMdef, false);
  return Math.ceil(effectiveDef / (1.75 * preMult));
}

/**
 * プレイヤー魔法でダメージを与える最低INT
 * (INT + analysisBook) * 1.25 * magicMult > effectiveDef
 */
export function calcMinIntToHit(
  enemyDef: number,
  enemyMdef: number,
  magicMult: number,
  analysisBook: number
): number {
  const effectiveDef = calcEffectiveDef(enemyDef, enemyMdef, false);
  return Math.max(Math.ceil(effectiveDef / (1.25 * magicMult) - analysisBook), 0);
}

/**
 * N回で倒すために必要なATK
 */
export function calcAtkForKill(
  enemyHP: number,
  enemyDef: number,
  enemyMdef: number,
  elementAffinity: number,
  multiHit: number,
  targetTurns: number
): number {
  const effectiveDef = calcEffectiveDef(enemyDef, enemyMdef, true);
  const requiredDmgPerTurn = Math.ceil(enemyHP / targetTurns);
  const requiredBase = requiredDmgPerTurn / 4 / elementAffinity / 0.9 / multiHit;
  return Math.max(Math.ceil((requiredBase + effectiveDef) / 1.75), 0);
}

/**
 * 命中率を計算（物理攻撃のみ）
 * playerLuck < enemyLuck × 0.5 → 1%
 * playerLuck ≥ enemyLuck → 100%
 * その間: 線形補間
 */
export function calcHitRate(playerLuck: number, enemyLuck: number): number {
  if (enemyLuck <= 0) return 100;
  const ratio = playerLuck / enemyLuck;
  if (ratio < 0.5) return 1;
  if (ratio >= 1.0) return 100;
  return Math.round(1 + ((ratio - 0.5) / 0.5) * 99);
}

/**
 * N回で倒すために必要なINT（プレイヤー魔法）
 */
export function calcIntForKill(
  enemyHP: number,
  enemyDef: number,
  enemyMdef: number,
  elementAffinity: number,
  magicMult: number,
  analysisBook: number,
  targetTurns: number,
  finalMult: number = 1.0
): number {
  const effectiveDef = calcEffectiveDef(enemyDef, enemyMdef, false);
  // プレイヤー魔法は多段なし
  const requiredDmgPerTurn = Math.ceil(enemyHP / targetTurns);
  const requiredBase = requiredDmgPerTurn / 4 / elementAffinity / 0.9 / finalMult;
  return Math.max(
    Math.ceil((requiredBase + effectiveDef) / (1.25 * magicMult) - analysisBook),
    0
  );
}
