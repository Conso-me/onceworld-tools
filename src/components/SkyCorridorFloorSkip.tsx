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
const TARGET_MAX = 1_000_000;
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
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1 text-sm">
          <Stat label={t("floorSkip.headers.startFloor")} value={`${sol.startFloor.toLocaleString()}F`} />
          <Stat label={t("floorSkip.headers.adventurerUsed")} value={`${sol.effectiveAdventurer}`} />
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
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          {sol.noGuardian && (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
              {t("floorSkip.noGuardianBadge")}
            </span>
          )}
          <span className="text-xs font-medium text-indigo-600">
            {isOpen ? t("floorSkip.collapse") : t("floorSkip.expand")}
          </span>
        </div>
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

  // ガーディアン討伐なしの片側殲滅チェイン
  if (sol.noGuardian) {
    return (
      <div className="space-y-3 text-sm text-gray-700">
        <BroughtSummary sol={sol} t={t} />
        <StepBlock
          title={t("floorSkip.stepNoGuardianTitle", {
            count: sol.cycles,
            to: targetFloor.toLocaleString(),
          })}
        >
          <p className="leading-relaxed">
            {t("floorSkip.stepNoGuardianDetail", {
              B: sol.effectiveAdventurer,
              advStep: sol.cycleProgress.toLocaleString(),
            })}
          </p>
          <p className="mt-2 text-sm font-semibold text-indigo-700">
            {t("floorSkip.cycleSummary", { delta: sol.cycleProgress.toLocaleString() })}
          </p>
        </StepBlock>
        <StepBlock
          title={t("floorSkip.stepGoalTitle", { floor: targetFloor.toLocaleString() })}
          accent="goal"
        />
      </div>
    );
  }

  const cycleEnd = sol.startFloor + sol.cycles * sol.cycleProgress;

  return (
    <div className="space-y-3 text-sm text-gray-700">
      {/* 持参像サマリー */}
      <BroughtSummary sol={sol} t={t} />

      {/* STEP 1 初動 */}
      {sol.initial.steps.length > 0 && (
        <StepBlock title={t("floorSkip.stepInitialTitle", { floor: sol.startFloor })}>
          <div className="space-y-2">
            {sol.initial.steps.map((step, i) => (
              <InitialStepCard key={i} step={step} t={t} />
            ))}
          </div>
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
          <CycleSampleCard sol={sol} t={t} />
          <p className="mt-2 text-sm text-gray-600">
            {t("floorSkip.cycleRepeatNote", {
              count: sol.cycles,
              target: cycleEnd.toLocaleString(),
            })}
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

function InitialStepCard({
  step,
  t,
}: {
  step: InitialStep;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const adv = step.toFloor - step.fromFloor;
  const isBoth = step.side === "both";

  // "both": usedStatues = 2N - p → left = (used - p)/2, right = (used + p)/2
  const leftStatues = isBoth
    ? (step.usedStatues - step.placedBefore) / 2
    : step.usedStatues;
  const rightStatues = isBoth
    ? (step.usedStatues + step.placedBefore) / 2
    : undefined;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
        {step.fromFloor.toLocaleString()}F
      </div>

      <div className="p-3 space-y-1.5">
        {/* 1. 置く（最初に行動） */}
        <PlaceRow count={step.placedBefore} />

        {/* 2. 部屋アクション */}
        <RoomKillRow label="左部屋" statues={leftStatues} />
        {isBoth ? (
          <>
            <PickupRow />
            <RoomKillRow label="右部屋" statues={rightStatues!} />
          </>
        ) : (
          <RoomSkipRow label="右部屋" />
        )}
      </div>

      <div className="px-3 py-2 bg-indigo-50 border-t border-indigo-100 text-sm font-semibold text-indigo-700">
        {t("floorSkip.stepResultLine", {
          from: step.fromFloor.toLocaleString(),
          adv: adv.toLocaleString(),
          to: step.toFloor.toLocaleString(),
        })}
      </div>
    </div>
  );
}

function PlaceRow({ count }: { count: number }) {
  if (count > 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 px-3 py-2">
        <span>📍</span>
        <span className="text-sm font-semibold text-amber-900">
          冒険者像を {count} 個 床に置く
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5">
      <span className="text-sm text-gray-400">像は置かない</span>
    </div>
  );
}

function RoomKillRow({ label, statues }: { label: string; statues: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
      <span className="font-bold text-emerald-600">⚔</span>
      <span className="text-sm font-semibold text-emerald-900">{label}を殲滅</span>
      <span className="ml-auto text-xs text-gray-500">冒険者像 {statues} 個</span>
    </div>
  );
}

function RoomSkipRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 opacity-55">
      <span className="font-bold text-gray-400 text-sm">✕</span>
      <span className="text-sm text-gray-400">{label}: 倒さない</span>
    </div>
  );
}

function PickupRow() {
  return (
    <div className="flex items-center gap-2 pl-4 text-xs text-sky-700 font-medium">
      <span>📦</span>
      <span>床の像を全て回収する</span>
    </div>
  );
}

function GuardianPanel({
  demonUsed,
  guardianGain,
}: {
  demonUsed: number;
  guardianGain: number;
}) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 flex items-center gap-2">
      <span>🛡</span>
      <div className="flex flex-col gap-0">
        <span className="text-[11px] font-bold text-violet-700">スカイガーディアン討伐</span>
        <span className="text-xs text-violet-900">
          +99F + 悪魔像 {demonUsed} 個効果 = +{guardianGain.toLocaleString()}F
        </span>
      </div>
    </div>
  );
}

function BroughtSummary({
  sol,
  t,
}: {
  sol: CycleSolution;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
        🎒 {t("floorSkip.broughtTitle")}
      </span>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
        <span className="flex items-baseline gap-1">
          <span className="text-gray-600">{t("floorSkip.broughtAdventurer")}:</span>
          <strong className="text-gray-900 text-base">{sol.effectiveAdventurer}</strong>
          <span className="text-xs text-gray-500">個</span>
        </span>
        <span className="flex items-baseline gap-1">
          <span className="text-gray-600">{t("floorSkip.broughtDemon")}:</span>
          <strong className="text-gray-900 text-base">{sol.demonUsed}</strong>
          <span className="text-xs text-gray-500">個</span>
        </span>
      </div>
    </div>
  );
}


function CycleSampleCard({
  sol,
  t,
}: {
  sol: CycleSolution;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const cycleStart = sol.startFloor;
  const guardianGain = 99 + 100 * sol.demonUsed;
  const annihilationGain = 1 + sol.effectiveAdventurer;
  const cycleEnd = cycleStart + sol.cycleProgress;
  const placeUsed = sol.placedDuringCycle;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
        {cycleStart.toLocaleString()}F
      </div>

      <div className="p-3 space-y-1.5">
        {/* 1. 置く（最初に行動） */}
        <PlaceRow count={placeUsed} />

        {/* 2. 部屋アクション（片側殲滅） */}
        <RoomKillRow label="左部屋" statues={sol.effectiveAdventurer} />
        <RoomSkipRow label="右部屋" />
        <div className="text-[10px] text-gray-400 text-right">
          片側殲滅 → +{annihilationGain.toLocaleString()}F
        </div>

        {/* 3. スカイガーディアン討伐 */}
        <GuardianPanel demonUsed={sol.demonUsed} guardianGain={guardianGain} />
      </div>

      <div className="px-3 py-2 bg-indigo-50 border-t border-indigo-100 text-sm font-semibold text-indigo-700">
        {t("floorSkip.cycleTotalLine", {
          delta: sol.cycleProgress.toLocaleString(),
          from: cycleStart.toLocaleString(),
          to: cycleEnd.toLocaleString(),
        })}
      </div>
    </div>
  );
}
