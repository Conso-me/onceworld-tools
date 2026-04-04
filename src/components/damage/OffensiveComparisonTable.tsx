import { useTranslation } from "react-i18next";
import type { Element } from "../../types/game";
import type { OffensiveComparisonRow } from "../../utils/multiDamageCalc";
import { MAGIC_SPELLS } from "../../data/magicSpells";
import { formatHitCount } from "../../utils/formatNumber";

const elementColors: Record<Element, string> = {
  火: "bg-red-100 text-red-600",
  水: "bg-blue-100 text-blue-600",
  木: "bg-green-100 text-green-600",
  光: "bg-yellow-100 text-yellow-700",
  闇: "bg-purple-100 text-purple-600",
};

interface Props {
  rows: OffensiveComparisonRow[];
  onSelectMonster: (index: number) => void;
  selectedSpellName: string | null;
  onSpellSelect: (name: string | null) => void;
}

export function OffensiveComparisonTable({ rows, onSelectMonster, selectedSpellName, onSpellSelect }: Props) {
  const { t, i18n } = useTranslation("damage");
  const lang = i18n.language;

  if (rows.length === 0) return null;

  const isMagic = rows[0].mode === "魔攻";
  const isPhysical = rows[0].mode === "物理";

  const gridCols = isPhysical
    ? "grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]"
    : "grid-cols-[minmax(0,1fr)_auto_auto_auto]";

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 overflow-hidden">
      {/* 魔法選択 */}
      {isMagic && (
        <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onSpellSelect(null)}
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${
              selectedSpellName === null
                ? "bg-indigo-600 text-white"
                : "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100"
            }`}
          >
            自動
          </button>
          {MAGIC_SPELLS.map((spell) => (
            <button
              key={spell.name}
              onClick={() => onSpellSelect(spell.name)}
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                selectedSpellName === spell.name
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100"
              }`}
            >
              {spell.name}
            </button>
          ))}
        </div>
      )}
      {/* ヘッダー */}
      <div className={`grid ${gridCols} gap-x-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide`}>
        <span>{t("common:monster")}</span>
        {isPhysical && <span className="text-right w-20 whitespace-nowrap">必要LUCK</span>}
        <span className="text-right w-32 whitespace-nowrap">{t("damage")}</span>
        <span className="text-right w-16 whitespace-nowrap">{t("hitsToKill")}</span>
        <span className="text-right w-10">OK</span>
      </div>

      {/* 行 */}
      <div className="divide-y divide-gray-100">
        {rows.map((row, idx) => {
          const activeSpell = isMagic
            ? (selectedSpellName
                ? (row.spellResults?.find((r) => r.spell.name === selectedSpellName) ?? row.bestSpell)
                : row.bestSpell)
            : undefined;

          const isNullified = isMagic
            ? activeSpell?.dmg.isNullified ?? true
            : row.dmg?.isNullified ?? true;

          const killCount = isMagic
            ? activeSpell?.hitsToKill ?? Infinity
            : row.hitsToKill ?? Infinity;

          const dmgMin = isMagic
            ? activeSpell?.totalMin ?? 0
            : (row.dmg?.isNullified ? 1 : row.dmg?.min ?? 0);

          const dmgMax = isMagic
            ? activeSpell?.totalMax ?? 0
            : (row.dmg?.isNullified ? 9 : row.dmg?.max ?? 0);

          const overkill = isMagic ? false : row.overkillGuaranteed;

          const rowBg = isNullified
            ? "bg-gray-50"
            : killCount <= 1
              ? "bg-green-50"
              : "";

          const luckAchieved = row.additionalLuckNeeded === 0;

          return (
            <button
              key={idx}
              onClick={() => onSelectMonster(idx)}
              className={`w-full grid ${gridCols} gap-x-2 px-3 py-2 text-left hover:bg-indigo-50 transition-colors items-center ${rowBg}`}
            >
              {/* モンスター名 + 属性 + Lv */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${elementColors[row.scaled.element]}`}>
                    {t(`game:element.${row.scaled.element}`)}
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {row.scaled.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400">
                    Lv{row.entry.level.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    HP {formatHitCount(row.scaled.hp, lang)}
                  </span>
                  {isMagic && activeSpell && !isNullified && (
                    <span className="text-[10px] text-indigo-400">
                      {activeSpell.spell.name}
                      {selectedSpellName === null && " (最良)"}
                    </span>
                  )}
                  {!isMagic && row.hitRate !== null && row.hitRate !== undefined && row.hitRate < 100 && (
                    <span className="text-[10px] text-orange-400">
                      {t("hitRate")} {row.hitRate}%
                    </span>
                  )}
                </div>
              </div>

              {/* 必要LUCK（物理のみ） */}
              {isPhysical && (
                <div className="text-right w-20">
                  <div className={`text-xs font-bold tabular-nums ${luckAchieved ? "text-green-600" : "text-gray-800"}`}>
                    {(row.requiredHitLuck ?? 0).toLocaleString()}
                  </div>
                  {!luckAchieved && row.additionalLuckNeeded !== undefined && row.additionalLuckNeeded > 0 && (
                    <div className="text-[10px] text-orange-500 tabular-nums whitespace-nowrap">
                      あと{row.additionalLuckNeeded.toLocaleString()}
                    </div>
                  )}
                  {luckAchieved && (
                    <div className="text-[10px] text-green-600">達成</div>
                  )}
                </div>
              )}

              {/* ダメージ */}
              <div className="text-right w-32">
                {isNullified ? (
                  <span className="text-xs text-gray-400">{t("cannotPenetrate")}</span>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-gray-700 tabular-nums">
                      {formatHitCount(dmgMin, lang)}〜{formatHitCount(dmgMax, lang)}
                    </span>
                  </div>
                )}
              </div>

              {/* 確殺 */}
              <div className="text-right w-16">
                {isNullified ? (
                  <span className="text-xs text-gray-300">—</span>
                ) : (
                  <span className={`text-xs font-semibold tabular-nums ${
                    killCount <= 1 ? "text-green-600" : killCount <= 3 ? "text-blue-600" : "text-gray-500"
                  }`}>
                    {killCount === Infinity ? "∞" : `${killCount}${t("common:times")}`}
                  </span>
                )}
              </div>

              {/* OK */}
              <div className="text-right w-10">
                {overkill && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-bold">
                    OK
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
