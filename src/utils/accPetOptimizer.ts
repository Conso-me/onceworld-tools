import type { SimConfig, CoreStats, AccessoryItem, PetEntry } from "../types/game";
import { accessories } from "../data/accessories";
import { pets, getPetMaxLevel } from "../data/petSkills";
import { calcStatus } from "./statusCalc";
import type { StatWeights } from "./equipOptimizer";

const STAT_KEYS = ["vit", "spd", "atk", "int", "def", "mdef", "luck"] as const;

// アクセ/ペットは組み合わせ数が膨大（アクセ43種→4枠、ペット136種→3枠）なため、
// 個別スコアで上位候補に絞り込んでから総当たりする（equipOptimizer.tsのtopArmors/topWeaponsと同じ考え方）
const ACC_POOL_CAP = 20;
const PET_POOL_CAP = 20;
const STAGE_KEEP = 15;
const FINAL_KEEP = 10;

export interface AccPetOptResult {
  rank: number;
  accessories: AccessoryItem[];
  accLevels: number[];
  pets: PetEntry[];
  petLevels: number[];
  score: number;
  stats: CoreStats;
  hp: number;
}

function scoreCfg(cfg: SimConfig, weights: StatWeights): { score: number; stats: CoreStats; hp: number } {
  const result = calcStatus(cfg);
  const score = STAT_KEYS.reduce((s, k) => s + result.final[k] * weights[k], 0);
  return { score, stats: result.final, hp: result.hp };
}

function combinations<T>(arr: T[], k: number): T[][] {
  const results: T[][] = [];
  const combo: T[] = [];
  function backtrack(start: number) {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      backtrack(i + 1);
      combo.pop();
    }
  }
  backtrack(0);
  return results;
}

export function accOverridesFor(combo: AccessoryItem[]): Partial<SimConfig> {
  return {
    acc1: combo[0].name, acc1Level: combo[0].maxLevel,
    acc2: combo[1].name, acc2Level: combo[1].maxLevel,
    acc3: combo[2].name, acc3Level: combo[2].maxLevel,
    acc4: combo[3].name, acc4Level: combo[3].maxLevel,
  };
}

export function petOverridesFor(combo: PetEntry[]): Partial<SimConfig> {
  return {
    petName:  combo[0].name, petLevel:  getPetMaxLevel(combo[0].name) as SimConfig["petLevel"],
    pet2Name: combo[1].name, pet2Level: getPetMaxLevel(combo[1].name) as SimConfig["pet2Level"],
    pet3Name: combo[2].name, pet3Level: getPetMaxLevel(combo[2].name) as SimConfig["pet3Level"],
  };
}

/** 個別スコア（他カテゴリはbaseCfgの現状値のまま）で上位candidateだけに絞り込む */
function topKByIsolatedScore<T>(pool: T[], cap: number, scoreOne: (item: T) => number): T[] {
  if (pool.length <= cap) return pool;
  return [...pool]
    .map((item) => ({ item, score: scoreOne(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)
    .map((e) => e.item);
}

/**
 * baseCfg（装備・振り分け・プロテイン等）を固定値として、
 * アクセ4枠＋ペット3枠の組み合わせを実際のcalcStatusパイプラインで評価し最適化する。
 * 重複選択は不可（アクセ4枠・ペット3枠それぞれ別アイテムのみ）。
 */
export function optimizeAccPet(
  baseCfg: SimConfig,
  weights: StatWeights,
  excludedAcc: Set<string>,
  excludedPets: Set<string>,
): AccPetOptResult[] {
  const accPoolAll = accessories.filter((a) => !excludedAcc.has(a.name));
  const petPoolAll = pets.filter((p) => !excludedPets.has(p.name));

  if (accPoolAll.length < 4 || petPoolAll.length < 3) return [];

  const accPool = topKByIsolatedScore(accPoolAll, ACC_POOL_CAP, (item) =>
    scoreCfg({ ...baseCfg, acc1: item.name, acc1Level: item.maxLevel, acc2: "", acc3: "", acc4: "" }, weights).score,
  );
  const petPool = topKByIsolatedScore(petPoolAll, PET_POOL_CAP, (item) =>
    scoreCfg({
      ...baseCfg,
      petName: item.name, petLevel: getPetMaxLevel(item.name) as SimConfig["petLevel"],
      pet2Name: "", pet2Level: 0, pet3Name: "", pet3Level: 0,
    }, weights).score,
  );

  // Stage A: 上位アクセ4点セット（ペットはbaseCfgのまま固定して評価）
  const accCombos = combinations(accPool, 4)
    .map((combo) => ({ combo, score: scoreCfg({ ...baseCfg, ...accOverridesFor(combo) }, weights).score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, STAGE_KEEP);

  // Stage B: 上位ペット3体セット（アクセはbaseCfgのまま固定して評価）
  const petCombos = combinations(petPool, 3)
    .map((combo) => ({ combo, score: scoreCfg({ ...baseCfg, ...petOverridesFor(combo) }, weights).score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, STAGE_KEEP);

  if (accCombos.length === 0 || petCombos.length === 0) return [];

  // Final: アクセ×ペットを掛け合わせ、実際の最終ステータス（%重複適用込み）で再評価
  const finalResults: Omit<AccPetOptResult, "rank">[] = [];
  for (const { combo: accCombo } of accCombos) {
    for (const { combo: petCombo } of petCombos) {
      const cfg: SimConfig = { ...baseCfg, ...accOverridesFor(accCombo), ...petOverridesFor(petCombo) };
      const { score, stats, hp } = scoreCfg(cfg, weights);
      finalResults.push({
        accessories: accCombo,
        accLevels: accCombo.map((a) => a.maxLevel),
        pets: petCombo,
        petLevels: petCombo.map((p) => getPetMaxLevel(p.name)),
        score,
        stats,
        hp,
      });
    }
  }

  finalResults.sort((a, b) => b.score - a.score);
  return finalResults.slice(0, FINAL_KEEP).map((r, i) => ({ ...r, rank: i + 1 }));
}
