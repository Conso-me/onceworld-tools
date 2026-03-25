import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedState, usePersistedGroup } from "../hooks/usePersistedState";
import { useStatPresets } from "../hooks/useStatPresets";
import { useSharedSimConfig, DEFAULT_SIM_CONFIG } from "../hooks/useSharedSimConfig";
import { calcStatus } from "../utils/statusCalc";
import type { SimConfig } from "../types/game";
import { SimConfigPanel, STAT_LABELS } from "./SimConfigPanel";

// ── Result Tables ─────────────────────────────────────────────────────────────

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";

function StatTable({ breakdown, label }: { breakdown: ReturnType<typeof calcStatus>; label?: string }) {
  const { t } = useTranslation("status");
  const { final, alloc, equipment, protein, accFlat, petFlat, pctBonus, finalPctBonus, hp, setBonus, setBonusSeries } = breakdown;
  const showProtein = STAT_LABELS.some(({ key }) => protein[key] > 0);

  function fmtPct(v: number): string {
    if (v === 0) return "—";
    return `+${v.toFixed(1)}%`;
  }

  return (
    <div className="overflow-x-auto space-y-2">
      {label && <p className="text-xs font-semibold text-gray-500">{label}</p>}
      {setBonus && (
        <div className="inline-flex items-center gap-1.5 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-3 py-1">
          <span className="font-bold">{t("table.setEffect")}</span>
          {setBonusSeries && <span className="text-yellow-500">({setBonusSeries})</span>}
        </div>
      )}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <th className="text-left px-3 py-2 border border-gray-100">{t("table.stat")}</th>
            <th className="text-right px-3 py-2 border border-gray-100">{t("table.alloc")}</th>
            <th className="text-right px-3 py-2 border border-gray-100">{t("table.equipment")}</th>
            {showProtein && <th className="text-right px-3 py-2 border border-gray-100">{t("table.protein")}</th>}
            <th className="text-right px-3 py-2 border border-gray-100">{t("table.accessory")}</th>
            <th className="text-right px-3 py-2 border border-gray-100">{t("table.pet")}</th>
            <th className="text-right px-3 py-2 border border-gray-100 text-green-600">{t("table.addPct")}</th>
            <th className="text-right px-3 py-2 border border-gray-100 text-purple-600">{t("table.finalPct")}</th>
            <th className="text-right px-3 py-2 border border-gray-100 font-bold text-gray-700">{t("table.final")}</th>
          </tr>
        </thead>
        <tbody>
          {STAT_LABELS.map(({ key, label: statLabel }) => (
            <tr key={key} className="even:bg-gray-50/50 hover:bg-blue-50/40 transition-colors">
              <td className="px-3 py-1.5 border border-gray-100 font-medium text-gray-600">{statLabel}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums">{alloc[key].toLocaleString()}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums">{equipment[key].toLocaleString()}</td>
              {showProtein && <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums">{protein[key].toLocaleString()}</td>}
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums">{accFlat[key].toLocaleString()}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums">{petFlat[key].toLocaleString()}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-green-600">{fmtPct(pctBonus[key])}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-purple-600">{fmtPct(finalPctBonus[key])}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold text-blue-700">{final[key].toLocaleString()}</td>
            </tr>
          ))}
          <tr className="bg-red-50/60 hover:bg-red-50 transition-colors">
            <td className="px-3 py-1.5 border border-gray-100 font-medium text-red-600">HP</td>
            <td colSpan={showProtein ? 7 : 6} className="px-3 py-1.5 border border-gray-100 text-right text-gray-400 text-xs">{t("table.hpFormula")}</td>
            <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold text-red-600">{hp.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CompareTable({ resultA, resultB }: { resultA: ReturnType<typeof calcStatus>; resultB: ReturnType<typeof calcStatus> }) {
  const { t } = useTranslation("status");
  return (
    <div className="overflow-x-auto space-y-2">
      <div className="flex gap-2 flex-wrap">
        {resultA.setBonus && (
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5">
            A: {t("table.setEffect")}{resultA.setBonusSeries ? ` (${resultA.setBonusSeries})` : ""}
          </span>
        )}
        {resultB.setBonus && (
          <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 rounded-full px-2 py-0.5">
            B: {t("table.setEffect")}{resultB.setBonusSeries ? ` (${resultB.setBonusSeries})` : ""}
          </span>
        )}
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <th className="text-left px-3 py-2 border border-gray-100">{t("table.stat")}</th>
            <th className="text-right px-3 py-2 border border-gray-100 text-blue-600">{t("configLabel", { id: "A" })}</th>
            <th className="text-right px-3 py-2 border border-gray-100 text-orange-500">{t("configLabel", { id: "B" })}</th>
            <th className="text-right px-3 py-2 border border-gray-100">{t("table.diff")}</th>
          </tr>
        </thead>
        <tbody>
          {STAT_LABELS.map(({ key, label }) => {
            const a = resultA.final[key];
            const b = resultB.final[key];
            const diff = b - a;
            return (
              <tr key={key} className="even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                <td className="px-3 py-1.5 border border-gray-100 font-medium text-gray-600">{label}</td>
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
              <tr className="even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                <td className="px-3 py-1.5 border border-gray-100 font-medium text-red-600">HP</td>
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

// ── Main component ────────────────────────────────────────────────────────────

export function StatusSimulator() {
  const { t } = useTranslation("status");
  const [cfgA, setFieldA, resetA, replaceAllA] = useSharedSimConfig();
  const [cfgB, setFieldB, resetB, replaceAllB] = usePersistedGroup<SimConfig>("sim-b", DEFAULT_SIM_CONFIG);
  const [activeConfig, setActiveConfig] = usePersistedState<"A" | "B">("sim-active", "A");
  const [compareMode, setCompareMode] = usePersistedState<boolean>("sim-compare", false);

  const { presets, savePreset } = useStatPresets();
  const [presetName, setPresetName] = useState("");
  const [attackModeForExport, setAttackModeForExport] = useState<"物理" | "魔攻">("物理");

  const resultA = useMemo(() => calcStatus(cfgA), [cfgA]);
  const resultB = useMemo(() => calcStatus(cfgB), [cfgB]);

  const activeCfg = activeConfig === "A" ? cfgA : cfgB;
  const activeSetField = activeConfig === "A" ? setFieldA : setFieldB;
  const activeReset = activeConfig === "A" ? resetA : resetB;
  const activeReplaceAll = activeConfig === "A" ? replaceAllA : replaceAllB;

  function handleSavePreset() {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    const activeResult = activeConfig === "A" ? resultA : resultB;
    const existing = presets.find((p) => p.name === trimmed);
    if (existing && !window.confirm(t("overwritePresetConfirm", { name: trimmed }))) return;
    savePreset(trimmed, {
      atk:  String(activeResult.final.atk),
      int:  String(activeResult.final.int),
      def:  String(activeResult.final.def),
      mdef: String(activeResult.final.mdef),
      spd:  String(activeResult.final.spd),
      vit:  String(activeResult.final.vit),
      luck: String(activeResult.final.luck),
      element:    activeCfg.charElement,
      attackMode: attackModeForExport,
      analysisBook: "0",
      analysisAnalysisBook: "0",
    });
    setPresetName("");
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(360px,420px)_1fr] gap-6">
      {/* 左パネル（入力） */}
      <div className="space-y-4">
        {compareMode && (
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(["A", "B"] as const).map((id) => (
              <button
                key={id}
                onClick={() => setActiveConfig(id)}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  activeConfig === id
                    ? id === "A" ? "bg-blue-500 text-white" : "bg-orange-400 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t("configLabel", { id })}
              </button>
            ))}
          </div>
        )}
        <SimConfigPanel
          cfg={activeCfg}
          setField={activeSetField}
          reset={activeReset}
          replaceAll={activeReplaceAll}
        />
      </div>

      {/* 右パネル（結果） */}
      <div className="mt-6 lg:mt-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-700">{t("calcResult")}</h2>
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              compareMode
                ? "bg-purple-500 text-white hover:bg-purple-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {compareMode ? t("compareModeOn") : t("compareMode")}
          </button>
        </div>

        {compareMode ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <CompareTable resultA={resultA} resultB={resultB} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <StatTable breakdown={resultA} />
          </div>
        )}

        {compareMode && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
              <StatTable breakdown={resultA} label={t("configBreakdown", { id: "A" })} />
            </div>
            <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
              <StatTable breakdown={resultB} label={t("configBreakdown", { id: "B" })} />
            </div>
          </div>
        )}

        {/* ── ダメ計プリセット保存 ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t("damageCalcPresetSave")}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">{t("attackMode")}</span>
            <div className="flex gap-1">
              {(["物理", "魔攻"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAttackModeForExport(mode)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    attackModeForExport === mode
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >{t(`game:attackType.${mode}`)}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t("common:presetName")}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
              className={`${inputCls} flex-1`}
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {t("common:save")}
            </button>
          </div>
          {presets.length > 0 && (
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-600">{t("registered", { count: presets.length })}</p>
              <div className="flex flex-wrap gap-1">
                {presets.map((p) => (
                  <span key={p.id} className="bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
