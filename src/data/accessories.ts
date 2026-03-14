import rawData from "../../docs/data/accessories.json";
import type { AccessoryItem } from "../types/game";

export const accessories: AccessoryItem[] = rawData as AccessoryItem[];

export function getAccessoryByName(name: string): AccessoryItem | undefined {
  return accessories.find((a) => a.name === name);
}

export function getAllAccessoryNames(): string[] {
  return accessories.map((a) => a.name);
}
