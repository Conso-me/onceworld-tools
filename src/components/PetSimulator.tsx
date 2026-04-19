import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedState, usePersistedGroup } from "../hooks/usePersistedState";
import { calcPetStats, findEquivalentLevels, DEFAULT_PET_DAMAGE_CONFIG } from "../utils/petStatCalc";
import type { PetDamageConfig } from "../types/game";
import { useAllMonsters } from "../hooks/useAllMonsters";
import { PetConfigPanel } from "./damage/PetConfigPanel";

// ── Constants ─────────────────────────────────────────────────────────────────

const STAT_DISPLAY = [
  { key: "vit" as const, label: "VIT" },
  { key: "spd" as const, label: "SPD" },
  { key: "atk" as const, label: "ATK" },
  { key: "int" as const, label: "INT" },
  { key: "def" as const, label: "DEF" },
  { key: "mdef" as const, label: "M-DEF" },
  { key: "luck" as const, label: "LUCK" },
];

// ── Comparison Table ──────────────────────────────────────────────────────────

type StatKey = typeof STAT_DISPLAY[number]["key"];

function PetCompareTable({
  resultA,
  resultB,
}: {
  resultA: ReturnType<typeof calcPetStats>;
  resultB: ReturnType<typeof calcPetStats>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <th className="text-left px-3 py-2 border border-gray-100 sticky left-0 bg-gray-50 z-10">ステータス</th>
            <th className="text-right px-3 py-2 border border-gray-100 text-blue-600">設定 A</th>
            <th className="text-right px-3 py-2 border border-gray-100 text-orange-500">設定 B</th>
            <th className="text-right px-3 py-2 border border-gray-100">差分</th>
          </tr>
        </thead>
        <tbody>
          {STAT_DISPLAY.map(({ key, label }) => {
            const a = resultA.final[key];
            const b = resultB.final[key];
            const diff = b - a;
            return (
              <tr key={key} className="group even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                <td className="px-3 py-1.5 border border-gray-100 font-medium text-gray-600 sticky left-0 bg-white group-even:bg-gray-50/50 group-hover:bg-gray-100/50 z-10">{label}</td>
                <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-blue-700 font-medium">{a.toLocaleString()}</td>
                <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-orange-600 font-medium">{b.toLocaleString()}</td>
                <td className={`px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                </td>
              </tr>
            );
          })}
          {(() => {
            const diff = resultB.hp - resultA.hp;
            return (
              <tr className="group even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                <td className="px-3 py-1.5 border border-gray-100 font-medium text-red-600 sticky left-0 bg-white z-10">HP</td>
                <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-blue-700 font-medium">{resultA.hp.toLocaleString()}</td>
                <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-orange-600 font-medium">{resultB.hp.toLocaleString()}</td>
                <td className={`px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                </td>
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}

// ── Equivalent Level Table ────────────────────────────────────────────────────

function EquivalentLevelTable({
  resultA,
  eqLevels,
  currentLevelB,
}: {
  resultA: ReturnType<typeof calcPetStats>;
  eqLevels: Record<StatKey, number | null>;
  currentLevelB: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        設定 A の各ステータスに、設定 B が追いつく最低レベル
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="text-left px-3 py-2 border border-gray-100 sticky left-0 bg-gray-50 z-10">ステータス</th>
              <th className="text-right px-3 py-2 border border-gray-100 text-blue-600">A の値</th>
              <th className="text-right px-3 py-2 border border-gray-100 text-orange-500">B の追いつきLv</th>
            </tr>
          </thead>
          <tbody>
            {STAT_DISPLAY.map(({ key, label }) => {
              const eqLv = eqLevels[key];
              const targetVal = resultA.final[key];
              const isAlreadyAchieved = eqLv !== null && eqLv <= currentLevelB;
              return (
                <tr key={key} className="group even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                  <td className="px-3 py-1.5 border border-gray-100 font-medium text-gray-600 sticky left-0 bg-white group-even:bg-gray-50/50 group-hover:bg-gray-100/50 z-10">{label}</td>
                  <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-blue-700 font-medium">{targetVal.toLocaleString()}</td>
                  <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold">
                    {eqLv === null ? (
                      <span className="text-red-400">Lv.1200でも届かない</span>
                    ) : isAlreadyAchieved ? (
                      <span className="text-green-600">達成済み (Lv.{eqLv.toLocaleString()})</span>
                    ) : (
                      <span className="text-orange-600">Lv.{eqLv.toLocaleString()}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Single Stat Panel ─────────────────────────────────────────────────────────

function PetStatPanel({ result, label }: { result: ReturnType<typeof calcPetStats>; label: string }) {
  const { t: tGame } = useTranslation("game");
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {tGame(`element.${result.element}`)} / {tGame(`attackType.${result.attackMode}`)}
        </span>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <th className="text-left px-3 py-2 border border-gray-100">ステータス</th>
            <th className="text-right px-3 py-2 border border-gray-100">値</th>
          </tr>
        </thead>
        <tbody>
          {STAT_DISPLAY.map(({ key, label: statLabel }) => (
            <tr key={key} className="even:bg-gray-50/50">
              <td className="px-3 py-1.5 border border-gray-100 font-medium text-gray-600">{statLabel}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold text-blue-700">{result.final[key].toLocaleString()}</td>
            </tr>
          ))}
          <tr className="bg-red-50/60">
            <td className="px-3 py-1.5 border border-gray-100 font-medium text-red-600">HP</td>
            <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold text-red-600">{result.hp.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PetSimulator() {
  type PetCfgTuple = [PetDamageConfig, <K extends keyof PetDamageConfig>(field: K, value: PetDamageConfig[K]) => void, () => void, (s: PetDamageConfig) => void];
  const [cfgA, setFieldA, resetA, replaceAllA] = usePersistedGroup<PetDamageConfig & Record<string, unknown>>(
    "pet-sim:a",
    DEFAULT_PET_DAMAGE_CONFIG as PetDamageConfig & Record<string, unknown>,
  ) as unknown as PetCfgTuple;
  const [cfgB, setFieldB, resetB, replaceAllB] = usePersistedGroup<PetDamageConfig & Record<string, unknown>>(
    "pet-sim:b",
    DEFAULT_PET_DAMAGE_CONFIG as PetDamageConfig & Record<string, unknown>,
  ) as unknown as PetCfgTuple;
  const [activeConfig, setActiveConfig] = usePersistedState<"A" | "B">("pet-sim:active", "A");

  const allMonsters = useAllMonsters();

  const monsterA = useMemo(
    () => (cfgA.petMonsterName ? allMonsters.find((m) => m.name === cfgA.petMonsterName) ?? null : null),
    [cfgA.petMonsterName, allMonsters],
  );
  const monsterB = useMemo(
    () => (cfgB.petMonsterName ? allMonsters.find((m) => m.name === cfgB.petMonsterName) ?? null : null),
    [cfgB.petMonsterName, allMonsters],
  );

  const resultA = useMemo(() => (monsterA ? calcPetStats(cfgA, monsterA) : null), [cfgA, monsterA]);
  const resultB = useMemo(() => (monsterB ? calcPetStats(cfgB, monsterB) : null), [cfgB, monsterB]);

  const eqLevels = useMemo(() => {
    if (!resultA || !monsterB) return null;
    return findEquivalentLevels(resultA, cfgB, monsterB);
  }, [resultA, cfgB, monsterB]);

  const activeCfg = activeConfig === "A" ? cfgA : cfgB;
  const activeSetField = activeConfig === "A" ? setFieldA : setFieldB;
  const activeReset = activeConfig === "A" ? resetA : resetB;
  const activeReplaceAll = activeConfig === "A" ? replaceAllA : replaceAllB;
  const activeResult = activeConfig === "A" ? resultA : resultB;

  const showCompare = resultA !== null && resultB !== null;
  const showEqLevels = resultA !== null && resultB !== null && eqLevels !== null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-6">
      {/* 左パネル（入力） */}
      <div className="space-y-4">
        {/* A/B 設定タブ */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {(["A", "B"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setActiveConfig(id)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                activeConfig === id
                  ? id === "A"
                    ? "bg-blue-500 text-white"
                    : "bg-orange-400 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              設定 {id}
            </button>
          ))}
        </div>

        <PetConfigPanel
          config={activeCfg}
          setField={activeSetField}
          reset={activeReset}
          petResult={activeResult}
          replaceConfig={activeReplaceAll}
          showPetStats
        />
      </div>

      {/* 右パネル（結果） */}
      <div className="mt-6 lg:mt-0 space-y-4">
        {showCompare ? (
          <>
            {/* 比較テーブル */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h2 className="text-base font-bold text-gray-700">ステータス比較</h2>
              <PetCompareTable resultA={resultA} resultB={resultB} />
            </div>

            {/* 追いつきレベル */}
            {showEqLevels && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h2 className="text-base font-bold text-gray-700">追いつきレベル（A→B）</h2>
                <EquivalentLevelTable
                  resultA={resultA}
                  eqLevels={eqLevels}
                  currentLevelB={cfgB.petLevel}
                />
              </div>
            )}

            {/* 個別詳細（比較中も表示） */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                <PetStatPanel result={resultA} label="設定 A の詳細" />
              </div>
              <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
                <PetStatPanel result={resultB} label="設定 B の詳細" />
              </div>
            </div>
          </>
        ) : activeResult ? (
          /* 片方のみ設定済み */
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <PetStatPanel
              result={activeResult}
              label={`設定 ${activeConfig} のステータス`}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            ペットを選択してください
          </div>
        )}
      </div>
    </div>
  );
}
