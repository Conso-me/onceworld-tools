/**
 * 一括テキスト入力をパースしてチームデータに変換する
 *
 * フォーマット:
 *   A
 *   モンスター名, 500
 *   モンスター名, 300
 *   B
 *   モンスター名, 200
 *   C
 *   モンスター名, 100
 *
 * - A/B/C 単独行でチーム切替
 * - 各行 `名前, レベル`（レベル省略時は1）
 * - getMonsterByName() で完全一致 → searchMonsters() で部分一致フォールバック
 */

import type { MonsterBase } from "../types/game";
import { getMonsterByName, searchMonsters } from "../data/monsters";

export type TeamId = "A" | "B" | "C";

export interface ParsedSlot {
  monster: MonsterBase | null;
  level: number;
  rawName: string;
  error?: string; // モンスター名が見つからない場合のエラーメッセージ
}

export interface ParsedTeamResult {
  teams: Record<TeamId, ParsedSlot[]>;
  errors: string[];
}

function resolveMonster(name: string): { monster: MonsterBase | null; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { monster: null };

  // 完全一致
  const exact = getMonsterByName(trimmed);
  if (exact) return { monster: exact };

  // 部分一致フォールバック
  const matches = searchMonsters(trimmed);
  if (matches.length === 1) return { monster: matches[0] };
  if (matches.length > 1) {
    return {
      monster: null,
      error: `「${trimmed}」に複数の候補: ${matches.slice(0, 3).map((m) => m.name).join(", ")}${matches.length > 3 ? "..." : ""}`,
    };
  }

  return { monster: null, error: `「${trimmed}」が見つかりません` };
}

export function parseTeamInput(text: string): ParsedTeamResult {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const teams: Record<TeamId, ParsedSlot[]> = { A: [], B: [], C: [] };
  const errors: string[] = [];
  let currentTeam: TeamId = "A";

  for (const line of lines) {
    // チーム切替: 単独の A/B/C（大文字小文字無視）
    const teamMatch = line.match(/^([ABCabc])$/);
    if (teamMatch) {
      currentTeam = teamMatch[1].toUpperCase() as TeamId;
      continue;
    }

    // モンスター行: 名前, レベル
    const parts = line.split(",").map((p) => p.trim());
    const rawName = parts[0];
    const levelStr = parts[1];
    const level = levelStr ? parseInt(levelStr, 10) : 1;

    if (isNaN(level) || level < 1) {
      errors.push(`「${line}」: レベルが不正です`);
      continue;
    }

    if (teams[currentTeam].length >= 4) {
      errors.push(`チーム${currentTeam}: 最大4体を超えています（「${rawName}」をスキップ）`);
      continue;
    }

    const { monster, error } = resolveMonster(rawName);
    const slot: ParsedSlot = { monster, level, rawName };
    if (error) {
      slot.error = error;
      errors.push(error);
    }
    teams[currentTeam].push(slot);
  }

  return { teams, errors };
}
