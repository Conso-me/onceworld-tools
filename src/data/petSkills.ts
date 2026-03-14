import rawData from "../../docs/data/pet-skills.json";
import monstersJson from "../../docs/data/monsters.json";
import type { PetEntry, PetSkill, Element } from "../types/game";

// Normalize 防御% → DEF% for consistency
function normalizeSkillType(type: string): string {
  if (type === "防御%") return "DEF%";
  return type;
}

export const pets: PetEntry[] = (rawData as Array<{ name: string; skills: Array<{ level: number; type: string; value: number }> }>).map(
  (p) => ({
    name: p.name,
    skills: p.skills.map((s) => ({
      level: s.level as 31 | 71 | 121 | 181,
      type: normalizeSkillType(s.type) as PetSkill["type"],
      value: s.value,
    })),
  })
);

// Build element lookup from monsters data
const monsterElements = new Map<string, Element>(
  (monstersJson as Array<{ name: string; element: string }>).map(
    (m) => [m.name, m.element as Element]
  )
);

export function getPetElement(petName: string): Element | null {
  return monsterElements.get(petName) ?? null;
}

/** ペットを属性別にグループ化して返す */
export function getPetsByElement(): Map<Element | "不明", PetEntry[]> {
  const map = new Map<Element | "不明", PetEntry[]>();
  for (const pet of pets) {
    const el: Element | "不明" = monsterElements.get(pet.name) ?? "不明";
    if (!map.has(el)) map.set(el, []);
    map.get(el)!.push(pet);
  }
  return map;
}

export function getPetByName(name: string): PetEntry | undefined {
  return pets.find((p) => p.name === name);
}

export function getActiveSkills(pet: PetEntry, petLevel: number): PetSkill[] {
  return pet.skills.filter((s) => s.level <= petLevel);
}

export function getAllPetNames(): string[] {
  return pets.map((p) => p.name);
}
