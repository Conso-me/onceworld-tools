import { useTranslation } from "react-i18next";
import type { Element } from "../../types/game";
import type { DefensiveComparisonRow } from "../../utils/multiDamageCalc";
import { formatHitCount } from "../../utils/formatNumber";
import { DefenseMaxSummary } from "./DefenseMaxSummary";

const elementColors: Record<Element, string> = {
  火: "bg-red-100 text-red-600",
  水: "bg-blue-100 text-blue-600",
  木: "bg-green-100 text-green-600",
  光: "bg-yellow-100 text-yellow-700",
  闇: "bg-purple-100 text-purple-600",
};

interface Props {
  rows: DefensiveComparisonRow[];
  onSelectMonster: (index: number) => void;
}

export function DefensiveComparisonTable({ rows, onSelectMonster }: Props) {
  const { t, i18n } = useTranslation("damage");
  const lang = i18n.language;

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
    <DefenseMaxSummary rows={rows} />
    <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 overflow-hidden">
      {/* ヘッダー */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide">
        <span>{t("common:monster")}</span>
        <span className="w-20 whitespace-nowrap">無効化</span>
        <span className="w-28">{t("defensePanel.currentDamage")}</span>
        <span className="w-24 whitespace-nowrap">{t("defensePanel.survivableHits")}</span>
        <span className="w-12"></span>
      </div>

      {/* 行 */}
      <div className="divide-y divide-gray-100">
        {rows.map((row, idx) => {
          const isDanger = row.hitsToTake !== null && row.hitsToTake.worst <= 1;
          const isOneHit = row.hitsToTake !== null && row.hitsToTake.best === 0;

          const rowBg = row.nullified
            ? "bg-green-50"
            : isDanger
              ? "bg-red-50"
              : "";

          return (
            <button
              key={idx}
              onClick={() => onSelectMonster(idx)}
              className={`w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 px-3 py-2 text-left hover:bg-indigo-50 transition-colors items-center ${rowBg}`}
            >
              {/* モンスター名 + 属性 + Lv + 攻撃種 */}
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
                    {row.enemyIsPhysical ? "ATK" : "INT"} {formatHitCount(row.enemyStat, lang)}
                  </span>
                  {row.enemyMultiHit > 1 && (
                    <span className="text-[10px] text-gray-400">
                      ×{row.enemyMultiHit}
                    </span>
                  )}
                </div>
              </div>

              {/* 無効化に必要なDEF/MDEF */}
              <div className="text-right w-20">
                <div className={`text-xs font-semibold tabular-nums ${row.nullified ? "text-green-600" : "text-gray-700"}`}>
                  {row.enemyIsPhysical ? "DEF" : "MDEF"}
                </div>
                <div className={`text-xs font-bold tabular-nums ${row.nullified ? "text-green-600" : "text-gray-800"}`}>
                  {row.nullifyDef.toLocaleString()}
                </div>
                {!row.nullified && row.additionalDefNeeded > 0 && (
                  <div className="text-[10px] text-orange-500 tabular-nums whitespace-nowrap">
                    あと{Math.ceil(row.additionalDefNeeded).toLocaleString()}
                  </div>
                )}
                {row.nullified && (
                  <div className="text-[10px] text-green-600">達成</div>
                )}
              </div>

              {/* 被ダメ */}
              <div className="w-28">
                {row.nullified ? (
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                    <span className="tabular-nums text-xs text-green-600 font-medium text-right">1</span>
                    <span className="text-xs text-green-600 font-medium px-0.5">〜</span>
                    <span className="tabular-nums text-xs text-green-600 font-medium text-right">9</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                    <span className="tabular-nums text-sm font-semibold text-red-500 text-right whitespace-nowrap">
                      {formatHitCount(row.currentDmg.min, lang)}
                    </span>
                    <span className="text-sm font-semibold text-red-500 px-0.5">〜</span>
                    <span className="tabular-nums text-sm font-semibold text-red-500 text-right whitespace-nowrap">
                      {formatHitCount(row.currentDmg.max, lang)}
                    </span>
                  </div>
                )}
              </div>

              {/* 耐えられる回数 */}
              <div className="text-right w-24">
                {row.nullified ? (
                  <span className="text-xs text-green-600 font-medium">{t("defensePanel.nullifyAchieved")}</span>
                ) : row.hitsToTake ? (
                  <span className={`text-xs font-semibold tabular-nums ${
                    isDanger ? "text-red-600" : "text-blue-600"
                  }`}>
                    {row.hitsToTake.worst}〜{row.hitsToTake.best}{t("common:times")}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </div>

              {/* 危険マーク */}
              <div className="text-right w-12">
                {isDanger && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    isOneHit
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-600"
                  }`}>
                    {isOneHit ? "💀" : "⚠️"}
                  </span>
                )}
                {row.nullified && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 font-bold">
                    ✓
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
    </div>
  );
}
