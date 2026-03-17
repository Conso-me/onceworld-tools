/**
 * アリーナ ミニゲーム バトルシミュレーション
 *
 * 3チーム(A/B/C)各1-4体のモンスターが戦うミニゲームを
 * モンテカルロ法でシミュレーションし、各チームの勝率を算出する。
 */

import type { MonsterBase, ScaledMonster } from "../types/game";
import { scaleMonster } from "./monsterScaling";
import {
  calcPhysicalDamage,
  calcPetMagicDamage,
  calcMultiHitCount,
  calcHitRate,
} from "./damageCalc";
import { getElementAffinity } from "../data/elements";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TeamEntry {
  monster: MonsterBase;
  level: number;
}

export type TeamId = "A" | "B" | "C";

export interface BattleConfig {
  teams: Record<TeamId, TeamEntry[]>;
  iterations: number; // デフォルト 1000
}

export interface BattleResult {
  winRates: Record<TeamId, number>; // 0-100
  avgTurns: number;
  timeoutRate: number; // 0-100
}

// ─── Internal state ─────────────────────────────────────────────────────────

interface Combatant {
  team: TeamId;
  index: number;
  scaled: ScaledMonster;
  currentHp: number;
}

const MAX_TURNS = 100;

// ─── Simulation ─────────────────────────────────────────────────────────────

export function runBattleSimulation(config: BattleConfig): BattleResult {
  const { teams, iterations } = config;
  const wins: Record<TeamId, number> = { A: 0, B: 0, C: 0 };
  let totalTurns = 0;
  let timeouts = 0;

  for (let i = 0; i < iterations; i++) {
    const result = simulateOneBattle(teams);
    wins[result.winner]++;
    totalTurns += result.turns;
    if (result.timedOut) timeouts++;
  }

  return {
    winRates: {
      A: Math.round((wins.A / iterations) * 1000) / 10,
      B: Math.round((wins.B / iterations) * 1000) / 10,
      C: Math.round((wins.C / iterations) * 1000) / 10,
    },
    avgTurns: Math.round((totalTurns / iterations) * 10) / 10,
    timeoutRate: Math.round((timeouts / iterations) * 1000) / 10,
  };
}

function simulateOneBattle(teams: Record<TeamId, TeamEntry[]>): {
  winner: TeamId;
  turns: number;
  timedOut: boolean;
} {
  // 全モンスターをスケーリングしてコンバタント配列を作成
  const combatants: Combatant[] = [];
  for (const teamId of ["A", "B", "C"] as TeamId[]) {
    for (let idx = 0; idx < teams[teamId].length; idx++) {
      const entry = teams[teamId][idx];
      const scaled = scaleMonster(entry.monster, entry.level);
      combatants.push({
        team: teamId,
        index: idx,
        scaled,
        currentHp: scaled.hp,
      });
    }
  }

  let turn = 0;

  while (turn < MAX_TURNS) {
    turn++;

    // SPD降順ソート（同値はランダム）
    const alive = combatants.filter((c) => c.currentHp > 0);
    alive.sort((a, b) => {
      const diff = b.scaled.scaledSpd - a.scaled.scaledSpd;
      if (diff !== 0) return diff;
      return Math.random() - 0.5;
    });

    for (const attacker of alive) {
      if (attacker.currentHp <= 0) continue;

      // 他チームの生存モンスターを取得
      const enemies = combatants.filter(
        (c) => c.currentHp > 0 && c.team !== attacker.team
      );
      if (enemies.length === 0) break;

      // ランダムにターゲット選択
      const target = enemies[Math.floor(Math.random() * enemies.length)];

      // 命中判定（物理攻撃のみ）
      const isPhysical = attacker.scaled.attackType === "物理";
      if (isPhysical) {
        const hitRate = calcHitRate(
          attacker.scaled.scaledLuck,
          target.scaled.scaledLuck
        );
        if (Math.random() * 100 >= hitRate) continue; // ミス
      }

      // ダメージ計算
      const elementAffinity = getElementAffinity(
        attacker.scaled.element,
        target.scaled.element
      );

      const damageRange = isPhysical
        ? calcPhysicalDamage(
            attacker.scaled.scaledAtk,
            target.scaled.scaledDef,
            target.scaled.scaledMdef,
            elementAffinity
          )
        : calcPetMagicDamage(
            attacker.scaled.scaledInt,
            target.scaled.scaledDef,
            target.scaled.scaledMdef,
            elementAffinity
          );

      // 多段攻撃
      const hitCount = calcMultiHitCount(attacker.scaled.scaledSpd, false);

      // ダメージ適用（各ヒットで0.9-1.1のランダムロール）
      let totalDamage = 0;
      for (let h = 0; h < hitCount; h++) {
        const roll = 0.9 + Math.random() * 0.2;
        // damageRangeのavg（base値）をロール倍率で再計算
        // min=base*0.9, max=base*1.1 なので avg=base
        const dmg = damageRange.isNullified
          ? Math.floor(1 + Math.random() * 9)
          : Math.floor(damageRange.avg * (roll / 1.0));
        totalDamage += Math.max(dmg, 1);
      }

      target.currentHp -= totalDamage;
    }

    // ターン終了後の勝利判定
    const survivingTeams = new Set(
      combatants.filter((c) => c.currentHp > 0).map((c) => c.team)
    );

    if (survivingTeams.size === 1) {
      return {
        winner: [...survivingTeams][0],
        turns: turn,
        timedOut: false,
      };
    }
    if (survivingTeams.size === 0) {
      return { winner: "A", turns: turn, timedOut: false };
    }
  }

  // タイムアウト: 残HP割合 → 平均レベルが低い → チームA
  return {
    winner: resolveTimeout(combatants, teams),
    turns: MAX_TURNS,
    timedOut: true,
  };
}

function resolveTimeout(
  combatants: Combatant[],
  teams: Record<TeamId, TeamEntry[]>
): TeamId {
  const teamIds: TeamId[] = ["A", "B", "C"];

  // 生存チームのみ対象
  const survivingTeams = teamIds.filter((tid) =>
    combatants.some((c) => c.team === tid && c.currentHp > 0)
  );
  if (survivingTeams.length === 0) return "A";
  if (survivingTeams.length === 1) return survivingTeams[0];

  // 残HP割合で比較
  const hpRatios: Record<TeamId, number> = { A: 0, B: 0, C: 0 };
  for (const tid of survivingTeams) {
    const teamMembers = combatants.filter((c) => c.team === tid);
    const totalMaxHp = teamMembers.reduce((sum, c) => sum + c.scaled.hp, 0);
    const totalCurrentHp = teamMembers.reduce(
      (sum, c) => sum + Math.max(c.currentHp, 0),
      0
    );
    hpRatios[tid] = totalMaxHp > 0 ? totalCurrentHp / totalMaxHp : 0;
  }

  const maxHpRatio = Math.max(...survivingTeams.map((tid) => hpRatios[tid]));
  const bestByHp = survivingTeams.filter(
    (tid) => Math.abs(hpRatios[tid] - maxHpRatio) < 0.001
  );
  if (bestByHp.length === 1) return bestByHp[0];

  // 同率なら平均レベルが低いチーム
  const avgLevels: Record<TeamId, number> = { A: 0, B: 0, C: 0 };
  for (const tid of bestByHp) {
    const entries = teams[tid];
    avgLevels[tid] =
      entries.reduce((sum, e) => sum + e.level, 0) / entries.length;
  }
  const minLvl = Math.min(...bestByHp.map((tid) => avgLevels[tid]));
  const bestByLvl = bestByHp.filter(
    (tid) => Math.abs(avgLevels[tid] - minLvl) < 0.001
  );
  if (bestByLvl.length === 1) return bestByLvl[0];

  // それでも同率ならチームA
  return bestByLvl.includes("A")
    ? "A"
    : bestByLvl.includes("B")
      ? "B"
      : "C";
}
