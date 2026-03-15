/**
 * OnceWorld 素材ドロップ計算ユーティリティ
 *
 * 固有ドロップ率:
 *   実効ドロップ率 = min(基礎ドロップ率 × (1 + ボーナス%), 100%)
 *   ノーマルドロップ = 実効ドロップ率
 *   レアドロップ    = 実効ドロップ率 / 10
 *   激レアドロップ  = 実効ドロップ率 / 100
 *
 * ゴールド・しいたけ等は別枠（固定確率、ボーナス対象外）
 */

export const GOLD_DROP_RATE = 0.30; // ゴールドのドロップ確率（固定）

export interface MonsterDropEntry {
  count: number;
  dropRate: number; // 基礎固有ドロップ率 (0–100)
}

/** 実効固有ドロップ率 (0–100) を返す */
export function calcEffectiveDropRate(
  baseRate: number,
  bonusPercent: number
): number {
  return Math.min(baseRate * (1 + bonusPercent / 100), 100);
}

/** 1時間あたりの素材ドロップ期待数 */
export function calcDropsPerHour(
  monsters: MonsterDropEntry[],
  secondsPerRun: number,
  dropBonusPercent: number
): { normal: number; rare: number; superRare: number } {
  if (secondsPerRun <= 0) return { normal: 0, rare: 0, superRare: 0 };
  const runsPerHour = 3600 / secondsPerRun;

  let normal = 0;
  let rare = 0;
  let superRare = 0;

  for (const m of monsters) {
    const rate = calcEffectiveDropRate(m.dropRate, dropBonusPercent) / 100;
    const killsPerHour = m.count * runsPerHour;
    normal += rate * killsPerHour;
    rare += (rate / 10) * killsPerHour;
    superRare += (rate / 100) * killsPerHour;
  }

  return { normal, rare, superRare };
}
