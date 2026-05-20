import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SimConfig, EquipmentItem } from "../types/game";
import { getEquipmentBySlot } from "../data/equipment";
import {
  optimizeEquipment,
  DEFAULT_WEIGHTS,
  type StatWeights,
  type EquipOptResult,
} from "../utils/equipOptimizer";

const EQUIP_SLOTS = ["武器", "頭", "服", "手", "盾", "脚"] as const;
type EquipSlot = (typeof EQUIP_SLOTS)[number];

const SLOT_CONFIG_KEYS: Record<EquipSlot, {
  equip: keyof SimConfig;
  enh: keyof SimConfig;
  gold: keyof SimConfig;
}> = {
  武器: { equip: "equipWeapon", enh: "enhWeapon", gold: "goldEnhWeapon" },
  頭:   { equip: "equipHead",   enh: "enhHead",   gold: "goldEnhHead"   },
  服:   { equip: "equipBody",   enh: "enhBody",   gold: "goldEnhBody"   },
  手:   { equip: "equipHand",   enh: "enhHand",   gold: "goldEnhHand"   },
  盾:   { equip: "equipShield", enh: "enhShield", gold: "goldEnhShield" },
  脚:   { equip: "equipFoot",   enh: "enhFoot",   gold: "goldEnhFoot"   },
};

const WEIGHT_LABELS: { key: keyof StatWeights; label: string }[] = [
  { key: "mdef", label: "M-DEF" },
  { key: "int",  label: "INT"   },
  { key: "atk",  label: "ATK"   },
  { key: "luck", label: "LUK"   },
  { key: "def",  label: "DEF"   },
  { key: "vit",  label: "VIT"   },
  { key: "spd",  label: "SPD"   },
];

const inputCls =
  "border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";

interface Props {
  onApply: (overrides: Partial<SimConfig>, target: "A" | "B") => void;
}

function fmtG(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function GoldLevelBadge({ g }: { g: number }) {
  if (g === 0) return <span className="text-gray-300">—</span>;
  return (
    <span className="text-yellow-600 font-medium tabular-nums">G{g}</span>
  );
}

function ResultRow({
  result,
  slotLabels,
  appliedA,
  appliedB,
  onApply,
}: {
  result: EquipOptResult;
  slotLabels: Record<EquipSlot, string>;
  appliedA: number | null;
  appliedB: number | null;
  onApply: (r: EquipOptResult, target: "A" | "B") => void;
}) {
  const { i18n } = useTranslation("status");
  const isEn = i18n.language === "en";
  const name = (item: EquipmentItem) => (isEn ? (item.nameEn ?? item.name) : item.name);
  const allItems = [result.weapon, ...result.armors];

  return (
    <tr className="group hover:bg-blue-50/40 transition-colors border-b border-gray-100">
      <td className="px-2 py-2 text-center text-xs font-bold text-gray-500 whitespace-nowrap">
        #{result.rank}
      </td>
      {/* 装備名 */}
      <td className="px-2 py-2 min-w-[180px]">
        <div className="space-y-0.5">
          {allItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span className="shrink-0 text-gray-400 w-7 text-right">
                {slotLabels[EQUIP_SLOTS[i]]}
              </span>
              <span className="truncate text-gray-700 max-w-[160px]" title={item.name}>
                {name(item)}
              </span>
            </div>
          ))}
          {result.hasSetBonus && (
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5 whitespace-nowrap">
              ✦ セット効果
              {result.series && (
                <span className="opacity-70">({result.series})</span>
              )}
            </div>
          )}
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
      {/* G強化配分 */}
      <td className="px-2 py-2 min-w-[90px]">
        <div className="space-y-0.5">
          {allItems.map((_item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span className="shrink-0 text-gray-400 w-7 text-right">
                {slotLabels[EQUIP_SLOTS[i]]}
              </span>
              <GoldLevelBadge g={result.goldLevels[i]} />
            </div>
          ))}
        </div>
      </td>
      {/* コスト */}
      <td className="px-2 py-2 text-right text-xs tabular-nums whitespace-nowrap">
        {result.totalCost > 0 ? (
          <span className="text-yellow-700 font-medium">{fmtG(result.totalCost)} G</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
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

export function EquipmentOptimizer({ onApply }: Props) {
  const { t } = useTranslation("status");

  const [unlimited, setUnlimited] = useState(true);
  const [budgetStr, setBudgetStr] = useState("");
  const [weights, setWeights] = useState<StatWeights>({ ...DEFAULT_WEIGHTS });
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [showExclude, setShowExclude] = useState(false);
  const [appliedA, setAppliedA] = useState<number | null>(null);
  const [appliedB, setAppliedB] = useState<number | null>(null);

  const budget = unlimited ? Infinity : (Number(budgetStr.replace(/,/g, "")) || 0);

  const allBySlot = useMemo(
    () =>
      Object.fromEntries(
        EQUIP_SLOTS.map((slot) => [slot, getEquipmentBySlot(slot)]),
      ) as Record<EquipSlot, EquipmentItem[]>,
    [],
  );

  const slotLabels = useMemo(
    () =>
      Object.fromEntries(
        EQUIP_SLOTS.map((slot) => [slot, t(`game:equipSlot.${slot}`)]),
      ) as Record<EquipSlot, string>,
    [t],
  );

  const results = useMemo(
    () => optimizeEquipment(excluded, weights, budget),
    [excluded, weights, budget],
  );

  function toggleExclude(name: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleApply(result: EquipOptResult, target: "A" | "B") {
    const allItems = [result.weapon, ...result.armors];
    const overrides: Partial<SimConfig> = {};
    EQUIP_SLOTS.forEach((slot, i) => {
      const item = allItems[i];
      const keys = SLOT_CONFIG_KEYS[slot];
      overrides[keys.equip] = item.name;
      overrides[keys.enh] = item.material !== "強化できない" ? 1100 : 0;
      overrides[keys.gold] = result.goldLevels[i];
    });
    onApply(overrides, target);
    if (target === "A") setAppliedA(result.rank);
    else setAppliedB(result.rank);
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(300px,360px)_1fr] gap-4">
      {/* 左パネル */}
      <div className="space-y-3">
        {/* 所持金 */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">所持金（予算）</h3>
          <button
            onClick={() => setUnlimited((v) => !v)}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              unlimited
                ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${unlimited ? "border-yellow-400 bg-yellow-400" : "border-gray-300"}`}>
              {unlimited && <span className="w-2 h-2 rounded-full bg-white" />}
            </span>
            青天井（ゴールド強化MAX）
          </button>
          {!unlimited && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={budgetStr}
                  onChange={(e) => setBudgetStr(e.target.value)}
                  className={`${inputCls} w-full`}
                />
                <span className="text-sm text-gray-500 shrink-0">G</span>
              </div>
              {budget > 0 && (
                <p className="text-xs text-gray-400">{fmtG(budget)} G</p>
              )}
            </div>
          )}
        </div>

        {/* 優先度重み */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ステータス優先度</h3>
            <button
              onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
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

        {/* 除外装備 */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
          <button
            onClick={() => setShowExclude((v) => !v)}
            className="flex items-center justify-between w-full"
          >
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              除外装備
              {excluded.size > 0 && (
                <span className="ml-1.5 bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {excluded.size}
                </span>
              )}
            </h3>
            <span className="text-gray-400 text-xs">{showExclude ? "▲" : "▼"}</span>
          </button>

          {showExclude && (
            <div className="space-y-2 pt-1">
              {excluded.size > 0 && (
                <button
                  onClick={() => setExcluded(new Set())}
                  className="text-[11px] text-red-400 hover:text-red-600 transition-colors"
                >
                  すべてクリア
                </button>
              )}
              {EQUIP_SLOTS.map((slot) => (
                <div key={slot} className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">
                    {slotLabels[slot]}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {allBySlot[slot].map((item) => {
                      const isExcluded = excluded.has(item.name);
                      return (
                        <button
                          key={item.name}
                          onClick={() => toggleExclude(item.name)}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                            isExcluded
                              ? "bg-red-50 border-red-200 text-red-500 line-through"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右パネル：結果 */}
      <div className="mt-4 lg:mt-0">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">最適装備ランキング</h3>
            {unlimited
              ? <span className="text-[11px] text-yellow-600 font-medium">青天井モード: G強化MAX</span>
              : budget === 0 && <span className="text-[11px] text-gray-400">予算0: ゴールド強化なし</span>
            }
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              除外装備が多すぎて候補がありません
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                    <th className="px-2 py-2 text-center w-8">位</th>
                    <th className="px-2 py-2 text-left">装備</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">実ステータス</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">G強化配分</th>
                    <th className="px-2 py-2 text-right whitespace-nowrap">コスト</th>
                    <th className="px-2 py-2 text-right whitespace-nowrap">スコア</th>
                    <th className="px-2 py-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <ResultRow
                      key={r.rank}
                      result={r}
                      slotLabels={slotLabels}
                      appliedA={appliedA}
                      appliedB={appliedB}
                      onApply={handleApply}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[10px] text-gray-400">
              スコア = 各優先度重み × 装備ステータス（通常強化+1100想定）の合計。
              A/B ボタンで設定A・Bに反映し、通常モードのA/B比較で差分を確認できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
