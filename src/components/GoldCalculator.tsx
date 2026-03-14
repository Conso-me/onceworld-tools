import { useState, useMemo, useCallback } from "react";
import type { MonsterBase } from "../types/game";
import {
  calcGoldPerRun,
  calcGoldPerHour,
  type MonsterGoldEntry,
} from "../utils/goldCalc";
import { usePersistedState } from "../hooks/usePersistedState";
import { InputField } from "./ui/InputField";
import { StatCard } from "./ui/StatCard";
import { MonsterSelector } from "./ui/MonsterSelector";

interface MonsterRow {
  id: number;
  monster: MonsterBase;
  count: number;
}

let nextId = 1;

export function GoldCalculator() {
  const [monsterRows, setMonsterRows] = useState<MonsterRow[]>([]);
  const [secondsPerRun, setSecondsPerRun] = usePersistedState("gold:seconds", "60");
  const [goldBonus, setGoldBonus] = usePersistedState("gold:bonus", "0");

  const [pendingMonster, setPendingMonster] = useState<MonsterBase | null>(null);
  const [pendingCount, setPendingCount] = useState("1");

  const handleSelectMonster = useCallback(
    (monster: MonsterBase, _level: number) => {
      setPendingMonster(monster);
    },
    []
  );

  const addMonster = () => {
    if (!pendingMonster) return;
    setMonsterRows((prev) => [
      ...prev,
      {
        id: nextId++,
        monster: pendingMonster,
        count: parseInt(pendingCount) || 1,
      },
    ]);
  };

  const removeMonster = (id: number) => {
    setMonsterRows((prev) => prev.filter((r) => r.id !== id));
  };

  const entries: MonsterGoldEntry[] = useMemo(
    () =>
      monsterRows.map((r) => ({
        name: r.monster.name,
        gold: r.monster.gold,
        count: r.count,
      })),
    [monsterRows]
  );

  const goldPerRun = useMemo(() => calcGoldPerRun(entries), [entries]);
  const secondsNum = parseInt(secondsPerRun) || 0;
  const goldBonusNum = parseInt(goldBonus) || 0;

  const goldPerHour = useMemo(
    () => calcGoldPerHour(goldPerRun, secondsNum, goldBonusNum),
    [goldPerRun, secondsNum, goldBonusNum]
  );

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-gray-800">金策計算機</h2>
        <p className="text-sm text-gray-500">
          ゴールド効率・時給ゴールドを計算
        </p>
      </div>

      {/* モンスター追加 */}
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 space-y-4">
        <MonsterSelector
          onSelect={handleSelectMonster}
          selectedMonster={pendingMonster}
        />
        <div className="flex items-end gap-3">
          <InputField
            label="1周あたりの討伐数"
            value={pendingCount}
            onChange={setPendingCount}
            placeholder="1"
            className="flex-1"
          />
          <button
            onClick={addMonster}
            disabled={!pendingMonster}
            className="px-5 py-3 bg-indigo-500 text-white rounded-xl font-medium text-sm hover:bg-indigo-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            追加
          </button>
        </div>

        {monsterRows.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-600">
              モンスターリスト
            </h4>
            {monsterRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700">
                    {row.monster.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    ×{row.count}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-yellow-600">
                    {(row.monster.gold * row.count).toLocaleString()} G
                  </span>
                  <button
                    onClick={() => removeMonster(row.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 周回設定 */}
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">周回設定</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="1周の秒数"
            value={secondsPerRun}
            onChange={setSecondsPerRun}
            placeholder="60"
          />
          <InputField
            label="ゴールドボーナス(%)"
            value={goldBonus}
            onChange={setGoldBonus}
            placeholder="0"
          />
        </div>
      </div>

      {/* 結果 */}
      {monsterRows.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700 px-1">計算結果</h3>
          <StatCard title="ゴールド効率" accent="green">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                <span className="text-sm text-gray-500">1周ゴールド</span>
                <span className="text-lg font-bold text-yellow-600">
                  {goldPerRun.toLocaleString()} G
                </span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                <span className="text-sm text-gray-500">時給ゴールド</span>
                <span className="text-lg font-bold text-yellow-600">
                  {goldPerHour.toLocaleString()} G
                </span>
              </div>
            </div>
          </StatCard>
        </div>
      )}
    </div>
  );
}
