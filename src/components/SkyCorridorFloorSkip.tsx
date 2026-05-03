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
const MAX_SOLUTIONS = 10;

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
    const all = enumerateFloorSkip({
      adventurerStatues: adventurer,
      demonStatues: demon,
      targetFloor,
      placeLimit,
    });
    return all.slice(0, MAX_SOLUTIONS);
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
          <p className="text-sm text-gray-600 leading-relaxed">
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
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            {t("floorSkip.resultsTitle")}
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({solutions.length})
            </span>
          </h3>

          {solutions.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              {t("floorSkip.noResults")}
            </p>
          ) : (
            <div className="space-y-2">
              {solutions.map((sol, idx) => {
                const isOpen = expanded.has(idx);
                return (
                  <SolutionCard
                    key={idx}
                    idx={idx}
                    sol={sol}
                    targetFloor={targetFloor}
                    isOpen={isOpen}
                    toggle={toggleExpand}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SolutionCard({
  idx,
  sol,
  targetFloor,
  isOpen,
  toggle,
}: {
  idx: number;
  sol: CycleSolution;
  targetFloor: number;
  isOpen: boolean;
  toggle: (idx: number) => void;
}) {
  const { t } = useTranslation("skyCorridor");
  return (
    <div
      className={`rounded-xl border transition-colors ${
        isOpen
          ? "border-indigo-300 bg-indigo-50/30"
          : "border-gray-200 bg-white hover:border-indigo-200"
      }`}
    >
      <button
        type="button"
        onClick={() => toggle(idx)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex-shrink-0">
          {idx + 1}
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-sm">
          <Stat label={t("floorSkip.headers.startFloor")} value={`${sol.startFloor.toLocaleString()}F`} />
          <Stat label={t("floorSkip.headers.demonUsed")} value={`${sol.demonUsed}`} />
          <Stat
            label={t("floorSkip.headers.cycles")}
            value={sol.cycles > 0 ? `${sol.cycles}` : "—"}
          />
          <Stat
            label={t("floorSkip.headers.cycleProgress")}
            value={sol.cycleProgress > 0 ? `+${sol.cycleProgress.toLocaleString()}F` : "—"}
          />
        </div>
        <span className="text-xs font-medium text-indigo-600 flex-shrink-0 ml-2">
          {isOpen ? t("floorSkip.collapse") : t("floorSkip.expand")}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-indigo-200 px-4 py-3">
          <DetailBlock sol={sol} targetFloor={targetFloor} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-gray-400 leading-tight">
        {label}
      </span>
      <span className="text-sm font-semibold text-gray-800 leading-tight">
        {value}
      </span>
    </div>
  );
}

function DetailBlock({
  sol,
  targetFloor,
}: {
  sol: CycleSolution;
  targetFloor: number;
}) {
  const { t } = useTranslation("skyCorridor");
  const cycleEnd = sol.startFloor + sol.cycles * sol.cycleProgress;

  const guardianGain = 99 + 100 * sol.demonUsed;
  const advanceGain = 1 + sol.effectiveAdventurer;
  const placeUsed = sol.placedDuringCycle;

  return (
    <div className="space-y-3 text-sm text-gray-700">
      {/* STEP 1 初動 */}
      {sol.initial.steps.length > 0 && (
        <StepBlock title={t("floorSkip.stepInitialTitle", { floor: sol.startFloor })}>
          <ol className="list-decimal list-inside space-y-1 marker:text-indigo-500 marker:font-bold">
            {sol.initial.steps.map((step, i) => (
              <li key={i} className="leading-relaxed">{renderInitialStep(step, t)}</li>
            ))}
          </ol>
        </StepBlock>
      )}

      {/* STEP 2 サイクル繰り返し */}
      {sol.cycles > 0 ? (
        <StepBlock
          title={t("floorSkip.stepCycleTitle", {
            count: sol.cycles,
            from: sol.startFloor.toLocaleString(),
            to: cycleEnd.toLocaleString(),
          })}
        >
          <ol className="list-decimal list-inside space-y-1 marker:text-indigo-500 marker:font-bold">
            <li className="leading-relaxed">
              {t("floorSkip.cycleStepGuardian", {
                A: sol.demonUsed,
                guard: guardianGain.toLocaleString(),
              })}
            </li>
            <li className="leading-relaxed">
              {placeUsed > 0
                ? t("floorSkip.cycleStepAnnihilationWithPlace", {
                    p: placeUsed,
                    B: sol.effectiveAdventurer,
                    advStep: advanceGain.toLocaleString(),
                  })
                : t("floorSkip.cycleStepAnnihilation", {
                    B: sol.effectiveAdventurer,
                    advStep: advanceGain.toLocaleString(),
                  })}
            </li>
          </ol>
          <p className="mt-2 text-sm font-semibold text-indigo-700">
            {t("floorSkip.cycleSummary", { delta: sol.cycleProgress.toLocaleString() })}
          </p>
        </StepBlock>
      ) : (
        <StepBlock title={t("floorSkip.stepCycleTitle", { count: 0, from: sol.startFloor, to: sol.startFloor })}>
          <p className="text-sm text-gray-500">{t("floorSkip.noCycleNeeded")}</p>
        </StepBlock>
      )}

      {/* STEP 3 到達 */}
      <StepBlock
        title={t("floorSkip.stepGoalTitle", { floor: targetFloor.toLocaleString() })}
        accent="goal"
      />
    </div>
  );
}

function StepBlock({
  title,
  children,
  accent,
}: {
  title: string;
  children?: React.ReactNode;
  accent?: "goal";
}) {
  const titleClass =
    accent === "goal"
      ? "text-base font-bold text-emerald-700"
      : "text-sm font-bold text-indigo-700";
  return (
    <div className={accent === "goal" ? "border-t border-emerald-200 pt-2" : ""}>
      <div className={titleClass}>{title}</div>
      {children && <div className="mt-1 ml-1">{children}</div>}
    </div>
  );
}

function renderInitialStep(
  step: InitialStep,
  t: ReturnType<typeof useTranslation>["t"]
): string {
  const adv = step.toFloor - step.fromFloor;
  const params = {
    placed: step.placedBefore,
    adv: adv.toLocaleString(),
  };
  if (step.side === "both") return t("floorSkip.stepBoth", params);
  return t("floorSkip.stepLeft", params);
}
