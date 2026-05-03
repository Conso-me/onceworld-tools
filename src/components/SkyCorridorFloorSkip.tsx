import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedState } from "../hooks/usePersistedState";
import {
  enumerateFloorSkip,
  type CycleSolution,
  type InitialStep,
} from "../utils/skyCorridorFloorSkip";
import { InputField } from "./ui/InputField";

const STATUE_MAX = 1000;
const PLACE_LIMIT_MAX = 100;
const TARGET_MAX = 10_000_000;

function parseClampedInt(raw: string, max: number, fallback: number = 0): number {
  const n = parseInt(raw || "", 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return Math.min(n, max);
}

export function SkyCorridorFloorSkip() {
  const { t } = useTranslation("skyCorridor");

  const [advRaw, setAdvRaw] = usePersistedState(
    "skyCorridor:floorSkip:adventurer",
    "100"
  );
  const [demRaw, setDemRaw] = usePersistedState(
    "skyCorridor:floorSkip:demon",
    "0"
  );
  const [targetRaw, setTargetRaw] = usePersistedState(
    "skyCorridor:floorSkip:target",
    "10000"
  );
  const [placeLimitRaw, setPlaceLimitRaw] = usePersistedState(
    "skyCorridor:floorSkip:placeLimit",
    "10"
  );

  const adventurer = parseClampedInt(advRaw, STATUE_MAX);
  const demon = parseClampedInt(demRaw, STATUE_MAX);
  const targetFloor = parseClampedInt(targetRaw, TARGET_MAX, 10000);
  const placeLimit = parseClampedInt(placeLimitRaw, PLACE_LIMIT_MAX, 10);

  const targetIsValid = targetFloor >= 100 && targetFloor % 100 === 0;

  const solutions = useMemo<CycleSolution[]>(() => {
    if (!targetIsValid) return [];
    return enumerateFloorSkip({
      adventurerStatues: adventurer,
      demonStatues: demon,
      targetFloor,
      placeLimit,
    });
  }, [adventurer, demon, targetFloor, placeLimit, targetIsValid]);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start">
      {/* ───── 左カラム: 入力 ───── */}
      <div className="space-y-6 lg:space-y-2">
        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 lg:p-4 space-y-5 lg:space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            {t("floorSkip.explanation")}
          </p>

          <InputField
            label={t("floorSkip.targetFloor")}
            value={targetRaw}
            onChange={setTargetRaw}
            placeholder="10000"
            max={TARGET_MAX}
            showReset
          />
          <InputField
            label={t("floorSkip.adventurerStatues")}
            value={advRaw}
            onChange={setAdvRaw}
            placeholder="100"
            max={STATUE_MAX}
            showReset
            showMax
          />
          <InputField
            label={t("floorSkip.demonStatues")}
            value={demRaw}
            onChange={setDemRaw}
            placeholder="0"
            max={STATUE_MAX}
            showReset
            showMax
          />
          <InputField
            label={t("floorSkip.placeLimit")}
            value={placeLimitRaw}
            onChange={setPlaceLimitRaw}
            placeholder="10"
            max={PLACE_LIMIT_MAX}
            showReset
          />
        </div>
      </div>

      {/* ───── 右カラム: 結果テーブル ───── */}
      <div className="space-y-3">
        <div className="bg-white rounded-2xl shadow shadow-gray-200/50 p-4 lg:p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {t("floorSkip.resultsTitle")}
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({solutions.length})
            </span>
          </h3>

          {solutions.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">
              {t("floorSkip.noResults")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs lg:text-[11px]">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-200">
                    <th className="text-left px-2 py-1.5 font-medium">
                      {t("floorSkip.headers.startFloor")}
                    </th>
                    <th className="text-right px-2 py-1.5 font-medium">
                      {t("floorSkip.headers.demonUsed")}
                    </th>
                    <th className="text-right px-2 py-1.5 font-medium">
                      {t("floorSkip.headers.cycles")}
                    </th>
                    <th className="text-right px-2 py-1.5 font-medium">
                      {t("floorSkip.headers.cycleProgress")}
                    </th>
                    <th className="text-right px-2 py-1.5 font-medium">
                      {t("floorSkip.headers.totalOps")}
                    </th>
                    <th className="px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {solutions.map((sol, idx) => {
                    const isOpen = expanded.has(idx);
                    return (
                      <RowGroup
                        key={idx}
                        idx={idx}
                        sol={sol}
                        isOpen={isOpen}
                        toggle={toggleExpand}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RowGroup({
  idx,
  sol,
  isOpen,
  toggle,
}: {
  idx: number;
  sol: CycleSolution;
  isOpen: boolean;
  toggle: (idx: number) => void;
}) {
  const { t } = useTranslation("skyCorridor");
  return (
    <>
      <tr
        className={`border-b border-gray-100 cursor-pointer hover:bg-indigo-50/50 ${
          isOpen ? "bg-indigo-50/50" : ""
        }`}
        onClick={() => toggle(idx)}
      >
        <td className="px-2 py-1.5 font-medium text-gray-800">
          {sol.startFloor.toLocaleString()}F
        </td>
        <td className="text-right px-2 py-1.5 text-gray-700">
          {sol.demonUsed}
        </td>
        <td className="text-right px-2 py-1.5 text-gray-700">{sol.cycles}</td>
        <td className="text-right px-2 py-1.5 text-gray-700">
          {sol.cycleProgress > 0 ? `${sol.cycleProgress.toLocaleString()}F` : "—"}
        </td>
        <td className="text-right px-2 py-1.5 text-gray-700">
          {sol.totalOperations}
        </td>
        <td className="text-right px-2 py-1.5">
          <span className="text-indigo-500 text-[10px] font-medium">
            {isOpen ? t("floorSkip.collapse") : t("floorSkip.expand")}
          </span>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <td colSpan={6} className="px-3 py-2 text-[11px] text-gray-700">
            <DetailBlock sol={sol} />
          </td>
        </tr>
      )}
    </>
  );
}

function DetailBlock({ sol }: { sol: CycleSolution }) {
  const { t } = useTranslation("skyCorridor");
  return (
    <div className="space-y-2">
      {sol.initial.steps.length > 0 && (
        <div>
          <div className="font-semibold text-gray-700 mb-1">
            {t("floorSkip.initialPlanTitle", { floor: sol.startFloor })}
          </div>
          <ol className="list-decimal list-inside space-y-0.5 text-gray-600">
            {sol.initial.steps.map((step, i) => (
              <li key={i}>{renderStep(step, t)}</li>
            ))}
          </ol>
        </div>
      )}
      <div>
        <div className="font-semibold text-gray-700 mb-1">
          {t("floorSkip.cycleDetailTitle")}
        </div>
        {sol.cycles === 0 ? (
          <p className="text-gray-500">{t("floorSkip.noCycleNeeded")}</p>
        ) : (
          <ul className="space-y-0.5 text-gray-600">
            <li>
              {t("floorSkip.cycleParams", {
                B: sol.effectiveAdventurer,
                A: sol.demonUsed,
                p: sol.placedDuringCycle,
              })}
            </li>
            <li>
              {t("floorSkip.cycleFormula", {
                B: sol.effectiveAdventurer,
                cycA: 100 * sol.demonUsed,
                delta: sol.cycleProgress,
              })}
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

function renderStep(step: InitialStep, t: ReturnType<typeof useTranslation>["t"]): string {
  const params = {
    from: step.fromFloor,
    to: step.toFloor,
    placed: step.placedBefore,
    used: step.usedStatues,
  };
  if (step.side === "both") return t("floorSkip.stepBoth", params);
  return t("floorSkip.stepLeft", params);
}
