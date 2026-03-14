/**
 * OnceWorld 経験値計算ユーティリティ
 *
 * EXPスケーリング: max(floor(level^1.1 * 0.2), 1) * baseExp
 * リポップ: 3分革命 = 30秒, 召喚の書 = 即時（1周の時間に含める）
 */

export interface MonsterExpEntry {
  name: string;
  baseExp: number;
  level: number;
  count: number;
}

/**
 * レベルに応じたEXP倍率を計算
 */
export function calcExpMultiplier(level: number): number {
  return Math.max(Math.floor(Math.pow(level, 1.1) * 0.2), 1);
}

/**
 * モンスター1体のスケーリング済みEXP
 */
export function calcScaledExp(baseExp: number, level: number): number {
  return calcExpMultiplier(level) * baseExp;
}

/**
 * 1周あたりのEXP合計
 */
export function calcExpPerRun(
  monsters: MonsterExpEntry[]
): number {
  return monsters.reduce((total, m) => {
    return total + calcScaledExp(m.baseExp, m.level) * m.count;
  }, 0);
}

/**
 * 時給EXP
 */
export function calcExpPerHour(
  expPerRun: number,
  secondsPerRun: number,
  expBonusPercent: number = 0
): number {
  if (secondsPerRun <= 0) return 0;
  const runsPerHour = 3600 / secondsPerRun;
  return Math.floor(expPerRun * runsPerHour * (1 + expBonusPercent / 100));
}

/**
 * 目標到達までの時間 (時間:分 形式)
 */
export function calcTimeForExp(
  remainingExp: number,
  expPerHour: number
): string {
  if (expPerHour <= 0) return "∞";
  const hours = remainingExp / expPerHour;
  const h = Math.floor(hours);
  const m = Math.ceil((hours - h) * 60);
  if (h === 0) return `${m}分`;
  return `${h}時間${m}分`;
}
