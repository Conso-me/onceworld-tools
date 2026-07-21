import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedState } from "../hooks/usePersistedState";
import type { SimConfig, AccessoryItem, PetEntry, Element } from "../types/game";
import { accessories, getPetsByElement, getPetNameEn } from "../data";
import {
  optimizeAccPet,
  accOverridesFor,
  petOverridesFor,
  type AccPetOptResult,
} from "../utils/accPetOptimizer";
import { DEFAULT_WEIGHTS, type StatWeights } from "../utils/equipOptimizer";
import { PageLayout } from "./ui/layout/PageLayout";

const WEIGHT_LABELS: { key: keyof StatWeights; label: string }[] = [
  { key: "vit",  label: "VIT"   },
  { key: "spd",  label: "SPD"   },
  { key: "atk",  label: "ATK"   },
  { key: "int",  label: "INT"   },
  { key: "def",  label: "DEF"   },
  { key: "mdef", label: "M-DEF" },
  { key: "luck", label: "LUK"   },
];

const ELEMENTS: Element[] = ["火", "水", "木", "光", "闇"];

const inputCls =
  "border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";

interface Props {
  cfgA: SimConfig;
  cfgB: SimConfig;
  onApply: (overrides: Partial<SimConfig>, target: "A" | "B") => void;
}

function ResultRow({
  result,
  appliedA,
  appliedB,
  onApply,
  isEn,
}: {
  result: AccPetOptResult;
  appliedA: number | null;
  appliedB: number | null;
  onApply: (r: AccPetOptResult, target: "A" | "B") => void;
  isEn: boolean;
}) {
  const accName = (item: AccessoryItem) => (isEn ? (item.nameEn ?? item.name) : item.name);
  const petName = (item: PetEntry) => (isEn ? (getPetNameEn(item.name) ?? item.name) : item.name);

  return (
    <tr className="group hover:bg-blue-50/40 transition-colors border-b border-gray-100">
      <td className="px-2 py-2 text-center text-xs font-bold text-gray-500 whitespace-nowrap">
        #{result.rank}
      </td>
      {/* アクセ */}
      <td className="px-2 py-2 min-w-[160px]">
        <div className="space-y-0.5">
          {result.accessories.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span className="truncate text-gray-700 max-w-[130px]" title={item.name}>
                {accName(item)}
              </span>
              <span className="text-gray-400 shrink-0">Lv{result.accLevels[i]}</span>
            </div>
          ))}
        </div>
      </td>
      {/* ペット */}
      <td className="px-2 py-2 min-w-[160px]">
        <div className="space-y-0.5">
          {result.pets.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span className="truncate text-gray-700 max-w-[130px]" title={item.name}>
                {petName(item)}
              </span>
              <span className="text-gray-400 shrink-0">Lv{result.petLevels[i]}</span>
            </div>
          ))}
        </div>
      </td>
      {/* 実ステータス */}
      <td className="px-2 py-2">
        <div className="space-y-0.5">
          {(
            [
              { key: "vit",  label: "VIT",   val: result.stats.vit,  cls: "text-orange-500" },
              { key: "spd",  label: "SPD",   val: result.stats.spd,  cls: "text-gray-500"   },
              { key: "atk",  label: "ATK",   val: result.stats.atk,  cls: "text-red-500"    },
              { key: "int",  label: "INT",   val: result.stats.int,  cls: "text-blue-600"   },
              { key: "def",  label: "DEF",   val: result.stats.def,  cls: "text-green-600"  },
              { key: "mdef", label: "M-DEF", val: result.stats.mdef, cls: "text-purple-600" },
              { key: "luck", label: "LUK",   val: result.stats.luck, cls: "text-yellow-600" },
            ] as const
          ).map(({ key, label, val, cls }) => (
            <div key={key} className="flex items-center gap-1.5 text-[10px] whitespace-nowrap">
              <span className={`font-semibold w-10 ${cls}`}>{label}</span>
              <span className="tabular-nums text-gray-600">{val.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </td>
      {/* スコア */}
      <td className="px-2 py-2 text-right text-sm font-bold tabular-nums text-blue-700 whitespace-nowrap">
        {Math.round(result.score).toLocaleString()}
      </td>
      {/* 反映ボタン A/B */}
      <td className="px-2 py-2 text-center">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onApply(result, "A")}
            className={`text-[11px] px-2 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              appliedA === result.rank
                ? "bg-blue-500 text-white"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            A
          </button>
          <button
            onClick={() => onApply(result, "B")}
            className={`text-[11px] px-2 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              appliedB === result.rank
                ? "bg-orange-400 text-white"
                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
            }`}
          >
            B
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AccPetOptimizer({ cfgA, cfgB, onApply }: Props) {
  const { i18n } = useTranslation("status");
  const isEn = i18n.language === "en";

  const [baseTarget, setBaseTarget] = usePersistedState<"A" | "B">("accpet-opt-base", "A");
  const [weights, setWeights] = usePersistedState<StatWeights>("accpet-opt-weights", { ...DEFAULT_WEIGHTS });
  const [excludedAccArr, setExcludedAccArr] = usePersistedState<string[]>("accpet-opt-excluded-acc", []);
  const [excludedPetArr, setExcludedPetArr] = usePersistedState<string[]>("accpet-opt-excluded-pet", []);
  const excludedAcc = useMemo(() => new Set(excludedAccArr), [excludedAccArr]);
  const excludedPets = useMemo(() => new Set(excludedPetArr), [excludedPetArr]);
  const [showExcludeAcc, setShowExcludeAcc] = useState(false);
  const [showExcludePet, setShowExcludePet] = useState(false);
  const [appliedA, setAppliedA] = useState<number | null>(null);
  const [appliedB, setAppliedB] = useState<number | null>(null);

  const baseCfg = baseTarget === "A" ? cfgA : cfgB;
  const petsByElement = useMemo(() => getPetsByElement(), []);

  const results = useMemo(
    () => optimizeAccPet(baseCfg, weights, excludedAcc, excludedPets),
    [baseCfg, weights, excludedAcc, excludedPets],
  );

  function toggleExcludeAcc(name: string) {
    setExcludedAccArr((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function toggleExcludePet(name: string) {
    setExcludedPetArr((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function handleApply(result: AccPetOptResult, target: "A" | "B") {
    const overrides: Partial<SimConfig> = {
      ...accOverridesFor(result.accessories),
      ...petOverridesFor(result.pets),
    };
    onApply(overrides, target);
    if (target === "A") setAppliedA(result.rank);
    else setAppliedB(result.rank);
  }

  return (
    <PageLayout
      leftWidth="narrow"
      left={
      // 左パネル
      <div className="space-y-3">
        {/* 基準にする設定 */}
        <div className="bg-card border border-line rounded-card shadow-sm p-3 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">基準にする設定</h3>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(["A", "B"] as const).map((id) => (
              <button
                key={id}
                onClick={() => setBaseTarget(id)}
                className={`flex-1 py-1.5 text-sm font-semibold transition-colors ${
                  baseTarget === id
                    ? id === "A" ? "bg-blue-500 text-white" : "bg-orange-400 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                設定{id}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">
            装備・振り分けポイント・プロテイン等は設定{baseTarget}の現在値を固定して計算します。
          </p>
        </div>

        {/* 優先度重み */}
        <div className="bg-card border border-line rounded-card shadow-sm p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ステータス優先度</h3>
            <button
              onClick={() =>
                setWeights({ vit: 0, spd: 0, atk: 0, int: 0, def: 0, mdef: 0, luck: 0 })
              }
              className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              リセット
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {WEIGHT_LABELS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-12">{label}</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={weights[key]}
                  onChange={(e) =>
                    setWeights((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))
                  }
                  className={`${inputCls} w-12 text-center`}
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">0 = 重視しない。値が大きいほど優先。</p>
        </div>

        {/* 除外アクセ */}
        <div className="bg-card border border-line rounded-card shadow-sm p-3 space-y-2">
          <button
            onClick={() => setShowExcludeAcc((v) => !v)}
            className="flex items-center justify-between w-full"
          >
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              除外アクセ
              {excludedAcc.size > 0 && (
                <span className="ml-1.5 bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {excludedAcc.size}
                </span>
              )}
            </h3>
            <span className="text-gray-400 text-xs">{showExcludeAcc ? "▲" : "▼"}</span>
          </button>

          {showExcludeAcc && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExcludedAccArr(accessories.map((a) => a.name))}
                  className="text-[11px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-0.5 transition-colors"
                >
                  全除外
                </button>
                <button
                  onClick={() => setExcludedAccArr([])}
                  className="text-[11px] text-red-400 hover:text-red-600 border border-red-100 rounded px-2 py-0.5 transition-colors"
                >
                  リセット
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {accessories.map((item) => {
                  const isExcluded = excludedAcc.has(item.name);
                  return (
                    <button
                      key={item.name}
                      onClick={() => toggleExcludeAcc(item.name)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        isExcluded
                          ? "bg-red-50 border-red-200 text-red-500 line-through"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {isEn ? (item.nameEn ?? item.name) : item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 除外ペット */}
        <div className="bg-card border border-line rounded-card shadow-sm p-3 space-y-2">
          <button
            onClick={() => setShowExcludePet((v) => !v)}
            className="flex items-center justify-between w-full"
          >
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              除外ペット
              {excludedPets.size > 0 && (
                <span className="ml-1.5 bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {excludedPets.size}
                </span>
              )}
            </h3>
            <span className="text-gray-400 text-xs">{showExcludePet ? "▲" : "▼"}</span>
          </button>

          {showExcludePet && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setExcludedPetArr([...petsByElement.values()].flat().map((p) => p.name))
                  }
                  className="text-[11px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-0.5 transition-colors"
                >
                  全除外
                </button>
                <button
                  onClick={() => setExcludedPetArr([])}
                  className="text-[11px] text-red-400 hover:text-red-600 border border-red-100 rounded px-2 py-0.5 transition-colors"
                >
                  リセット
                </button>
              </div>
              {[...ELEMENTS, "不明" as const].map((el) => {
                const list = petsByElement.get(el);
                if (!list || list.length === 0) return null;
                return (
                  <div key={el} className="space-y-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">{el}</p>
                    <div className="flex flex-wrap gap-1">
                      {list.map((pet) => {
                        const isExcluded = excludedPets.has(pet.name);
                        return (
                          <button
                            key={pet.name}
                            onClick={() => toggleExcludePet(pet.name)}
                            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                              isExcluded
                                ? "bg-red-50 border-red-200 text-red-500 line-through"
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {isEn ? (getPetNameEn(pet.name) ?? pet.name) : pet.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      }
      right={
      // 右パネル：結果
      <div>
        <div className="bg-card border border-line rounded-card shadow-sm overflow-hidden h-full">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">最適アクセ・ペットランキング</h3>
            <span className="text-[11px] text-gray-400">アクセ・ペットは最大レベル想定</span>
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              除外が多すぎて候補がありません（アクセ4種・ペット3種以上が必要）
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                    <th className="px-2 py-2 text-center w-8">位</th>
                    <th className="px-2 py-2 text-left">アクセ（4枠）</th>
                    <th className="px-2 py-2 text-left">ペット（3枠）</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">実ステータス</th>
                    <th className="px-2 py-2 text-right whitespace-nowrap">スコア</th>
                    <th className="px-2 py-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <ResultRow
                      key={r.rank}
                      result={r}
                      appliedA={appliedA}
                      appliedB={appliedB}
                      onApply={handleApply}
                      isEn={isEn}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[10px] text-gray-400">
              スコア = 各優先度重み × 最終ステータス（設定{baseTarget}の装備・振り分け・プロテインを固定し、アクセ最大レベル・ペット最大解放レベル想定で計算）の合計。
              A/B ボタンで設定A・Bのアクセ4枠・ペット3枠だけに反映します（装備は変更されません）。
            </p>
          </div>
        </div>
      </div>
      }
    />
  );
}
