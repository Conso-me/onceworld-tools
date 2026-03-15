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

// ── ステータスカテゴリグルーピング ──────────────────────────────────────────

export type PetStatCategory =
  | "体力" | "攻撃力" | "魔力" | "防御力" | "魔法防御力"
  | "幸運" | "攻撃速度" | "経験値" | "捕獲率" | "ドロップ率" | "その他";

function skillTypeToCategory(type: string): PetStatCategory {
  if (type.includes("VIT")) return "体力";
  if (type.includes("ATK")) return "攻撃力";
  if (type.includes("INT")) return "魔力";
  if (type.includes("M-DEF")) return "魔法防御力";
  if (type.includes("DEF")) return "防御力";
  if (type.includes("LUCK")) return "幸運";
  if (type.includes("SPD")) return "攻撃速度";
  if (type === "経験値") return "経験値";
  if (type === "捕獲率") return "捕獲率";
  if (type === "ドロップ率") return "ドロップ率";
  return "その他";
}

/** ペットをLv181スキルの主要ステータスでグループ化 */
export function getPetsByPrimaryStat(): Map<PetStatCategory, PetEntry[]> {
  const map = new Map<PetStatCategory, PetEntry[]>();
  for (const pet of pets) {
    const primarySkill =
      pet.skills.find((s) => s.level === 181) ??
      pet.skills.reduce<PetSkill | undefined>(
        (best, s) => (!best || s.level > best.level ? s : best),
        undefined
      );
    const category = primarySkill ? skillTypeToCategory(primarySkill.type) : "その他";
    if (!map.has(category)) map.set(category, []);
    map.get(category)!.push(pet);
  }
  return map;
}

/** 全レベルスキルの累積合計を返す（例: "VIT +420・最終VIT% +35"） */
export function getPetMaxSkillSummary(pet: PetEntry): string {
  if (!pet.skills.length) return "";
  const totals = new Map<string, number>();
  for (const s of pet.skills) {
    totals.set(s.type, (totals.get(s.type) ?? 0) + s.value);
  }
  return [...totals.entries()]
    .map(([type, total]) => `${type} +${total}`)
    .join("・");
}
