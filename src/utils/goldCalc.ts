/**
 * OnceWorld 金策計算ユーティリティ
 *
 * ゴールドのドロップ率は固定30%（固有ドロップ率とは別枠）
 */

import { GOLD_DROP_RATE } from "./dropCalc";

export interface MonsterGoldEntry {
  name: string;
  gold: number;
  count: number;
}

/**
 * 1周あたりの期待ゴールド（30%ドロップ率を考慮）
 */
export function calcGoldPerRun(monsters: MonsterGoldEntry[]): number {
  return monsters.reduce(
    (total, m) => total + m.gold * m.count * GOLD_DROP_RATE,
    0
  );
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
