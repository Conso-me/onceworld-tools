import rawData from "../../docs/data/pet-skills.json";
import monstersJson from "../../docs/data/monsters.json";
import type { PetEntry, PetSkill, Element } from "../types/game";

// Normalize 防御% → DEF% for consistency
function normalizeSkillType(type: string): string {
  if (type === "防御%") return "DEF%";
  return type;
}

export const pets: PetEntry[] = (rawData as Array<{ name: string; pattern?: number; skills: Array<{ level: number; type: string; value: number | null }> }>).map(
  (p) => ({
    name: p.name,
    pattern: (p.pattern ?? 1) as 1 | 2,
    skills: p.skills.map((s) => ({
      level: s.level as PetSkill["level"],
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

/** "/" 区切りの複合スキルタイプも含め、全て対応するカテゴリを返す */
function skillTypeToCategories(type: string): PetStatCategory[] {
  const cats = new Set<PetStatCategory>();
  // "/" で分割して各部分を個別に判定
  for (const part of type.split("/")) {
    const t = part.trim();
    if (t.includes("VIT")) cats.add("体力");
    if (t.includes("ATK")) cats.add("攻撃力");
    if (t.includes("INT")) cats.add("魔力");
    if (t.includes("M-DEF")) cats.add("魔法防御力");
    else if (t.includes("DEF")) cats.add("防御力");
    if (t.includes("LUCK")) cats.add("幸運");
    if (t.includes("SPD")) cats.add("攻撃速度");
    if (t.includes("経験値")) cats.add("経験値");
    if (t.includes("捕獲率")) cats.add("捕獲率");
    if (t.includes("ドロップ率")) cats.add("ドロップ率");
  }
  if (cats.size === 0) cats.add("その他");
  return [...cats];
}

/** カテゴリごとの対応スキルタイプ（実数 / 加算% / 最終%） */
function getCategorySkillTypes(cat: PetStatCategory): { flat: string[]; pct: string[]; finalPct: string[] } {
  switch (cat) {
    case "体力":       return { flat: ["VIT"],        pct: ["VIT%"],       finalPct: ["最終VIT%"]    };
    case "攻撃力":     return { flat: ["ATK"],        pct: ["ATK%"],       finalPct: ["最終ATK%"]    };
    case "魔力":       return { flat: ["INT"],        pct: ["INT%"],       finalPct: ["最終INT%"]    };
    case "防御力":     return { flat: ["DEF"],        pct: ["DEF%"],       finalPct: ["最終DEF%"]    };
    case "魔法防御力": return { flat: ["M-DEF"],      pct: ["M-DEF%"],     finalPct: ["最終M-DEF%"]  };
    case "幸運":       return { flat: ["LUCK"],       pct: ["LUCK%"],      finalPct: ["最終LUCK%"]   };
    case "攻撃速度":   return { flat: ["SPD"],        pct: ["SPD%"],       finalPct: ["最終SPD%"]    };
    case "経験値":     return { flat: ["経験値"],     pct: [],             finalPct: []              };
    case "捕獲率":     return { flat: ["捕獲率"],     pct: [],             finalPct: []              };
    case "ドロップ率": return { flat: ["ドロップ率"], pct: [],             finalPct: []              };
    default:           return { flat: [],             pct: [],             finalPct: []              };
  }
}

function sumSkillTypes(pet: PetEntry, types: string[]): number {
  if (types.length === 0) return 0;
  return pet.skills
    .filter((s) => types.includes(s.type) && s.value !== null)
    .reduce((sum, s) => sum + (s.value as number), 0);
}

/** 実数 / 加算% / 乗算（最終%）の3グループに分けたカテゴリグループ */
export type PetCategoryGroup = {
  flat: PetEntry[];
  pct: PetEntry[];
  finalPct: PetEntry[];
};

/** ペットを全スキルタイプが属するカテゴリ全てにグループ化（複合スキルは複数カテゴリに出現）。
 *  各カテゴリ内は実数・加算%・乗算の3サブグループに分け、それぞれ値の大きい順にソートする。
 *  ペットは最初にマッチするグループ（実数 → 加算% → 乗算）にのみ登録する。 */
export function getPetsByPrimaryStat(): Map<PetStatCategory, PetCategoryGroup> {
  // カテゴリ → ペット集合
  const catMap = new Map<PetStatCategory, Set<PetEntry>>();
  for (const pet of pets) {
    const categories = new Set<PetStatCategory>();
    for (const skill of pet.skills) {
      for (const cat of skillTypeToCategories(skill.type)) {
        categories.add(cat);
      }
    }
    if (categories.size === 0) categories.add("その他");
    for (const cat of categories) {
      if (!catMap.has(cat)) catMap.set(cat, new Set());
      catMap.get(cat)!.add(pet);
    }
  }

  // 各カテゴリを3サブグループに分けてソート
  const result = new Map<PetStatCategory, PetCategoryGroup>();
  for (const [cat, petSet] of catMap) {
    const types = getCategorySkillTypes(cat);
    const group: PetCategoryGroup = { flat: [], pct: [], finalPct: [] };

    for (const pet of petSet) {
      if (sumSkillTypes(pet, types.flat) > 0)         group.flat.push(pet);
      else if (sumSkillTypes(pet, types.pct) > 0)     group.pct.push(pet);
      else if (sumSkillTypes(pet, types.finalPct) > 0) group.finalPct.push(pet);
      else                                             group.flat.push(pet); // その他など
    }

    group.flat.sort((a, b)     => sumSkillTypes(b, types.flat)     - sumSkillTypes(a, types.flat));
    group.pct.sort((a, b)      => sumSkillTypes(b, types.pct)      - sumSkillTypes(a, types.pct));
    group.finalPct.sort((a, b) => sumSkillTypes(b, types.finalPct) - sumSkillTypes(a, types.finalPct));

    result.set(cat, group);
  }
  return result;
}

/** 全レベルスキルの累積合計を返す（例: "VIT +420・最終VIT% +35"）。未判明スキルは "？" で示す */
export function getPetMaxSkillSummary(pet: PetEntry): string {
  if (!pet.skills.length) return "";
  const totals = new Map<string, number>();
  let hasUnknown = false;
  for (const s of pet.skills) {
    if (s.type === "？" || s.value === null) { hasUnknown = true; continue; }
    totals.set(s.type, (totals.get(s.type) ?? 0) + s.value);
  }
  const parts = [...totals.entries()].map(([type, total]) => `${type} +${total}`);
  if (hasUnknown) parts.push("？");
  return parts.join("・");
}

/**
 * カテゴリ・サブグループに関連するスキルのみを表示し、
 * 他にスキルがある場合は末尾に「その他」を付ける。
 * 名前が長いペットでも関連スキルを必ず表示できるようにする。
 */
export function getPetSkillSummaryForCategory(
  pet: PetEntry,
  cat: PetStatCategory,
  subgroup: keyof PetCategoryGroup
): string {
  const totals = new Map<string, number>();
  let hasUnknown = false;
  for (const s of pet.skills) {
    if (s.value === null || s.type === "？") { hasUnknown = true; continue; }
    totals.set(s.type, (totals.get(s.type) ?? 0) + s.value);
  }

  const relevantTypes = getCategorySkillTypes(cat)[subgroup];

  if (relevantTypes.length === 0) {
    // その他カテゴリ等：先頭2種類を表示
    const entries = [...totals.entries()];
    if (entries.length === 0) return "";
    const shown = entries.slice(0, 2).map(([t, v]) => `${t} +${v}`).join("・");
    return entries.length > 2 ? `${shown}・その他` : shown;
  }

  const relevantParts = relevantTypes
    .filter((t) => totals.has(t))
    .map((t) => `${t} +${totals.get(t)}`);

  const hasOthers = [...totals.keys()].some((t) => !relevantTypes.includes(t));
  const summary = relevantParts.join("・");
  const suffix = (hasOthers || hasUnknown) && summary ? "・その他" : (hasUnknown && !summary ? "？" : "");
  return summary + suffix;
}

/** パターンに応じたスキル解放レベル一覧（0 = 未装備）を返す */
export function getPatternLevels(pattern: 1 | 2): readonly (0 | 31 | 71 | 121 | 181 | 200 | 500 | 800 | 1200)[] {
  return pattern === 2 ? [0, 200, 500, 800, 1200] : [0, 31, 71, 121, 181];
}

/** ペットの最大スキル解放レベルを返す（名前未登録は181） */
export function getPetMaxLevel(petName: string): 181 | 1200 {
  const pet = getPetByName(petName);
  return pet?.pattern === 2 ? 1200 : 181;
}
