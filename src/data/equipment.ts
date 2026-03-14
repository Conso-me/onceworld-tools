import rawData from "../../docs/data/equipment.json";
import type { EquipmentItem, EquipmentSlot } from "../types/game";

export const equipment: EquipmentItem[] = rawData as EquipmentItem[];

export function getEquipmentBySlot(slot: EquipmentSlot): EquipmentItem[] {
  return equipment.filter((e) => e.slot === slot);
}

export function getEquipmentByName(name: string): EquipmentItem | undefined {
  return equipment.find((e) => e.name === name);
}
