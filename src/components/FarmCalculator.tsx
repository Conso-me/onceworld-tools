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
import { getMonsterDropInfo } from "../data/monsterDrops";
import { usePersistedState } from "../hooks/usePersistedState";
import { StatCard } from "./ui/StatCard";
import { MonsterPickerModal } from "./MonsterPickerModal";

interface MonsterRow {
  id: number;
  monster: MonsterBase;
  level: number;
  count: number;
  dropRate: number;
  normalDrop: string;
  rareDrop: string;
  superRareDrop: string;
}

const COMMON_DROPS = [
  { name: "しいたけ",       rate: 0.01,       note: undefined },
  { name: "スターフラワー", rate: 0.001,      note: undefined },
  { name: "属性キノコ",     rate: 0.001,      note: "OVER KILL時" },
  { name: "キングコォーン", rate: 0.0001,     note: undefined },
  { name: "極白花",         rate: 0.000001,   note: undefined },
] as const;

let nextId = 1;

type Rarity = "normal" | "rare" | "superRare";

const RARITY_VALUE_STYLE: Record<Rarity, string> = {
  normal: "text-indigo-600",
  rare: "text-purple-600",
  superRare: "text-orange-500",
};
const RARITY_ORDER: Record<Rarity, number> = { normal: 0, rare: 1, superRare: 2 };

function FormattedNumberInput({
  id, value, onChange, placeholder, className,
}: {
  id?: string; value: string; onChange: (v: string) => void; placeholder?: string; className: string;
}) {
  const num = parseInt(value.replace(/,/g, ""), 10);
  const display = isNaN(num) ? "" : num.toLocaleString("ja-JP");
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9-]/g, ""))}
      placeholder={placeholder}
      className={className}
    />
  );
}

function fmtDrop(n: number): string {
  if (n === 0) return "0";
  if (n >= 1) return n.toFixed(1).replace(/\.0$/, "");
  if (n >= 0.01) return n.toFixed(2);
  return n.toFixed(4);
}

export function FarmCalculator() {
  const [monsterRows, setMonsterRows] = useState<MonsterRow[]>([]);
  const [secondsPerRun, setSecondsPerRun] = usePersistedState("farm:seconds", "60");
  const [expBonus, setExpBonus] = usePersistedState("farm:expBonus", "0");
  const [goldBonus, setGoldBonus] = usePersistedState("farm:goldBonus", "0");
  const [dropBonus, setDropBonus] = usePersistedState("farm:dropBonus", "0");
  const [remainingExp, setRemainingExp] = usePersistedState("farm:remaining", "");

  const [modalOpen, setModalOpen] = useState(false);

  const handleMonsterPick = useCallback((monster: MonsterBase) => {
    const dropInfo = getMonsterDropInfo(monster.name);
    setMonsterRows((prev) => [
      ...prev,
      {
        id: nextId++,
        monster,
        level: 1,
        count: 1,
        dropRate: dropInfo?.baseDropRate ?? 50,
        normalDrop: dropInfo?.normalDrop ?? "",
        rareDrop: dropInfo?.rareDrop ?? "",
        superRareDrop: dropInfo?.superRareDrop ?? "",
      },
    ]);
  }, []);

  const removeMonster = (id: number) => {
    setMonsterRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (
    id: number,
    field: "level" | "count" | "dropRate",
    value: string
  ) => {
    const num = parseFloat(value) || (field === "dropRate" ? 0 : 1);
    setMonsterRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: num } : r))
    );
  };

  const secondsNum = parseInt(secondsPerRun) || 0;
  const expBonusNum = parseInt(expBonus) || 0;
  const goldBonusNum = parseInt(goldBonus) || 0;
  const dropBonusNum = parseInt(dropBonus) || 0;

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
  const dropsByItem = useMemo(() => {
    if (secondsNum <= 0) return [];
    const runsPerHour = 3600 / secondsNum;
    const map = new Map<string, { rarity: Rarity; count: number }>();

    const addItem = (name: string, rarity: Rarity, amount: number) => {
      if (!name) return;
      const prev = map.get(name);
      map.set(name, {
        rarity: prev
          ? RARITY_ORDER[prev.rarity] >= RARITY_ORDER[rarity] ? prev.rarity : rarity
          : rarity,
        count: (prev?.count ?? 0) + amount,
      });
    };

    for (const r of monsterRows) {
      const killsPerHour = r.count * runsPerHour;
      const effectiveRate = Math.min(r.dropRate * (1 + dropBonusNum / 100), 100) / 100;
      addItem(r.normalDrop, "normal", effectiveRate * killsPerHour);
      addItem(r.rareDrop, "rare", (effectiveRate / 10) * killsPerHour);
      addItem(r.superRareDrop, "superRare", (effectiveRate / 100) * killsPerHour);
    }

    return [...map.entries()]
      .map(([name, { rarity, count }]) => ({ name, rarity, count }))
      .sort((a, b) => b.count - a.count);
  }, [monsterRows, secondsNum, dropBonusNum]);

  const commonDropsPerHour = useMemo(() => {
    if (secondsNum <= 0 || monsterRows.length === 0) return [];
    const runsPerHour = 3600 / secondsNum;
    const totalKillsPerHour = monsterRows.reduce((s, r) => s + r.count * runsPerHour, 0);
    const bonusMult = 1 + dropBonusNum / 100;
    return COMMON_DROPS.map((d) => ({
      name: d.name,
      note: d.note,
      count: Math.min(d.rate * bonusMult, 1) * totalKillsPerHour,
    }));
  }, [monsterRows, secondsNum, dropBonusNum]);

  const remainingExpNum = parseInt(remainingExp) || 0;
  const timeToGoal = useMemo(
    () => calcTimeForExp(remainingExpNum, expPerHour),
    [remainingExpNum, expPerHour]
  );

  const hasMonsters = monsterRows.length > 0;

  return (
    <div className="max-w-lg mx-auto space-y-6 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(340px,420px)_1fr] lg:gap-2 lg:items-start">
      {/* ヘッダー */}
      <div className="text-center space-y-1 lg:col-span-2 lg:flex lg:items-baseline lg:gap-3 lg:justify-center lg:space-y-0">
        <h2 className="text-2xl font-bold text-gray-800">周回計算機</h2>
        <p className="text-sm text-gray-500">EXP・ゴールド・素材効率を同時に計算</p>
      </div>

      {/* Column 1: モンスターリスト */}
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 lg:p-4 space-y-4">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-2.5 bg-indigo-500 text-white rounded-xl font-medium text-sm hover:bg-indigo-600 transition-colors"
        >
          ＋ モンスターを追加
        </button>
        {modalOpen && (
          <MonsterPickerModal
            onPick={handleMonsterPick}
            onClose={() => setModalOpen(false)}
          />
        )}

        {hasMonsters && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {monsterRows.map((row) => {
              const scaledExp = calcScaledExp(row.monster.exp, row.level);
              const goldExpected = Math.floor(row.monster.gold * row.count * 0.30);
              const runsPerHour = secondsNum > 0 ? 3600 / secondsNum : 0;
              const effectiveRate = Math.min(row.dropRate * (1 + dropBonusNum / 100), 100) / 100;
              const killsPerHour = row.count * runsPerHour;
              return (
                <div key={row.id} className="py-2 px-3 bg-gray-50 rounded-lg space-y-2">
                  {/* 名前 + 削除 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 truncate">{row.monster.name}</span>
                    <button onClick={() => removeMonster(row.id)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Lv / 討伐数 / ドロップ率 + EXP/Gold */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                      Lv
                      <input type="text" inputMode="numeric" min="1" value={row.level.toLocaleString("ja-JP")}
                        onChange={(e) => updateRow(row.id, "level", e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-14 px-1.5 py-0.5 bg-white border border-gray-200 rounded-lg text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                      ×
                      <input type="text" inputMode="numeric" min="1" value={row.count.toLocaleString("ja-JP")}
                        onChange={(e) => updateRow(row.id, "count", e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-14 px-1.5 py-0.5 bg-white border border-gray-200 rounded-lg text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                      ドロ
                      <input type="number" min="0" max="100" step="0.1" value={row.dropRate}
                        onChange={(e) => updateRow(row.id, "dropRate", e.target.value)}
                        className="w-16 px-1.5 py-0.5 bg-white border border-gray-200 rounded-lg text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />%
                    </label>
                    <span className="text-xs font-bold text-indigo-600 ml-auto">
                      {(scaledExp * row.count).toLocaleString()} EXP
                    </span>
                    <span className="text-xs font-bold text-yellow-600">
                      {goldExpected.toLocaleString()} G
                    </span>
                  </div>

                  {/* ドロップアイテム */}
                  {(row.normalDrop || row.rareDrop || row.superRareDrop) && (
                    <div className="flex flex-col gap-0.5 border-t border-gray-100 pt-1.5">
                      {row.normalDrop && (
                        <div className="flex items-center text-xs gap-1">
                          <span className="text-gray-400 shrink-0 w-12">ノ:</span>
                          <span className="text-gray-700 flex-1 truncate">{row.normalDrop}</span>
                          {runsPerHour > 0 && (
                            <span className="text-indigo-500 shrink-0">{fmtDrop(effectiveRate * killsPerHour)}/h</span>
                          )}
                        </div>
                      )}
                      {row.rareDrop && (
                        <div className="flex items-center text-xs gap-1">
                          <span className="text-purple-400 shrink-0 w-12">レア:</span>
                          <span className="text-gray-700 flex-1 truncate">{row.rareDrop}</span>
                          {runsPerHour > 0 && (
                            <span className="text-purple-500 shrink-0">{fmtDrop((effectiveRate / 10) * killsPerHour)}/h</span>
                          )}
                        </div>
                      )}
                      {row.superRareDrop && (
                        <div className="flex items-center text-xs gap-1">
                          <span className="text-orange-400 shrink-0 w-12">激レア:</span>
                          <span className="text-gray-700 flex-1 truncate">{row.superRareDrop}</span>
                          {runsPerHour > 0 && (
                            <span className="text-orange-500 shrink-0">{fmtDrop((effectiveRate / 100) * killsPerHour)}/h</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Column 2: 周回設定 + 結果 */}
      <div className="space-y-4 lg:space-y-2">
        {/* 周回設定 */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 px-4 py-3 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500">周回設定</h3>
          {/* 3列グリッド: 行をまたいで列位置を揃える */}
          <div className="grid grid-cols-3 gap-x-2 gap-y-2 text-xs items-center">
            <label htmlFor="farm-seconds" className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
              <span className="font-bold text-gray-700 w-24 shrink-0">1周の秒数</span>
              <FormattedNumberInput id="farm-seconds" value={secondsPerRun} onChange={setSecondsPerRun}
                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            </label>
            <label htmlFor="farm-remaining-exp" className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
              <span className="font-bold text-gray-700 w-24 shrink-0">残り必要EXP</span>
              <FormattedNumberInput id="farm-remaining-exp" value={remainingExp} onChange={setRemainingExp}
                placeholder="—"
                className="w-32 px-2 py-1 border border-gray-200 rounded-lg text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            </label>
            <div />
            <label htmlFor="farm-exp-bonus" className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
              <span className="font-bold text-gray-700 w-24 shrink-0">EXPボーナス</span>
              <FormattedNumberInput id="farm-exp-bonus" value={expBonus} onChange={setExpBonus}
                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              <span className="text-gray-400 ml-0.5">%</span>
            </label>
            <label htmlFor="farm-gold-bonus" className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
              <span className="font-bold text-gray-700 w-24 shrink-0">Gボーナス</span>
              <FormattedNumberInput id="farm-gold-bonus" value={goldBonus} onChange={setGoldBonus}
                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              <span className="text-gray-400 ml-0.5">%</span>
            </label>
            <label htmlFor="farm-drop-bonus" className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
              <span className="font-bold text-gray-700 w-24 shrink-0">ドロップボーナス</span>
              <FormattedNumberInput id="farm-drop-bonus" value={dropBonus} onChange={setDropBonus}
                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              <span className="text-gray-400 ml-0.5">%</span>
            </label>
          </div>
        </div>

        {/* 結果 */}
        {hasMonsters ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <StatCard title="経験値効率" accent="indigo">
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-500">1周EXP</span>
                    <span className="text-lg font-bold text-indigo-600">{expPerRun.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-500">時給EXP</span>
                    <span className="text-lg font-bold text-indigo-600">{expPerHour.toLocaleString()}</span>
                  </div>
                  {remainingExpNum > 0 && (
                    <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                      <span className="text-sm text-gray-500">目標到達時間</span>
                      <span className="text-lg font-bold text-green-600">{timeToGoal}</span>
                    </div>
                  )}
                </div>
              </StatCard>
              <StatCard title="ゴールド効率" accent="green">
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-500">1周期待G</span>
                    <span className="text-lg font-bold text-yellow-600">{Math.floor(goldPerRun).toLocaleString()} G</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-500">時給G</span>
                    <span className="text-lg font-bold text-yellow-600">{goldPerHour.toLocaleString()} G</span>
                  </div>
                  <p className="text-xs text-gray-400 px-1">※ ドロップ率30%の期待値</p>
                </div>
              </StatCard>
            </div>
            <StatCard title="素材ドロップ（時給期待値）" accent="purple">
              <div className="grid grid-cols-4 gap-2">
                {(["normal", "rare", "superRare"] as const).map((rarity) => {
                  const items = dropsByItem.filter((d) => d.rarity === rarity);
                  return (
                    <div key={rarity}>
                      <p className={`text-xs font-semibold mb-1.5 ${RARITY_VALUE_STYLE[rarity]}`}>
                        {rarity === "normal" ? "ノーマル" : rarity === "rare" ? "レア" : "激レア"}
                      </p>
                      <div className="space-y-1">
                        {items.length === 0 ? (
                          <p className="text-xs text-gray-300">—</p>
                        ) : (
                          items.map(({ name, count }) => (
                            <div key={name} className="bg-white/60 rounded-lg px-2 py-1.5">
                              <p className="text-xs text-gray-700 truncate" title={name}>{name}</p>
                              <p className={`text-xs font-bold ${RARITY_VALUE_STYLE[rarity]}`}>{fmtDrop(count)}/h</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* 共通素材 */}
                <div>
                  <p className="text-xs font-semibold mb-1.5 text-teal-600">共通</p>
                  <div className="space-y-1">
                    {commonDropsPerHour.map(({ name, note, count }) => (
                      <div key={name} className="bg-white/60 rounded-lg px-2 py-1.5">
                        <p className="text-xs text-gray-700 truncate" title={note ? `${name}（${note}）` : name}>{name}</p>
                        <p className="text-xs font-bold text-teal-600">{fmtDrop(count)}/h</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 px-1 mt-2">
                固有ドロップ率×(1+ボーナス%)で計算。
              </p>
            </StatCard>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">モンスターを追加すると計算結果が表示されます</p>
          </div>
        )}
      </div>
    </div>
  );
}
