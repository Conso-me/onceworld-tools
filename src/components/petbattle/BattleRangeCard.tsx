import { useTranslation } from "react-i18next";
import type { RangePhaseResult } from "../../utils/petBattleCalc";

interface BattleRangeCardProps {
  rangePhase: RangePhaseResult;
}

export function BattleRangeCard({ rangePhase }: BattleRangeCardProps) {
  const { t } = useTranslation("petbattle");
  const { advantageSide, preContactTime, preContactAttacks, preContactDamageAvg,
    preContactDamageMin, preContactDamageMax, hpPctDealtAvg, rangeA, rangeB, moveSpeedA, moveSpeedB } = rangePhase;

  const pctDisplay = Math.round(hpPctDealtAvg * 100);
  const badgeColor =
    advantageSide === "A" ? "bg-blue-100 text-blue-700 border-blue-200" :
    advantageSide === "B" ? "bg-orange-100 text-orange-700 border-orange-200" :
    "bg-gray-100 text-gray-600 border-gray-200";

  const advantageLabel =
    advantageSide === "A" ? t("range.advantageA") :
    advantageSide === "B" ? t("range.advantageB") :
    t("range.noAdvantage");

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">{t("range.title")}</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {advantageLabel}
        </span>
      </div>

      {/* レンジ・速度情報 */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5 space-y-0.5">
          <div className="font-semibold text-blue-700">A</div>
          <div className="text-gray-600">{t("range.attackRange")}: <span className="tabular-nums font-medium text-gray-800">{rangeA}</span></div>
          <div className="text-gray-600">{t("range.moveSpeed")}: <span className="tabular-nums font-medium text-gray-800">{Math.round(moveSpeedA)}</span></div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-lg px-2 py-1.5 space-y-0.5">
          <div className="font-semibold text-orange-700">B</div>
          <div className="text-gray-600">{t("range.attackRange")}: <span className="tabular-nums font-medium text-gray-800">{rangeB}</span></div>
          <div className="text-gray-600">{t("range.moveSpeed")}: <span className="tabular-nums font-medium text-gray-800">{Math.round(moveSpeedB)}</span></div>
        </div>
      </div>

      {/* 先制フェーズ結果 */}
      {advantageSide !== "none" ? (
        <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("range.preContactTime")}</span>
            <span className="font-semibold tabular-nums">{preContactTime.toFixed(1)} {t("range.seconds")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t("range.preContactAttacks")}</span>
            <span className="font-semibold tabular-nums">{preContactAttacks} {t("range.hits")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t("range.preContactDamage")}</span>
            <span className="font-semibold tabular-nums text-gray-800">
              {Math.round(preContactDamageMin).toLocaleString()} ～ {Math.round(preContactDamageMax).toLocaleString()}
              <span className="text-gray-400 ml-1">({t("range.avg")} {Math.round(preContactDamageAvg).toLocaleString()})</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t("range.hpPct")}</span>
            <span className={`font-bold tabular-nums ${pctDisplay >= 100 ? "text-red-600" : pctDisplay >= 50 ? "text-orange-600" : "text-gray-800"}`}>
              {pctDisplay >= 100 ? t("range.instant") : `${pctDisplay}%`}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center text-xs text-gray-400 py-1">{t("range.equalRange")}</div>
      )}
    </div>
  );
}
