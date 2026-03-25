import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { MonsterBase } from "../types/game";
import {
  calcScaledExp,
  calcExpPerRun,
  calcExpPerHour,
  calcTimeForExp,
  type MonsterExpEntry,
} from "../utils/expCalc";
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

export function ExpCalculator() {
  const { t } = useTranslation("farm");
  const [monsterRows, setMonsterRows] = useState<MonsterRow[]>([]);
  const [secondsPerRun, setSecondsPerRun] = usePersistedState("exp:seconds", "60");
  const [expBonus, setExpBonus] = usePersistedState("exp:bonus", "0");
  const [remainingExp, setRemainingExp] = usePersistedState("exp:remaining", "");

  const [pendingMonster, setPendingMonster] = useState<MonsterBase | null>(null);
  const [pendingLevel, setPendingLevel] = useState<number>(1);
  const [pendingCount, setPendingCount] = useState("1");

  const handleSelectMonster = useCallback(
    (monster: MonsterBase, level: number) => {
      setPendingMonster(monster);
      setPendingLevel(level);
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
        level: pendingLevel,
        count: parseInt(pendingCount) || 1,
      },
    ]);
  };

  const removeMonster = (id: number) => {
    setMonsterRows((prev) => prev.filter((r) => r.id !== id));
  };

  const entries: MonsterExpEntry[] = useMemo(
    () =>
      monsterRows.map((r) => ({
        name: r.monster.name,
        baseExp: r.monster.exp,
        level: r.level,
        count: r.count,
      })),
    [monsterRows]
  );

  const expPerRun = useMemo(() => calcExpPerRun(entries), [entries]);

  const secondsNum = parseInt(secondsPerRun) || 0;
  const expBonusNum = parseInt(expBonus) || 0;

  const expPerHour = useMemo(
    () => calcExpPerHour(expPerRun, secondsNum, expBonusNum),
    [expPerRun, secondsNum, expBonusNum]
  );

  const remainingExpNum = parseInt(remainingExp) || 0;
  const timeToGoal = useMemo(
    () => calcTimeForExp(remainingExpNum, expPerHour),
    [remainingExpNum, expPerHour]
  );

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* モンスター追加 */}
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 space-y-4">
        <MonsterSelector
          onSelect={handleSelectMonster}
          selectedMonster={pendingMonster}
        />
        <div className="flex items-end gap-3">
          <InputField
            label={t("killsPerRun")}
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
            {t("common:add")}
          </button>
        </div>

        {/* モンスターリスト */}
        {monsterRows.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-600">
              {t("common:monsterList")}
            </h4>
            {monsterRows.map((row) => {
              const scaledExp = calcScaledExp(row.monster.exp, row.level);
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">
                      {row.monster.name}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      Lv{row.level}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      ×{row.count}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-indigo-600">
                      {(scaledExp * row.count).toLocaleString()} EXP
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
              );
            })}
          </div>
        )}
      </div>

      {/* 周回設定 */}
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">{t("farmSettings")}</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label={t("secondsPerRun")}
            value={secondsPerRun}
            onChange={setSecondsPerRun}
            placeholder="60"
          />
          <InputField
            label={t("expBonusLabel")}
            value={expBonus}
            onChange={setExpBonus}
            placeholder="0"
          />
        </div>
        <InputField
          label={t("remainingExpLabel")}
          value={remainingExp}
          onChange={setRemainingExp}
          placeholder={t("manualInput")}
        />
      </div>

      {/* 結果 */}
      {monsterRows.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700 px-1">{t("common:results")}</h3>
          <StatCard title={t("expEfficiency")} accent="indigo">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                <span className="text-sm text-gray-500">{t("expPerRun")}</span>
                <span className="text-lg font-bold text-indigo-600">
                  {expPerRun.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                <span className="text-sm text-gray-500">{t("expPerHour")}</span>
                <span className="text-lg font-bold text-indigo-600">
                  {expPerHour.toLocaleString()}
                </span>
              </div>
              {remainingExpNum > 0 && (
                <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-gray-500">{t("timeToGoal")}</span>
                  <span className="text-lg font-bold text-green-600">
                    {timeToGoal}
                  </span>
                </div>
              )}
            </div>
          </StatCard>
        </div>
      )}
    </div>
  );
}
