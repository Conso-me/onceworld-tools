/**
 * OnceWorld 金策計算ユーティリティ
 */

export interface MonsterGoldEntry {
  name: string;
  gold: number;
  count: number;
}

/**
 * 1周あたりのゴールド合計
 */
export function calcGoldPerRun(monsters: MonsterGoldEntry[]): number {
  return monsters.reduce((total, m) => total + m.gold * m.count, 0);
}

/**
 * 時給ゴールド
 */
export function calcGoldPerHour(
  goldPerRun: number,
  secondsPerRun: number,
  goldBonusPercent: number = 0
): number {
  if (secondsPerRun <= 0) return 0;
  const runsPerHour = 3600 / secondsPerRun;
  return Math.floor(goldPerRun * runsPerHour * (1 + goldBonusPercent / 100));
}
