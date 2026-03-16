import type { MonsterBase } from "../types/game";
import monstersJson from "../../docs/data/monsters.json";

const CUSTOM_KEY = "onceworld_custom_monsters";

const _builtin: MonsterBase[] = monstersJson as MonsterBase[];

function _loadCustom(): MonsterBase[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) return JSON.parse(raw) as MonsterBase[];
  } catch {}
  return [];
}

let _custom: MonsterBase[] = _loadCustom();
let _all: MonsterBase[] = [..._builtin, ..._custom];

function _refresh(): void {
  _all = [..._builtin, ..._custom];
}

export function getCustomMonsters(): MonsterBase[] {
  return _custom;
}

export function setCustomMonsters(custom: MonsterBase[]): void {
  _custom = custom;
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
  _refresh();
  window.dispatchEvent(new CustomEvent("onceworld:monsters-updated"));
}

export function getMonsterByName(name: string): MonsterBase | undefined {
  return _all.find((m) => m.name === name);
}

export function getAllMonsters(): MonsterBase[] {
  return _all;
}

export function getAllMonsterNames(): string[] {
  return _all.map((m) => m.name);
}

export function searchMonsters(query: string): MonsterBase[] {
  if (!query) return _all;
  const lower = query.toLowerCase();
  return _all.filter((m) => m.name.toLowerCase().includes(lower));
}
