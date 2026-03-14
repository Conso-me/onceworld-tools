import type { MonsterBase } from "../types/game";
import monstersJson from "../../docs/data/monsters.json";

const monsters: MonsterBase[] = monstersJson as MonsterBase[];

export function getMonsterByName(name: string): MonsterBase | undefined {
  return monsters.find((m) => m.name === name);
}

export function getAllMonsters(): MonsterBase[] {
  return monsters;
}

export function getAllMonsterNames(): string[] {
  return monsters.map((m) => m.name);
}

export function searchMonsters(query: string): MonsterBase[] {
  if (!query) return monsters;
  const lower = query.toLowerCase();
  return monsters.filter((m) => m.name.toLowerCase().includes(lower));
}
