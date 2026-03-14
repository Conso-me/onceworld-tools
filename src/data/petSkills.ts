import rawData from "../../docs/data/pet-skills.json";
import type { PetEntry, PetSkill } from "../types/game";

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

export function getPetByName(name: string): PetEntry | undefined {
  return pets.find((p) => p.name === name);
}

export function getActiveSkills(pet: PetEntry, petLevel: number): PetSkill[] {
  return pet.skills.filter((s) => s.level <= petLevel);
}

export function getAllPetNames(): string[] {
  return pets.map((p) => p.name);
}
