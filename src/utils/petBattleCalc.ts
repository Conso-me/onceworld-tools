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
  note: "simultaneous" | "stalemate" | null;
}

export interface PetBattleResult {
  aToB: AttackOutcome;
  bToA: AttackOutcome;
  initiative: InitiativeWinner;
  prediction: BattlePrediction;
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
  const aKillsIn = aToB.hitsToKill.worst;
  const bKillsIn = bToA.hitsToKill.worst;

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

export function calcPetBattleResult(
  a: PetStatResult,
  b: PetStatResult,
): PetBattleResult {
  const aToB = calcAttackOutcome(a, b);
  const bToA = calcAttackOutcome(b, a);
  const initiative = calcInitiative(
    a.final.spd,
    a.final.luck,
    b.final.spd,
    b.final.luck,
  );
  const prediction = predictWinner(aToB, bToA, initiative);
  return { aToB, bToA, initiative, prediction };
}
