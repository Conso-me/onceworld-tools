import type { MonsterBase, Element, ScaledMonster } from "../types/game";
import type { DamageRange } from "./damageCalc";
import type { MagicSpell } from "../data/magicSpells";
import { scaleMonster } from "./monsterScaling";
import {
  calcPhysicalDamage,
  calcPlayerMagicDamage,
  calcPetMagicDamage,
  calcMultiHitCount,
  calcHitsToKill,
  calcHitRate,
} from "./damageCalc";
import {
  calcDamage as calcDefDamage,
  canNullifyDamage,
} from "./defenseCalc";
import { getElementAffinity } from "../data/elements";
import { MAGIC_SPELLS } from "../data/magicSpells";

export interface MultiMonsterEntry {
  monster: MonsterBase;
  level: number;
  location: string;
}

type PlayerAttackMode = "物理" | "魔弾" | "魔攻";

// ─── Offensive ────────────────────────────────────────────────────────────────

export interface OffensiveSpellResult {
  spell: MagicSpell;
  dmg: DamageRange;
  totalMin: number;
  totalMax: number;
  hitsToKill: number;
}

export interface OffensiveComparisonRow {
  entry: MultiMonsterEntry;
  scaled: ScaledMonster;
  affinity: number;
  mode: PlayerAttackMode;
  // 物理/魔弾
  dmg?: DamageRange;
  multiHit?: number;
  hitsToKill?: number;
  hitRate?: number | null;
  overkillGuaranteed?: boolean;
  // 魔攻: 全魔法の結果 + 最良の魔法
  spellResults?: OffensiveSpellResult[];
  bestSpell?: OffensiveSpellResult;
}

export function calcOffensiveComparison(
  entries: MultiMonsterEntry[],
  playerStats: {
    atk: number;
    int: number;
    spd: number;
    luck: number;
    element: Element;
  },
  attackMode: PlayerAttackMode,
  magicParams: {
    magicBaseInt: number;
    crystalCubePreMult: number;
    crystalCubeFinalMult: number;
  }
): OffensiveComparisonRow[] {
  return entries.map((entry) => {
    const scaled = scaleMonster(entry.monster, entry.level);
    const affinity = getElementAffinity(playerStats.element, entry.monster.element);
    const multiHit = calcMultiHitCount(playerStats.spd, attackMode === "魔攻");

    if (attackMode === "魔攻") {
      const spellResults = MAGIC_SPELLS.map((spell) => {
        const effectiveMult = spell.multiplier * magicParams.crystalCubePreMult;
        const dmg = calcPlayerMagicDamage(
          playerStats.int,
          magicParams.magicBaseInt,
          effectiveMult,
          scaled.scaledDef,
          scaled.scaledMdef,
          affinity,
          magicParams.crystalCubeFinalMult
        );
        const totalMin = dmg.isNullified ? spell.hits : dmg.min * spell.hits;
        const totalMax = dmg.isNullified ? 9 * spell.hits : dmg.max * spell.hits;
        const hitsToKill = calcHitsToKill(scaled.hp, dmg.isNullified ? 1 : dmg.min, spell.hits);
        return { spell, dmg, totalMin, totalMax, hitsToKill };
      });

      // 最良の魔法 = 無効化されていない中で最も少ない確殺回数（同じなら最大ダメージ）
      const validSpells = spellResults.filter((r) => !r.dmg.isNullified);
      const bestSpell = validSpells.length > 0
        ? validSpells.reduce((best, r) =>
            r.hitsToKill < best.hitsToKill ||
            (r.hitsToKill === best.hitsToKill && r.totalMax > best.totalMax)
              ? r
              : best
          )
        : spellResults[0]; // 全て無効化の場合は最初の魔法

      return { entry, scaled, affinity, mode: attackMode, spellResults, bestSpell };
    }

    // 物理/魔弾
    const dmg = attackMode === "物理"
      ? calcPhysicalDamage(playerStats.atk, scaled.scaledDef, scaled.scaledMdef, affinity)
      : calcPetMagicDamage(
          playerStats.int,
          scaled.scaledDef,
          scaled.scaledMdef,
          affinity,
          magicParams.crystalCubeFinalMult,
          magicParams.crystalCubePreMult
        );

    const hitsToKill = calcHitsToKill(scaled.hp, dmg.min, multiHit);
    const hitRate = attackMode === "物理" ? calcHitRate(playerStats.luck, scaled.scaledLuck) : null;
    const overkillThreshold = scaled.hp * 10;
    const overkillGuaranteed = !dmg.isNullified && dmg.min >= overkillThreshold;

    return { entry, scaled, affinity, mode: attackMode, dmg, multiHit, hitsToKill, hitRate, overkillGuaranteed };
  });
}

// ─── Defensive ────────────────────────────────────────────────────────────────

export interface DefensiveComparisonRow {
  entry: MultiMonsterEntry;
  scaled: ScaledMonster;
  affinity: number;
  enemyIsPhysical: boolean;
  enemyStat: number;
  nullified: boolean;
  currentDmg: { min: number; max: number };
  enemyMultiHit: number;
  hitsToTake: { worst: number; best: number } | null;
}

export function calcDefensiveComparison(
  entries: MultiMonsterEntry[],
  playerStats: {
    def: number;
    mdef: number;
    element: Element;
    hp: number;
  }
): DefensiveComparisonRow[] {
  return entries.map((entry) => {
    const scaled = scaleMonster(entry.monster, entry.level);
    const affinity = getElementAffinity(entry.monster.element, playerStats.element);
    const enemyIsPhysical = scaled.attackType === "物理";
    const enemyStat = enemyIsPhysical ? scaled.scaledAtk : scaled.scaledInt;

    const currentDmg = calcDefDamage(
      enemyStat,
      playerStats.def,
      playerStats.mdef,
      enemyIsPhysical,
      affinity
    );

    const nullified = canNullifyDamage(
      enemyStat,
      playerStats.def,
      playerStats.mdef,
      enemyIsPhysical
    );

    const enemyMultiHit = calcMultiHitCount(
      scaled.scaledSpd,
      scaled.attackType === "魔攻"
    );

    const hitsToTake = playerStats.hp > 0
      ? {
          worst: Math.ceil(playerStats.hp / Math.max(currentDmg.max * enemyMultiHit, 1)),
          best: Math.floor(playerStats.hp / Math.max(currentDmg.min * enemyMultiHit, 1)),
        }
      : null;

    return {
      entry,
      scaled,
      affinity,
      enemyIsPhysical,
      enemyStat,
      nullified,
      currentDmg,
      enemyMultiHit,
      hitsToTake,
    };
  });
}
