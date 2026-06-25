import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedState } from "../hooks/usePersistedState";
import { useSharedSimConfig } from "../hooks/useSharedSimConfig";
import { calcStatus } from "../utils/statusCalc";
import { InputField } from "./ui/InputField";
import { SimConfigPanel } from "./SimConfigPanel";
import { formatHitCount } from "../utils/formatNumber";
import {
  calcAllOfarmWaves,
  ELEMENTS,
  type OfarmPlayerStats,
  type OfarmWaveResult,
} from "../utils/ofarmCalc";
import { OFARM_WAVE_GROUPS } from "../data/ofarmWaves";
import type { Element } from "../types/game";

const elementBadge: Record<Element, string> = {
  火: "bg-red-100 text-red-600 border-red-200",
  水: "bg-blue-100 text-blue-600 border-blue-200",
  木: "bg-green-100 text-green-600 border-green-200",
  光: "bg-yellow-100 text-yellow-700 border-yellow-200",
  闇: "bg-purple-100 text-purple-600 border-purple-200",
};

const elementBtn: Record<Element, string> = elementBadge;

/** 確殺回数を回数バッジの色クラスに変換 */
function killBadgeClass(hits: number): string {
  if (!isFinite(hits)) return "bg-gray-100 text-gray-400 border-gray-200";
  if (hits <= 2) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (hits <= 5) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-600 border-rose-200";
}

/** 耐えられる回数を色クラスに変換 */
function survivalClass(hits: number): string {
  if (!isFinite(hits)) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (hits >= 10) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (hits >= 3) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-600 border-rose-200";
}

const MANUAL_DEFAULTS = {
  atk: "",
  int: "",
  def: "",
  mdef: "",
  spd: "",
  vit: "",
  luck: "",
  analysisBook: "",
};

export function OfarmSimulator() {
  const { t, i18n } = useTranslation("ofarm");
  const lang = i18n.language;

  const [statMode, setStatMode] = usePersistedState<"manual" | "sim">("ofarm:statMode", "manual");
  const [manualElement, setManualElement] = usePersistedState<Element>("ofarm:element", "火");
  const [manual, setManual] = usePersistedState("ofarm:manual", MANUAL_DEFAULTS);

  const [simCfg, setSimField, resetSim, replaceAllSim] = useSharedSimConfig();
  const simResult = useMemo(() => calcStatus(simCfg), [simCfg]);

  const setManualField = (field: keyof typeof MANUAL_DEFAULTS, value: string) =>
    setManual((prev) => ({ ...prev, [field]: value }));

  // 実効プレイヤーステータス
  const player: OfarmPlayerStats = useMemo(() => {
    if (statMode === "sim") {
      return {
        atk: simResult.final.atk,
        int: simResult.final.int,
        def: simResult.final.def,
        mdef: simResult.final.mdef,
        spd: simResult.final.spd,
        vit: simResult.final.vit,
        luck: simResult.final.luck,
        hp: simResult.hp,
        element: simCfg.charElement,
        analysisBook: parseInt(manual.analysisBook) || 0,
      };
    }
    const vit = parseInt(manual.vit) || 0;
    return {
      atk: parseInt(manual.atk) || 0,
      int: parseInt(manual.int) || 0,
      def: parseInt(manual.def) || 0,
      mdef: parseInt(manual.mdef) || 0,
      spd: parseInt(manual.spd) || 0,
      vit,
      luck: parseInt(manual.luck) || 0,
      hp: vit > 0 ? vit * 18 + 100 : 0,
      element: manualElement,
      analysisBook: parseInt(manual.analysisBook) || 0,
    };
  }, [statMode, simResult, simCfg.charElement, manual, manualElement]);

  const results = useMemo(() => calcAllOfarmWaves(player), [player]);

  // グループの開閉
  const [openGroups, setOpenGroups] = usePersistedState<Record<string, boolean>>("ofarm:openGroups", {
    g1: true,
    g2: true,
    g3: true,
  });
  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start">
      {/* 左パネル（入力） */}
      <div className="space-y-3 lg:sticky lg:top-[88px]">
        <div className="bg-card rounded-3xl shadow-lg shadow-gray-200/50 p-5 lg:p-4 space-y-4 lg:space-y-3">
          {/* 手動 / 装備設定 トグル */}
          <div className="flex rounded-lg overflow-hidden border border-line text-xs">
            {(["manual", "sim"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatMode(mode)}
                className={`flex-1 py-2 lg:py-1.5 font-medium transition-colors ${
                  statMode === mode ? "bg-blue-500 text-white" : "bg-card text-gray-500 hover:bg-gray-50"
                }`}
              >
                {mode === "manual" ? t("statModeManual") : t("statModeSim")}
              </button>
            ))}
          </div>

          {/* 自属性 */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-600">{t("heroElement")}</label>
            <div className="flex gap-1.5">
              {ELEMENTS.map((el) => {
                const active =
                  statMode === "sim" ? simCfg.charElement === el : manualElement === el;
                return (
                  <button
                    key={el}
                    onClick={() =>
                      statMode === "sim" ? setSimField("charElement", el) : setManualElement(el)
                    }
                    className={`flex-1 py-2.5 lg:py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active ? elementBtn[el] : "bg-gray-50 text-gray-400 border-line"
                    }`}
                  >
                    {t(`game:element.${el}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 手動ステータス入力 */}
          {statMode === "manual" && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-2">
              <InputField label="ATK" value={manual.atk} onChange={(v) => setManualField("atk", v)} />
              <InputField label="INT" value={manual.int} onChange={(v) => setManualField("int", v)} />
              <InputField label="LUK" value={manual.luck} onChange={(v) => setManualField("luck", v)} />
              <InputField label="DEF" value={manual.def} onChange={(v) => setManualField("def", v)} />
              <InputField label="M-DEF" value={manual.mdef} onChange={(v) => setManualField("mdef", v)} />
              <InputField label="VIT" value={manual.vit} onChange={(v) => setManualField("vit", v)} />
              <InputField label="SPD" value={manual.spd} onChange={(v) => setManualField("spd", v)} />
            </div>
          )}

          {/* 解析書（魔法計算用・両モード共通） */}
          <div className="pt-1 border-t border-line">
            <InputField
              label={t("analysisBook")}
              value={manual.analysisBook}
              onChange={(v) => setManualField("analysisBook", v)}
              max={1000}
              showReset
              showMax
            />
          </div>

          {/* 装備設定モード */}
          {statMode === "sim" && (
            <SimConfigPanel
              cfg={simCfg}
              setField={setSimField}
              reset={resetSim}
              replaceAll={replaceAllSim}
            />
          )}
        </div>
      </div>

      {/* 右パネル（Wave一覧） */}
      <div className="mt-4 lg:mt-0 space-y-2">
        <p className="text-xs text-muted px-1">{t("hint")}</p>
        {OFARM_WAVE_GROUPS.map((group) => {
          const waves = results.filter(
            (r) => r.wave.wave >= group.from && r.wave.wave <= group.to,
          );
          const open = openGroups[group.id] ?? true;
          return (
            <div key={group.id} className="bg-card rounded-2xl shadow-sm border border-line overflow-hidden">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-ink hover:bg-gray-50 transition-colors"
              >
                <span>
                  {t("waveRange", { from: group.from, to: group.to })}
                </span>
                <span className="text-muted">{open ? "▼" : "▶"}</span>
              </button>
              {open && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-t border-line">
                    <thead>
                      <tr className="text-muted bg-field/40">
                        <th className="px-2 py-1.5 text-left font-medium">{t("col.wave")}</th>
                        <th className="px-2 py-1.5 text-left font-medium">{t("col.monster")}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t("col.lvhp")}</th>
                        <th className="px-2 py-1.5 text-center font-medium">{t("col.durability")}</th>
                        <th className="px-2 py-1.5 text-center font-medium">{t("col.physical")}</th>
                        <th className="px-2 py-1.5 text-center font-medium">{t("col.magic")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waves.map((r) => (
                        <WaveRow key={r.wave.wave} r={r} lang={lang} t={t} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WaveRow({
  r,
  lang,
  t,
}: {
  r: OfarmWaveResult;
  lang: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (!r.found) {
    return (
      <tr className="border-t border-line">
        <td className="px-2 py-2 font-semibold text-ink">W{r.wave.wave}</td>
        <td className="px-2 py-2 text-muted" colSpan={5}>
          {r.monsterName} — {t("notRegistered")}
        </td>
      </tr>
    );
  }

  const dur = r.durability!;
  const phys = r.physical!;
  // 最良属性（最小確殺回数）
  const bestMagic = r.magic.reduce((a, b) => (b.hitsToKill < a.hitsToKill ? b : a));

  return (
    <tr className="border-t border-line align-middle">
      {/* Wave */}
      <td className="px-2 py-2 whitespace-nowrap font-semibold text-ink">W{r.wave.wave}</td>

      {/* モンスター */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-1.5">
          <span className={`px-1 rounded border text-[10px] ${elementBadge[r.element]}`}>
            {t(`game:element.${r.element}`)}
          </span>
          <span className="font-medium text-ink">{r.monsterName}</span>
          <span className="text-muted">×{r.wave.count ?? "?"}</span>
        </div>
      </td>

      {/* Lv / HP */}
      <td className="px-2 py-2 text-right whitespace-nowrap text-muted">
        <div>Lv {formatHitCount(r.level, lang)}</div>
        <div className="text-ink font-medium">HP {formatHitCount(r.hp, lang)}</div>
      </td>

      {/* 耐久 */}
      <td className="px-2 py-2 text-center whitespace-nowrap">
        <span className={`inline-block px-2 py-0.5 rounded-full border font-semibold ${survivalClass(dur.hitsSurvivable)}`}>
          {dur.nullified ? t("immune") : t("survive", { n: formatHitCount(dur.hitsSurvivable, lang) })}
        </span>
        <div className="text-[10px] text-muted mt-0.5">
          {dur.nullified
            ? `${dur.isPhysical ? t("phys") : t("mag")} 1〜9`
            : `${dur.isPhysical ? t("phys") : t("mag")} ${formatHitCount(dur.min, lang)}〜${formatHitCount(dur.max, lang)}`}
        </div>
      </td>

      {/* 物理 */}
      <td className="px-2 py-2 text-center whitespace-nowrap">
        <span className={`inline-block px-2 py-0.5 rounded-full border font-semibold ${killBadgeClass(phys.hitsToKill)}`}>
          {isFinite(phys.hitsToKill) ? t("killHits", { n: formatHitCount(phys.hitsToKill, lang) }) : t("cantKill")}
        </span>
        <div className="text-[10px] text-muted mt-0.5">
          {t("hit")} {phys.hitRate}% · ×{phys.multiHit}
        </div>
        {!isFinite(phys.hitsToKill) && (
          <div className="text-[10px] text-rose-500">{t("needAtk", { n: formatHitCount(phys.minAtk, lang) })}</div>
        )}
      </td>

      {/* 魔法（各属性） */}
      <td className="px-2 py-2">
        <div className="flex flex-wrap gap-1 justify-center">
          {r.magic.map((m) => {
            const isBest = isFinite(bestMagic.hitsToKill) && m.hitsToKill === bestMagic.hitsToKill;
            return (
              <span
                key={m.element}
                className={`px-1 rounded border text-[10px] leading-tight ${elementBadge[m.element]} ${
                  isBest ? "ring-1 ring-offset-0 ring-current font-bold" : "opacity-80"
                }`}
                title={t(`game:element.${m.element}`)}
              >
                {t(`game:element.${m.element}`)}
                {isFinite(m.hitsToKill) ? formatHitCount(m.hitsToKill, lang) : "×"}
              </span>
            );
          })}
        </div>
      </td>
    </tr>
  );
}
