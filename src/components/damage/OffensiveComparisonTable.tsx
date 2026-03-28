import { useTranslation } from "react-i18next";
import type { Element } from "../../types/game";
import type { OffensiveComparisonRow } from "../../utils/multiDamageCalc";
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
}

export function OffensiveComparisonTable({ rows, onSelectMonster }: Props) {
  const { t, i18n } = useTranslation("damage");
  const lang = i18n.language;

  if (rows.length === 0) return null;

  const isMagic = rows[0].mode === "魔攻";

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 overflow-hidden">
      {/* ヘッダー */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide">
        <span>{t("common:monster")}</span>
        <span className="text-right w-24">{t("damage")}</span>
        <span className="text-right w-12">{t("hitsToKill")}</span>
        <span className="text-right w-10">OK</span>
      </div>

      {/* 行 */}
      <div className="divide-y divide-gray-100">
        {rows.map((row, idx) => {
          const isNullified = isMagic
            ? row.bestSpell?.dmg.isNullified ?? true
            : row.dmg?.isNullified ?? true;

          const killCount = isMagic
            ? row.bestSpell?.hitsToKill ?? Infinity
            : row.hitsToKill ?? Infinity;

          const dmgMin = isMagic
            ? row.bestSpell?.totalMin ?? 0
            : (row.dmg?.isNullified ? 1 : row.dmg?.min ?? 0);

          const dmgMax = isMagic
            ? row.bestSpell?.totalMax ?? 0
            : (row.dmg?.isNullified ? 9 : row.dmg?.max ?? 0);

          const overkill = isMagic ? false : row.overkillGuaranteed;

          const rowBg = isNullified
            ? "bg-gray-50"
            : killCount <= 1
              ? "bg-green-50"
              : "";

          return (
            <button
              key={idx}
              onClick={() => onSelectMonster(idx)}
              className={`w-full grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-3 py-2 text-left hover:bg-indigo-50 transition-colors items-center ${rowBg}`}
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
                  {isMagic && row.bestSpell && !isNullified && (
                    <span className="text-[10px] text-indigo-400">
                      {row.bestSpell.spell.name}
                    </span>
                  )}
                  {!isMagic && row.hitRate !== null && row.hitRate !== undefined && row.hitRate < 100 && (
                    <span className="text-[10px] text-orange-400">
                      {t("hitRate")} {row.hitRate}%
                    </span>
                  )}
                </div>
              </div>

              {/* ダメージ */}
              <div className="text-right w-24">
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
              <div className="text-right w-12">
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
