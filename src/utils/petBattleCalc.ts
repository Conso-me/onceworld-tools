import type { PetStatResult } from "../types/game";
import {
  calcPhysicalDamage,
  calcPetMagicDamage,
  calcEffectiveDef,
  calcMultiHitCount,
  calcHitRate,
  type DamageRange,
} from "./damageCalc";
import { getElementAffinity } from "../data/elements";

export interface AttackOutcome {
  damage: DamageRange;
  multiHit: number;
  perTurn: { min: number; max: number; avg: number };
  hitRate: number;
  elementAffinity: number;
  attackType: "物理" | "魔法" | "魔弾";
  isPhysical: boolean;
  effectiveDef: number;
  isNullified: boolean;
  hitsToKill: { best: number; worst: number };
  expectedTurnsWithMiss: number;
}

export type InitiativeWinner = "A" | "B" | "tie";

export interface BattlePrediction {
  winner: "A" | "B" | "draw";
  turnsToWin: number;
  note: "simultaneous" | "stalemate" | "preContactKO" | null;
}

export interface RangePhaseResult {
  advantageSide: "A" | "B" | "none";
  preContactHits: number;
  preContactDamageAvg: number;
  preContactDamageMin: number;
  preContactDamageMax: number;
  hpPctDealtAvg: number;
  rangeA: number;
  rangeB: number;
  moveSpeedA: number;
  moveSpeedB: number;
}

export interface PetBattleResult {
  aToB: AttackOutcome;
  bToA: AttackOutcome;
  initiative: InitiativeWinner;
  prediction: BattlePrediction;
  rangePhase: RangePhaseResult;
}

export function calcAttackOutcome(
  attacker: PetStatResult,
  defender: PetStatResult,
): AttackOutcome {
  const affinity = getElementAffinity(attacker.element, defender.element);
  const isPhysical = attacker.attackMode === "物理";

  const damage: DamageRange = isPhysical
    ? calcPhysicalDamage(
        attacker.final.atk,
        defender.final.def,
        defender.final.mdef,
        affinity,
      )
    : calcPetMagicDamage(
        attacker.final.int,
        defender.final.def,
        defender.final.mdef,
        affinity,
      );

  const multiHit = calcMultiHitCount(attacker.final.spd, false);
  const perTurn = {
    min: damage.min * multiHit,
    max: damage.max * multiHit,
    avg: damage.avg * multiHit,
  };

  const hitRate = calcHitRate(attacker.final.luck, defender.final.luck);
  const effectiveDef = calcEffectiveDef(
    defender.final.def,
    defender.final.mdef,
    isPhysical,
  );

  const worst = perTurn.min > 0 ? Math.ceil(defender.hp / perTurn.min) : Infinity;
  const best = perTurn.max > 0 ? Math.ceil(defender.hp / perTurn.max) : Infinity;
  const expectedTurnsWithMiss =
    hitRate > 0 && Number.isFinite(worst)
      ? Math.ceil(worst * (100 / hitRate))
      : Infinity;

  return {
    damage,
    multiHit,
    perTurn,
    hitRate,
    elementAffinity: affinity,
    attackType: attacker.attackMode,
    isPhysical,
    effectiveDef,
    isNullified: damage.isNullified,
    hitsToKill: { best, worst },
    expectedTurnsWithMiss,
  };
}

export function calcInitiative(
  spdA: number,
  luckA: number,
  spdB: number,
  luckB: number,
): InitiativeWinner {
  if (spdA > spdB) return "A";
  if (spdB > spdA) return "B";
  if (luckA > luckB) return "A";
  if (luckB > luckA) return "B";
  return "tie";
}

export function predictWinner(
  aToB: AttackOutcome,
  bToA: AttackOutcome,
  initiative: InitiativeWinner,
): BattlePrediction {
  // ミス率を加味した期待ターン数で勝敗判定
  const aKillsIn = aToB.expectedTurnsWithMiss;
  const bKillsIn = bToA.expectedTurnsWithMiss;

  if (!Number.isFinite(aKillsIn) && !Number.isFinite(bKillsIn)) {
    return { winner: "draw", turnsToWin: Infinity, note: "stalemate" };
  }

  if (aKillsIn < bKillsIn) {
    return { winner: "A", turnsToWin: aKillsIn, note: null };
  }
  if (bKillsIn < aKillsIn) {
    return { winner: "B", turnsToWin: bKillsIn, note: null };
  }

  // 同ターン決着: 先攻勝ち、tie なら相打ち
  if (initiative === "A") {
    return { winner: "A", turnsToWin: aKillsIn, note: null };
  }
  if (initiative === "B") {
    return { winner: "B", turnsToWin: bKillsIn, note: null };
  }
  return { winner: "draw", turnsToWin: aKillsIn, note: "simultaneous" };
}

// ── Range Phase ──────────────────────────────────────────────────────────────

export function calcAttackRange(attackMode: "物理" | "魔法" | "魔弾"): number {
  return attackMode === "魔弾" ? 150 : 30;
}

export function calcMoveSpeed(mov: number): number {
  if (mov === 0) return 10;
  return 80 * (1 + mov * 0.1);
}

// SPD → attacks per second (piecewise linear, from reference sim)
export function calcAttackRatePerSec(spd: number): number {
  const points: [number, number][] = [
    [0, 1.0], [100, 1.5], [200, 2.0], [300, 2.5], [400, 3.0],
    [500, 3.5], [600, 4.0], [700, 4.5], [800, 5.0], [3000, 20.0],
  ];
  if (spd <= 0) return 1.0;
  if (spd >= 3000) return 20.0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    if (spd >= x1 && spd <= x2) {
      return y1 + ((spd - x1) / (x2 - x1)) * (y2 - y1);
    }
  }
  return 1.0;
}

export function calcRangePhase(
  a: PetStatResult,
  b: PetStatResult,
  aToB: AttackOutcome,
  bToA: AttackOutcome,
  preContactHits: number,
): RangePhaseResult {
  const rangeA = calcAttackRange(a.attackMode);
  const rangeB = calcAttackRange(b.attackMode);
  const moveSpeedA = calcMoveSpeed(a.mov);
  const moveSpeedB = calcMoveSpeed(b.mov);

  if (rangeA === rangeB) {
    return {
      advantageSide: "none", preContactHits: 0,
      preContactDamageAvg: 0, preContactDamageMin: 0, preContactDamageMax: 0,
      hpPctDealtAvg: 0, rangeA, rangeB, moveSpeedA, moveSpeedB,
    };
  }

  const isAAdvantaged = rangeA > rangeB;
  const outcome = isAAdvantaged ? aToB : bToA;
  const defenderHP = isAAdvantaged ? b.hp : a.hp;

  const preContactDamageAvg = preContactHits * outcome.perTurn.avg;
  const preContactDamageMin = preContactHits * outcome.perTurn.min;
  const preContactDamageMax = preContactHits * outcome.perTurn.max;
  const hpPctDealtAvg = defenderHP > 0 ? preContactDamageAvg / defenderHP : 0;

  return {
    advantageSide: isAAdvantaged ? "A" : "B",
    preContactHits,
    preContactDamageAvg,
    preContactDamageMin,
    preContactDamageMax,
    hpPctDealtAvg,
    rangeA,
    rangeB,
    moveSpeedA,
    moveSpeedB,
  };
}

function calcAdjustedPrediction(
  rangePhase: RangePhaseResult,
  aToB: AttackOutcome,
  bToA: AttackOutcome,
  initiative: InitiativeWinner,
  aHP: number,
  bHP: number,
): BattlePrediction {
  if (rangePhase.advantageSide === "none" || rangePhase.preContactHits === 0) {
    return predictWinner(aToB, bToA, initiative);
  }

  const isAAdvantaged = rangePhase.advantageSide === "A";
  const defenderHP = isAAdvantaged ? bHP : aHP;
  const rangedOutcome = isAAdvantaged ? aToB : bToA;
  const meleeOutcome = isAAdvantaged ? bToA : aToB;

  const remainingHP = defenderHP - rangePhase.preContactDamageAvg;

  if (remainingHP <= 0) {
    return { winner: rangePhase.advantageSide, turnsToWin: rangePhase.preContactHits, note: "preContactKO" };
  }

  // 接敵後：近接も同時に攻撃開始。魔弾側の残HPを調整して計算
  const adjWorst = rangedOutcome.perTurn.min > 0 ? Math.ceil(remainingHP / rangedOutcome.perTurn.min) : Infinity;
  const adjExpected = rangedOutcome.hitRate > 0 && Number.isFinite(adjWorst)
    ? Math.ceil(adjWorst * (100 / rangedOutcome.hitRate))
    : Infinity;
  const meleeExpected = meleeOutcome.expectedTurnsWithMiss;
  const rangedTotal = Number.isFinite(adjExpected) ? rangePhase.preContactHits + adjExpected : Infinity;

  if (!Number.isFinite(rangedTotal) && !Number.isFinite(meleeExpected)) {
    return { winner: "draw", turnsToWin: Infinity, note: "stalemate" };
  }
  if (adjExpected < meleeExpected) {
    return { winner: rangePhase.advantageSide, turnsToWin: rangedTotal, note: null };
  }
  if (meleeExpected < adjExpected) {
    return { winner: isAAdvantaged ? "B" : "A", turnsToWin: meleeExpected, note: null };
  }
  // 同ターン: 先攻判定
  if (initiative === rangePhase.advantageSide) {
    return { winner: rangePhase.advantageSide, turnsToWin: rangedTotal, note: null };
  }
  if (initiative !== "tie") {
    return { winner: isAAdvantaged ? "B" : "A", turnsToWin: meleeExpected, note: null };
  }
  return { winner: "draw", turnsToWin: adjExpected, note: "simultaneous" };
}

export function calcPetBattleResult(
  a: PetStatResult,
  b: PetStatResult,
  preContactHits = 0,
): PetBattleResult {
  const aToB = calcAttackOutcome(a, b);
  const bToA = calcAttackOutcome(b, a);
  const initiative = calcInitiative(
    a.final.spd,
    a.final.luck,
    b.final.spd,
    b.final.luck,
  );
  const rangePhase = calcRangePhase(a, b, aToB, bToA, preContactHits);
  const prediction = calcAdjustedPrediction(rangePhase, aToB, bToA, initiative, a.hp, b.hp);
  return { aToB, bToA, initiative, prediction, rangePhase };
}
