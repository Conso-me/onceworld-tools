import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedState } from "../hooks/usePersistedState";
import { useSharedSimConfig } from "../hooks/useSharedSimConfig";
import { useSharedAttackBuffs } from "../hooks/useSharedAttackBuffs";
import { useSharedManualStats } from "../hooks/useSharedManualStats";
import { deriveAttackBuffs } from "../utils/attackBuffs";
import { calcStatus } from "../utils/statusCalc";
import { InputField } from "./ui/InputField";
import { PageLayout } from "./ui/layout/PageLayout";
import { SimConfigPanel } from "./SimConfigPanel";
import { AttackBuffFields } from "./damage/AttackBuffFields";
import { formatHitCount } from "../utils/formatNumber";
import {
  calcAllOfarmWaves,
  ELEMENTS,
  type OfarmPlayerStats,
  type OfarmWaveResult,
} from "../utils/ofarmCalc";
import { OFARM_WAVE_GROUPS } from "../data/ofarmWaves";
import type { Element } from "../types/game";

/** 自属性ボタン用の小バッジ色 */
const elementBtn: Record<Element, string> = {
  火: "bg-red-100 text-red-600 border-red-200",
  水: "bg-blue-100 text-blue-600 border-blue-200",
  木: "bg-green-100 text-green-600 border-green-200",
  光: "bg-yellow-100 text-yellow-700 border-yellow-200",
  闇: "bg-purple-100 text-purple-600 border-purple-200",
};

/** 属性のテキスト色（魔法列・モンスター属性ラベル用） */
const elementText: Record<Element, string> = {
  火: "text-red-600",
  水: "text-blue-600",
  木: "text-green-600",
  光: "text-yellow-700",
  闇: "text-purple-600",
};

/** Wave制限時間(10秒)内に殴れる現実的な上限回数。これを超えると倒しきれない扱い */
const TIME_LIMIT_HITS = 100;

/** 確殺回数 → 表示テキストと時間内可否 */
function killCell(hits: number, lang: string, overLimitLabel: string): { text: string; viable: boolean } {
  if (!isFinite(hits)) return { text: "✗", viable: false };
  if (hits > TIME_LIMIT_HITS) return { text: overLimitLabel, viable: false };
  return { text: formatHitCount(hits, lang), viable: true };
}

/** 確殺回数 → テキスト色（時間内に倒せる前提） */
function killTextClass(hits: number): string {
  if (hits <= 2) return "text-emerald-600";
  if (hits <= 20) return "text-amber-600";
  return "text-orange-600";
}

/** 耐えられる回数 → テキスト色 */
function survivalTextClass(hits: number): string {
  if (!isFinite(hits) || hits >= 10) return "text-emerald-600";
  if (hits >= 3) return "text-amber-600";
  return "text-rose-500";
}

export function OfarmSimulator({
  onNavigateToDamage,
}: {
  onNavigateToDamage?: (monsterName: string, level: number) => void;
}) {
  const { t, i18n } = useTranslation("ofarm");
  const lang = i18n.language;

  const [statMode, setStatMode] = usePersistedState<"manual" | "sim">("ofarm:statMode", "manual");
  const [manual, setManualField] = useSharedManualStats();

  const [simCfg, setSimField, resetSim, replaceAllSim] = useSharedSimConfig();
  const simResult = useMemo(() => calcStatus(simCfg), [simCfg]);

  const [attackBuffs, setAttackBuffField] = useSharedAttackBuffs();
  const derivedBuffs = useMemo(() => deriveAttackBuffs(attackBuffs), [attackBuffs]);

  // 敵への効果トグル
  // 暗殺者のカギ爪（物理のみ・互いのDEF=0・与ダメ×0.1）
  const [assassinClaw, setAssassinClaw] = usePersistedState("ofarm:assassinClaw", false);
  // 木魔法デバフ（敵DEF半減）・闇魔法デバフ（敵LUCK半減）
  const [woodMagicDef, setWoodMagicDef] = usePersistedState("ofarm:woodMagicDef", false);
  const [darkMagicLuck, setDarkMagicLuck] = usePersistedState("ofarm:darkMagicLuck", false);
  // 装備設定モードで武器が「暗殺者のカギ爪」なら自動ON（DamageCalculatorと同挙動）
  const equippedWeapon = statMode === "sim" ? simCfg.equipWeapon : "";
  useEffect(() => {
    if (equippedWeapon === "暗殺者のカギ爪") setAssassinClaw(true);
  }, [equippedWeapon, setAssassinClaw]);

  // 実効プレイヤーステータス
  const player: OfarmPlayerStats = useMemo(() => {
    const buffs = {
      magicBaseInt: derivedBuffs.magicBaseInt,
      crystalCubePreMult: derivedBuffs.crystalCubePreMult,
      toughouCubePreMult: derivedBuffs.toughouCubePreMult,
      assassinClaw,
      woodMagicDef,
      darkMagicLuck,
    };
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
        ...buffs,
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
      element: manual.element,
      ...buffs,
    };
  }, [statMode, simResult, simCfg.charElement, manual, derivedBuffs, assassinClaw, woodMagicDef, darkMagicLuck]);

  const results = useMemo(() => calcAllOfarmWaves(player), [player]);

  // グループの開閉
  const [openGroups, setOpenGroups] = usePersistedState<Record<string, boolean>>("ofarm:openGroups", {
    g1: true,
    g2: true,
    g3: true,
  });
  const toggleGroup = (id: string) => setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <PageLayout
      left={
      // ───── 左カラム: 入力パネル ─────
      <div className="space-y-6 lg:space-y-2">
        <div className="bg-card border border-line rounded-card shadow-sm p-6 lg:p-4 space-y-5 lg:space-y-3">
          {/* 手動 / 装備設定 トグル */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            {(["manual", "sim"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatMode(mode)}
                className={`flex-1 py-2 lg:py-1.5 font-medium transition-colors ${
                  statMode === mode ? "bg-blue-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {mode === "manual" ? t("statModeManual") : t("statModeSim")}
              </button>
            ))}
          </div>

          {/* 自属性 */}
          <div className="space-y-1.5">
            <label className="block text-sm lg:text-xs font-medium text-gray-600">{t("heroElement")}</label>
            <div className="flex gap-1.5">
              {ELEMENTS.map((el) => {
                const active = statMode === "sim" ? simCfg.charElement === el : manual.element === el;
                return (
                  <button
                    key={el}
                    onClick={() => (statMode === "sim" ? setSimField("charElement", el) : setManualField("element", el))}
                    className={`flex-1 py-2.5 lg:py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active ? elementBtn[el] : "bg-gray-50 text-gray-400 border-gray-200"
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
              <InputField label="VIT" value={manual.vit} onChange={(v) => setManualField("vit", v)} />
              <InputField label="SPD" value={manual.spd} onChange={(v) => setManualField("spd", v)} />
              <InputField label="ATK" value={manual.atk} onChange={(v) => setManualField("atk", v)} />
              <InputField label="INT" value={manual.int} onChange={(v) => setManualField("int", v)} />
              <InputField label="DEF" value={manual.def} onChange={(v) => setManualField("def", v)} />
              <InputField label="M-DEF" value={manual.mdef} onChange={(v) => setManualField("mdef", v)} />
              <InputField label="LUK" value={manual.luck} onChange={(v) => setManualField("luck", v)} />
            </div>
          )}

          {/* 装備設定モード */}
          {statMode === "sim" && (
            <SimConfigPanel cfg={simCfg} setField={setSimField} reset={resetSim} replaceAll={replaceAllSim} />
          )}

          {/* 攻撃バフ（全画面共有・両モード共通。ダメージ計算と同じく末尾に配置） */}
          <div className="pt-1 border-t border-gray-100">
            <AttackBuffFields buffs={attackBuffs} setField={setAttackBuffField} />
          </div>
        </div>
      </div>
      }
      right={
      // ───── 右カラム: Wave一覧 ─────
      <div className="space-y-2">
        {/* 敵への効果トグル */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500 mr-0.5">{t("enemyEffects")}</span>
          {([
            { on: assassinClaw, toggle: () => setAssassinClaw(!assassinClaw), label: i18n.t("damage:assassinClaw"), title: i18n.t("damage:assassinClawTitle"), color: "bg-orange-100 border-orange-300 text-orange-700" },
            { on: woodMagicDef, toggle: () => setWoodMagicDef(!woodMagicDef), label: i18n.t("damage:woodMagicDebuff"), title: i18n.t("damage:woodMagicDebuffTitle"), color: "bg-green-100 border-green-300 text-green-700" },
            { on: darkMagicLuck, toggle: () => setDarkMagicLuck(!darkMagicLuck), label: i18n.t("damage:darkMagicDebuff"), title: i18n.t("damage:darkMagicDebuffTitle"), color: "bg-purple-100 border-purple-300 text-purple-700" },
          ] as const).map((b, idx) => (
            <button
              key={idx}
              type="button"
              onClick={b.toggle}
              title={b.title}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                b.on ? `${b.color} font-medium` : "bg-gray-50 border-gray-200 text-gray-400"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 px-1">{t("hint")}</p>
        {OFARM_WAVE_GROUPS.map((group) => {
          const waves = results.filter((r) => r.wave.wave >= group.from && r.wave.wave <= group.to);
          const open = openGroups[group.id] ?? true;
          return (
            <div key={group.id} className="bg-card border border-line rounded-card shadow-sm overflow-hidden">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-700">
                  {t("waveRange", { from: group.from, to: group.to })}
                </span>
                <span className="text-gray-400 text-xs">{open ? "▼" : "▶"}</span>
              </button>
              {open && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse table-fixed min-w-[740px]">
                    <colgroup>
                      <col className="w-[40px]" />
                      <col className="w-[180px]" />
                      <col className="w-[88px]" />
                      <col className="w-[96px]" />
                      <col className="w-[64px]" />
                      <col className="w-[52px]" />
                      <col className="w-[52px]" />
                      <col className="w-[52px]" />
                      <col className="w-[52px]" />
                      <col className="w-[52px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                        <th rowSpan={2} className="px-2 py-2 text-left font-medium">{t("col.wave")}</th>
                        <th rowSpan={2} className="px-2 py-2 text-left font-medium">{t("col.monster")}</th>
                        <th rowSpan={2} className="px-2 py-2 text-right font-medium whitespace-nowrap">{t("col.lvhp")}</th>
                        <th rowSpan={2} className="px-2 py-2 text-center font-medium">{t("col.durability")}</th>
                        <th rowSpan={2} className="px-2 py-2 text-center font-medium border-l-2 border-l-gray-200">
                          {t("col.physical")}
                        </th>
                        <th colSpan={5} className="px-2 py-1 text-center font-medium border-l-2 border-l-gray-200">
                          {t("col.magic")}
                        </th>
                      </tr>
                      <tr className="bg-gray-50 text-xs border-b border-gray-200">
                        {ELEMENTS.map((el, i) => (
                          <th
                            key={el}
                            className={`px-1 py-1 text-center font-bold ${elementText[el]} ${
                              i === 0 ? "border-l-2 border-l-gray-200" : ""
                            }`}
                          >
                            {t(`game:element.${el}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {waves.map((r) => (
                        <WaveRow key={r.wave.wave} r={r} lang={lang} t={t} onMonsterClick={onNavigateToDamage} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* 凡例 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 px-2">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" />
            {t("legendSafe")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200 inline-block" />
            {t("legendDanger")}
          </span>
          <span>{t("legendOverLimit")}</span>
          <span className="ml-auto">{t("legendMagic")}</span>
        </div>
      </div>
      }
    />
  );
}

function WaveRow({
  r,
  lang,
  t,
  onMonsterClick,
}: {
  r: OfarmWaveResult;
  lang: string;
  t: ReturnType<typeof useTranslation>["t"];
  onMonsterClick?: (monsterName: string, level: number) => void;
}) {
  if (!r.found) {
    return (
      <tr className="border-b border-gray-100 text-sm">
        <td className="px-2 py-1.5 font-semibold text-gray-700">W{r.wave.wave}</td>
        <td className="px-2 py-1.5 text-gray-400" colSpan={9}>
          {r.monsterName} — {t("notRegistered")}
        </td>
      </tr>
    );
  }

  const dur = r.durability!;
  const phys = r.physical!;
  const overLimitLabel = t("overLimit");
  const physCell = killCell(phys.hitsToKill, lang, overLimitLabel);
  const magicCells = r.magic.map((m) => ({ ...m, ...killCell(m.hitsToKill, lang, overLimitLabel) }));
  const bestMagicHits = Math.min(...r.magic.map((m) => m.hitsToKill));
  // 時間内(100回以内)に倒せる手段が1つでもあるか
  const canClearInTime = physCell.viable || magicCells.some((m) => m.viable);

  // 行背景: 無効=緑 / 危険(耐久薄い or 時間内に倒せない)=赤 / それ以外=白
  const dangerous = (!dur.nullified && dur.hitsSurvivable < 3) || !canClearInTime;
  const rowBg = dur.nullified
    ? "bg-green-50 border-green-100"
    : dangerous
    ? "bg-red-100 border-red-200"
    : "bg-white border-gray-100";

  return (
    <tr className={`border-b ${rowBg} text-sm`}>
      {/* Wave */}
      <td className="px-2 py-1.5 font-semibold text-gray-700 whitespace-nowrap">W{r.wave.wave}</td>

      {/* モンスター */}
      <td className="px-2 py-1.5 leading-tight">
        <span className={`${elementText[r.element]} font-bold mr-1`}>{t(`game:element.${r.element}`)}</span>
        {r.found && onMonsterClick ? (
          <button
            type="button"
            onClick={() => onMonsterClick(r.monsterName, r.level)}
            className="font-medium text-indigo-600 hover:underline break-words text-left"
          >
            {r.monsterName}
          </button>
        ) : (
          <span className="font-medium text-gray-800 break-words">{r.monsterName}</span>
        )}
        <span className="text-gray-400 ml-1">×{r.wave.count ?? "?"}</span>
      </td>

      {/* Lv / HP */}
      <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums text-xs">
        <div className="text-gray-400">Lv {formatHitCount(r.level, lang)}</div>
        <div className="text-gray-700 font-medium">HP {formatHitCount(r.hp, lang)}</div>
      </td>

      {/* 耐久 */}
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        {dur.nullified ? (
          <span className="text-emerald-600 font-bold">✓ {t("immune")}</span>
        ) : (
          <span className={`font-semibold ${survivalTextClass(dur.hitsSurvivable)}`}>
            {t("survive", { n: formatHitCount(dur.hitsSurvivable, lang) })}
          </span>
        )}
        <div className="text-[11px] text-gray-400 mt-0.5">
          {dur.isPhysical ? t("phys") : t("mag")}{" "}
          {dur.nullified ? "1〜9" : `${formatHitCount(dur.min, lang)}〜${formatHitCount(dur.max, lang)}`}
        </div>
      </td>

      {/* 物理確殺回数（回数のみ） */}
      <td
        className={`px-2 py-1.5 text-center whitespace-nowrap tabular-nums border-l-2 border-l-gray-200 ${
          physCell.viable ? "" : "bg-rose-100"
        }`}
      >
        <span
          className={`font-semibold ${physCell.viable ? killTextClass(phys.hitsToKill) : "text-rose-500"}`}
        >
          {physCell.text}
        </span>
      </td>

      {/* 魔法確殺回数（各属性: 1列ずつ・回数のみ） */}
      {magicCells.map((m, i) => {
        const best = m.viable && m.hitsToKill === bestMagicHits;
        return (
          <td
            key={m.element}
            className={`px-1 py-1.5 text-center text-xs tabular-nums ${
              i === 0 ? "border-l-2 border-l-gray-200" : ""
            } ${
              m.viable
                ? `${elementText[m.element]} ${best ? "font-bold" : "opacity-70"}`
                : "text-rose-500 bg-rose-100"
            }`}
          >
            {m.text}
          </td>
        );
      })}
    </tr>
  );
}
