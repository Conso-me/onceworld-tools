/**
 * おふぁ～む Wave シミュレーション計算
 *
 * 既存の damageCalc / defenseCalc / monsterScaling / elements を組み合わせて、
 * Wave毎に「耐久（被弾を耐えられるか）」「物理で確殺できるか」「各属性魔法で何発で倒せるか」を求める。
 * 新しい計算式は導入しない（プロジェクト既存のロジックを再利用）。
 */

import type { Element } from "../types/game";
import { OFARM_WAVES, type OfarmWave } from "../data/ofarmWaves";
import { getMonsterByName } from "../data/monsters";
import { scaleMonster } from "./monsterScaling";
import { getElementAffinity, getMagicMultiplier } from "../data/elements";
import {
  calcPhysicalDamage,
  calcPlayerMagicDamage,
  calcHitRate,
  calcMultiHitCount,
  calcHitsToKill,
  calcMinAtkToHit,
  calcAtkForKill,
  type DamageRange,
} from "./damageCalc";
import { calcDamage, canNullifyDamage } from "./defenseCalc";

export const ELEMENTS: Element[] = ["火", "水", "木", "光", "闇"];

/** 左パネルから渡すプレイヤー実効ステータス */
export interface OfarmPlayerStats {
  atk: number;
  int: number;
  def: number;
  mdef: number;
  spd: number;
  vit: number;
  luck: number;
  hp: number;
  element: Element;
  /** 魔法計算用の解析書（INT加算） */
  analysisBook: number;
}

export interface OfarmDurability {
  /** 敵の攻撃が物理か（false=魔法/魔弾） */
  isPhysical: boolean;
  /** 被ダメージ（最小〜最大） */
  min: number;
  max: number;
  /** 1〜9に無効化できているか */
  nullified: boolean;
  /** 最大被ダメで割った「耐えられる回数」（無効化時は Infinity） */
  hitsSurvivable: number;
}

export interface OfarmPhysical {
  /** 与ダメージ範囲（最小値ベースで確殺判定） */
  damage: DamageRange;
  /** 多段ヒット数 */
  multiHit: number;
  /** 命中率（%） */
  hitRate: number;
  /** 確殺に必要な攻撃回数（最小ダメージ基準。Infinity=削りきれない） */
  hitsToKill: number;
  /** 1ダメ以上与えるのに必要な最低ATK */
  minAtk: number;
  /** 1確殺に必要なATK */
  atkFor1Kill: number;
}

export interface OfarmMagicEntry {
  element: Element;
  damage: DamageRange;
  /** 確殺回数（1ヒット基準。Infinity=削りきれない） */
  hitsToKill: number;
}

export interface OfarmWaveResult {
  wave: OfarmWave;
  /** モンスターが見つからない場合 null */
  found: boolean;
  monsterName: string;
  element: Element;
  level: number;
  hp: number;
  enemyAtk: number;
  enemyInt: number;
  durability: OfarmDurability | null;
  physical: OfarmPhysical | null;
  magic: OfarmMagicEntry[];
}

function safeHits(hp: number, perHit: number, multi: number): number {
  if (perHit <= 0) return Infinity;
  return calcHitsToKill(hp, perHit, multi);
}

export function calcOfarmWave(wave: OfarmWave, player: OfarmPlayerStats): OfarmWaveResult {
  const base = getMonsterByName(wave.monsterName);
  if (!base) {
    return {
      wave,
      found: false,
      monsterName: wave.monsterName,
      element: "火",
      level: wave.level,
      hp: 0,
      enemyAtk: 0,
      enemyInt: 0,
      durability: null,
      physical: null,
      magic: [],
    };
  }

  const scaled = scaleMonster(base, wave.level);
  const enemyAttackIsPhysical = base.attackType === "物理";

  // ─── 耐久（敵→自分）─────────────────────────────────────────────
  // 敵の属性 → 自分の属性 の相性
  const incomingAffinity = getElementAffinity(base.element, player.element);
  const attackerStat = enemyAttackIsPhysical ? scaled.scaledAtk : scaled.scaledInt;
  const incoming = calcDamage(
    attackerStat,
    player.def,
    player.mdef,
    enemyAttackIsPhysical,
    incomingAffinity,
  );
  const nullified = canNullifyDamage(attackerStat, player.def, player.mdef, enemyAttackIsPhysical);
  const durability: OfarmDurability = {
    isPhysical: enemyAttackIsPhysical,
    min: incoming.min,
    max: incoming.max,
    nullified,
    hitsSurvivable: nullified || incoming.max <= 0 ? Infinity : Math.floor(player.hp / incoming.max),
  };

  // ─── 物理攻撃（自分→敵）─────────────────────────────────────────
  // 自分の属性 → 敵の属性 の相性
  const outgoingAffinity = getElementAffinity(player.element, base.element);
  const multiHit = calcMultiHitCount(player.spd, false);
  const physDmg = calcPhysicalDamage(player.atk, scaled.scaledDef, scaled.scaledMdef, outgoingAffinity);
  const physical: OfarmPhysical = {
    damage: physDmg,
    multiHit,
    hitRate: calcHitRate(player.luck, scaled.scaledLuck),
    hitsToKill: safeHits(scaled.hp, physDmg.isNullified ? 1 : physDmg.min, multiHit),
    minAtk: calcMinAtkToHit(scaled.scaledDef, scaled.scaledMdef),
    atkFor1Kill: calcAtkForKill(scaled.hp, scaled.scaledDef, scaled.scaledMdef, outgoingAffinity, multiHit, 1),
  };

  // ─── 魔法攻撃（各属性、自分→敵）──────────────────────────────────
  const magic: OfarmMagicEntry[] = ELEMENTS.map((el) => {
    const affinity = getElementAffinity(el, base.element);
    const mult = getMagicMultiplier(el);
    const dmg = calcPlayerMagicDamage(
      player.int,
      player.analysisBook,
      mult,
      scaled.scaledDef,
      scaled.scaledMdef,
      affinity,
    );
    return {
      element: el,
      damage: dmg,
      hitsToKill: safeHits(scaled.hp, dmg.isNullified ? 1 : dmg.min, 1),
    };
  });

  return {
    wave,
    found: true,
    monsterName: wave.monsterName,
    element: base.element,
    level: wave.level,
    hp: scaled.hp,
    enemyAtk: scaled.scaledAtk,
    enemyInt: scaled.scaledInt,
    durability,
    physical,
    magic,
  };
}

export function calcAllOfarmWaves(player: OfarmPlayerStats): OfarmWaveResult[] {
  return OFARM_WAVES.map((w) => calcOfarmWave(w, player));
}
