import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedState } from "../hooks/usePersistedState";
import {
  enumerateFloorSkip,
  type CycleSolution,
  type InitialStep,
  type SubMode,
} from "../utils/skyCorridorFloorSkip";
import { InputField } from "./ui/InputField";

const STATUE_MAX = 1000;
const PLACE_LIMIT_MAX = 100;
const TARGET_MAX = 1_000_000;
const MAX_SOLUTIONS = 10;
const MULTIPLE_X_MAX = 1_000_000;

function parseClampedInt(raw: string, max: number, fallback: number = 0): number {
  const n = parseInt(raw || "", 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return Math.min(n, max);
}

export function SkyCorridorFloorSkip() {
  const { t } = useTranslation("skyCorridor");

  const [subMode, setSubMode] = usePersistedState<SubMode>(
    "skyCorridor:floorSkip:subMode",
    "exactReach"
  );
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
  const [multipleXRaw, setMultipleXRaw] = usePersistedState(
    "skyCorridor:floorSkip:multipleX",
    "10000"
  );

  const adventurer = parseClampedInt(advRaw, STATUE_MAX);
  const demon = parseClampedInt(demRaw, STATUE_MAX);
  const targetFloor = parseClampedInt(targetRaw, TARGET_MAX, 10000);
  const placeLimit = parseClampedInt(placeLimitRaw, PLACE_LIMIT_MAX, 10);
  const multipleX = parseClampedInt(multipleXRaw, MULTIPLE_X_MAX, 10000);

  const targetIsValid = targetFloor >= 100 && targetFloor % 100 === 0;
  const isMaxMultiples = subMode === "maxMultiples";

  const solutions = useMemo<CycleSolution[]>(() => {
    if (!targetIsValid) return [];
    const all = enumerateFloorSkip({
      adventurerStatues: adventurer,
      demonStatues: demon,
      targetFloor,
      placeLimit,
      subMode,
      multipleX: isMaxMultiples ? multipleX : 0,
    });
    return all.slice(0, MAX_SOLUTIONS);
  }, [
    adventurer,
    demon,
    targetFloor,
    placeLimit,
    targetIsValid,
    subMode,
    multipleX,
    isMaxMultiples,
  ]);

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

          {/* サブモード切り替え */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-medium">
            {(["exactReach", "maxMultiples"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSubMode(m)}
                className={`flex-1 px-3 py-2 transition-colors ${
                  subMode === m
                    ? "bg-indigo-500 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t(`floorSkip.subMode.${m}`)}
              </button>
            ))}
          </div>

          <InputField
            label={t("floorSkip.targetFloor")}
            value={targetRaw}
            onChange={setTargetRaw}
            placeholder="10000"
            max={TARGET_MAX}
            showReset
          />
          {isMaxMultiples && (
            <InputField
              label={t("floorSkip.multipleX")}
              value={multipleXRaw}
              onChange={setMultipleXRaw}
              placeholder="10000"
              max={MULTIPLE_X_MAX}
              showReset
            />
          )}
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
                    showLandings={isMaxMultiples}
                    multipleX={multipleX}
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
  showLandings,
  multipleX,
  isOpen,
  toggle,
}: {
  idx: number;
  sol: CycleSolution;
  targetFloor: number;
  showLandings: boolean;
  multipleX: number;
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
          {showLandings ? (
            <Stat
              label={t("floorSkip.headers.landings", { x: multipleX.toLocaleString() })}
              value={`${sol.xMultipleLandings ?? 0}`}
            />
          ) : (
            <Stat
              label={t("floorSkip.headers.cycles")}
              value={sol.cycles > 0 ? `${sol.cycles}` : "—"}
            />
          )}
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
  const placed = step.placedBefore > 0;

  return (
    <div className="rounded-lg border border-gray-300 bg-white shadow-sm p-3 space-y-2">
      <div className="text-xs font-semibold text-gray-500">
        {step.fromFloor.toLocaleString()}F
      </div>

      {/* 像を置く / 置かない（明示） */}
      {placed ? (
        <PlacementBadge variant="emphasis">
          📍 {t("floorSkip.actionPlace", { count: step.placedBefore })}
        </PlacementBadge>
      ) : (
        <PlacementBadge variant="neutral">
          🚫 {t("floorSkip.actionNoPlace")}
        </PlacementBadge>
      )}

      {/* 小部屋アクション: 順序付きリスト */}
      <ol className="space-y-1.5 text-sm text-gray-800 pl-1">
        {isBoth ? (
          <>
            <li className="flex gap-2">
              <span className="text-indigo-500 font-bold">1.</span>
              <span>{t("floorSkip.actionKillLeft")}</span>
            </li>
            {placed && (
              <li>
                <PlacementBadge variant="emphasis">
                  📍 {t("floorSkip.actionPickup")}
                </PlacementBadge>
              </li>
            )}
            <li className="flex gap-2">
              <span className="text-indigo-500 font-bold">{placed ? "2." : "2."}</span>
              <span>{t("floorSkip.actionKillRight")}</span>
            </li>
          </>
        ) : (
          <li className="flex gap-2">
            <span className="text-indigo-500 font-bold">1.</span>
            <span>{t("floorSkip.actionKillSingle")}</span>
          </li>
        )}
      </ol>

      <div className="border-t border-gray-200 pt-1.5 text-sm font-semibold text-indigo-700">
        {t("floorSkip.stepResultLine", {
          from: step.fromFloor.toLocaleString(),
          adv: adv.toLocaleString(),
          to: step.toFloor.toLocaleString(),
        })}
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

function PlacementBadge({
  children,
  variant = "emphasis",
}: {
  children: React.ReactNode;
  variant?: "emphasis" | "neutral";
}) {
  const cls =
    variant === "emphasis"
      ? "bg-amber-100 border-amber-300 text-amber-900"
      : "bg-gray-100 border-gray-300 text-gray-600";
  return (
    <div
      className={`inline-flex items-center border rounded-md px-2 py-1 font-semibold text-sm ${cls}`}
    >
      {children}
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
  const midFloor = cycleStart + guardianGain;
  const annihilationGain = 1 + sol.effectiveAdventurer;
  const cycleEnd = cycleStart + sol.cycleProgress;
  const placeUsed = sol.placedDuringCycle;

  return (
    <div className="rounded-lg border border-gray-300 bg-white shadow-sm p-3 space-y-2">
      <div className="text-xs font-semibold text-gray-500">
        {cycleStart.toLocaleString()}F
      </div>

      {/* サイクル中の床置き状況 */}
      {placeUsed > 0 ? (
        <PlacementBadge variant="emphasis">
          📍 {t("floorSkip.actionPlace", { count: placeUsed })}
        </PlacementBadge>
      ) : (
        <PlacementBadge variant="neutral">
          🚫 {t("floorSkip.actionNoPlace")}
        </PlacementBadge>
      )}

      {/* サイクル内アクション */}
      <ol className="space-y-1.5 text-sm text-gray-800 pl-1">
        <li className="flex gap-2">
          <span className="text-indigo-500 font-bold">1.</span>
          <span>
            {t("floorSkip.cycleStepGuardian", {
              from: cycleStart.toLocaleString(),
              A: sol.demonUsed,
              guard: guardianGain.toLocaleString(),
              to: midFloor.toLocaleString(),
            })}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-indigo-500 font-bold">2.</span>
          <span>
            {placeUsed > 0
              ? t("floorSkip.cycleStepAnnihilationWithPlace", {
                  from: midFloor.toLocaleString(),
                  p: placeUsed,
                  B: sol.effectiveAdventurer,
                  advStep: annihilationGain.toLocaleString(),
                  to: cycleEnd.toLocaleString(),
                })
              : t("floorSkip.cycleStepAnnihilation", {
                  from: midFloor.toLocaleString(),
                  B: sol.effectiveAdventurer,
                  advStep: annihilationGain.toLocaleString(),
                  to: cycleEnd.toLocaleString(),
                })}
          </span>
        </li>
      </ol>

      <div className="border-t border-gray-200 pt-1.5 text-sm font-semibold text-indigo-700">
        {t("floorSkip.stepResultLine", {
          from: cycleStart.toLocaleString(),
          adv: sol.cycleProgress.toLocaleString(),
          to: cycleEnd.toLocaleString(),
        })}
      </div>
    </div>
  );
}
