import rawData from "../../docs/data/accessories.json";
import type { AccessoryItem } from "../types/game";

export const accessories: AccessoryItem[] = rawData as AccessoryItem[];

export function getAccessoryByName(name: string): AccessoryItem | undefined {
  return accessories.find((a) => a.name === name);
}

export function getAllAccessoryNames(): string[] {
  return accessories.map((a) => a.name);
}

/**
 * アクセサリーの効果値をレベルに応じてスケールする
 * formula: value * (1 + (level - 1) * scalePercent / 100)
 * 実数値: Math.round, %値: そのまま（小数点浮動値）
 */
export function calcAccEffectAtLevel(
  value: number,
  scalePercent: number,
  isFlat: boolean,
  level: number
): number {
  const scaled = value * (1 + (level - 1) * scalePercent / 100);
  return isFlat ? Math.round(scaled) : scaled;
}
