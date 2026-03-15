import { useState, useMemo, useCallback } from "react";
import type { MonsterBase } from "../types/game";
import {
  calcScaledExp,
  calcExpPerRun,
  calcExpPerHour,
  calcTimeForExp,
  type MonsterExpEntry,
} from "../utils/expCalc";
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
  level: number;
  count: number;
}

let nextId = 1;

export function FarmCalculator() {
  const [monsterRows, setMonsterRows] = useState<MonsterRow[]>([]);
  const [secondsPerRun, setSecondsPerRun] = usePersistedState("farm:seconds", "60");
  const [expBonus, setExpBonus] = usePersistedState("farm:expBonus", "0");
  const [goldBonus, setGoldBonus] = usePersistedState("farm:goldBonus", "0");
  const [remainingExp, setRemainingExp] = usePersistedState("farm:remaining", "");

  const [pendingCount, setPendingCount] = useState("1");
  const [selectorKey, setSelectorKey] = useState(0);

  const handleMonsterPick = useCallback(
    (monster: MonsterBase, level: number) => {
      setMonsterRows((prev) => [
        ...prev,
        {
          id: nextId++,
          monster,
          level,
          count: parseInt(pendingCount) || 1,
        },
      ]);
      setSelectorKey((k) => k + 1);
    },
    [pendingCount]
  );

  const removeMonster = (id: number) => {
    setMonsterRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: number, field: "level" | "count", value: string) => {
    const num = parseInt(value) || 1;
    setMonsterRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: num } : r))
    );
  };

  const expEntries: MonsterExpEntry[] = useMemo(
    () =>
      monsterRows.map((r) => ({
        name: r.monster.name,
        baseExp: r.monster.exp,
        level: r.level,
        count: r.count,
      })),
    [monsterRows]
  );

  const goldEntries: MonsterGoldEntry[] = useMemo(
    () =>
      monsterRows.map((r) => ({
        name: r.monster.name,
        gold: r.monster.gold,
        count: r.count,
      })),
    [monsterRows]
  );

  const secondsNum = parseInt(secondsPerRun) || 0;
  const expBonusNum = parseInt(expBonus) || 0;
  const goldBonusNum = parseInt(goldBonus) || 0;

  const expPerRun = useMemo(() => calcExpPerRun(expEntries), [expEntries]);
  const goldPerRun = useMemo(() => calcGoldPerRun(goldEntries), [goldEntries]);

  const expPerHour = useMemo(
    () => calcExpPerHour(expPerRun, secondsNum, expBonusNum),
    [expPerRun, secondsNum, expBonusNum]
  );
  const goldPerHour = useMemo(
    () => calcGoldPerHour(goldPerRun, secondsNum, goldBonusNum),
    [goldPerRun, secondsNum, goldBonusNum]
  );

  const remainingExpNum = parseInt(remainingExp) || 0;
  const timeToGoal = useMemo(
    () => calcTimeForExp(remainingExpNum, expPerHour),
    [remainingExpNum, expPerHour]
  );

  return (
    <div className="max-w-lg mx-auto space-y-6 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start">
      {/* ヘッダー */}
      <div className="text-center space-y-1 lg:col-span-2 lg:flex lg:items-baseline lg:gap-3 lg:justify-center lg:space-y-0">
        <h2 className="text-2xl font-bold text-gray-800">周回計算機</h2>
        <p className="text-sm text-gray-500">EXP・ゴールド効率を同時に計算</p>
      </div>

      {/* Column 1: モンスター追加 */}
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 lg:p-4 space-y-4">
        <InputField
          label="1周あたりの討伐数"
          value={pendingCount}
          onChange={setPendingCount}
          placeholder="1"
        />
        <MonsterSelector
          key={selectorKey}
          onSelect={() => {}}
          onMonsterPick={handleMonsterPick}
        />

        {/* モンスターリスト */}
        {monsterRows.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-600">
              モンスターリスト
            </h4>
            {monsterRows.map((row) => {
              const scaledExp = calcScaledExp(row.monster.exp, row.level);
              return (
                <div
                  key={row.id}
                  className="py-2 px-3 bg-gray-50 rounded-lg space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {row.monster.name}
                    </span>
                    <button
                      onClick={() => removeMonster(row.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                      Lv
                      <input
                        type="number"
                        min="1"
                        value={row.level}
                        onChange={(e) => updateRow(row.id, "level", e.target.value)}
                        className="w-14 px-1.5 py-0.5 bg-white border border-gray-200 rounded-lg text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                      ×
                      <input
                        type="number"
                        min="1"
                        value={row.count}
                        onChange={(e) => updateRow(row.id, "count", e.target.value)}
                        className="w-14 px-1.5 py-0.5 bg-white border border-gray-200 rounded-lg text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </label>
                    <span className="text-xs font-bold text-indigo-600 ml-auto">
                      {(scaledExp * row.count).toLocaleString()} EXP
                    </span>
                    <span className="text-xs font-bold text-yellow-600">
                      {(row.monster.gold * row.count).toLocaleString()} G
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Column 2: 周回設定 + 結果 */}
      <div className="space-y-4 lg:space-y-2">
        {/* 周回設定 */}
        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 lg:p-4 space-y-4 lg:space-y-3">
          <h3 className="font-semibold text-gray-800">周回設定</h3>
          <div className="grid grid-cols-3 gap-4 lg:gap-2">
            <InputField
              label="1周の秒数"
              value={secondsPerRun}
              onChange={setSecondsPerRun}
              placeholder="60"
            />
            <InputField
              label="EXPボーナス(%)"
              value={expBonus}
              onChange={setExpBonus}
              placeholder="0"
            />
            <InputField
              label="ゴールドボーナス(%)"
              value={goldBonus}
              onChange={setGoldBonus}
              placeholder="0"
            />
          </div>
          <InputField
            label="残り必要経験値"
            value={remainingExp}
            onChange={setRemainingExp}
            placeholder="手入力"
          />
        </div>

        {/* 結果 */}
        {monsterRows.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:gap-2">
            <StatCard title="経験値効率" accent="indigo">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-gray-500">1周EXP</span>
                  <span className="text-lg font-bold text-indigo-600">
                    {expPerRun.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-gray-500">時給EXP</span>
                  <span className="text-lg font-bold text-indigo-600">
                    {expPerHour.toLocaleString()}
                  </span>
                </div>
                {remainingExpNum > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-500">目標到達時間</span>
                    <span className="text-lg font-bold text-green-600">
                      {timeToGoal}
                    </span>
                  </div>
                )}
              </div>
            </StatCard>
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
        ) : (
          <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">
              モンスターを追加すると計算結果が表示されます
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
