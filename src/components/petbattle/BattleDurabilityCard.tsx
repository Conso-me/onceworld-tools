import { useTranslation } from "react-i18next";
import type { PetBattleResult } from "../../utils/petBattleCalc";

export interface BattleDurabilityCardProps {
  result: PetBattleResult;
  spdA: number;
  spdB: number;
}

function formatTurns(n: number, infLabel: string): string {
  if (!Number.isFinite(n)) return infLabel;
  return n.toLocaleString();
}

export function BattleDurabilityCard({ result, spdA, spdB }: BattleDurabilityCardProps) {
  const { t } = useTranslation("petbattle");
  const { aToB, bToA, initiative, prediction } = result;
  const inf = t("durability.infinity");

  const predictionLabel =
    prediction.winner === "A"
      ? t("prediction.winA")
      : prediction.winner === "B"
        ? t("prediction.winB")
        : t("prediction.draw");

  const predictionBadge =
    prediction.winner === "A"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : prediction.winner === "B"
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : "bg-gray-100 text-gray-600 border-gray-200";

  const initiativeLabel =
    initiative === "A" ? "A" : initiative === "B" ? "B" : t("initiative.tied");

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
      <h3 className="text-sm font-bold text-gray-700">{t("durability.title")}</h3>

      {/* 勝敗予測バッジ */}
      <div className={`rounded-lg border px-3 py-2 ${predictionBadge}`}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium opacity-80">{t("prediction.label")}</span>
          <span className="text-base font-bold">
            {predictionLabel}
            {Number.isFinite(prediction.turnsToWin) && (
              <span className="text-xs font-medium ml-1.5 opacity-80">
                ({t("prediction.turnsToWin", { n: prediction.turnsToWin })})
              </span>
            )}
          </span>
        </div>
        {prediction.note && (
          <div className="text-[11px] mt-1 opacity-80">
            {t(`prediction.note.${prediction.note}`)}
          </div>
        )}
      </div>

      {/* 先攻表示 */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
        <span className="text-[11px] font-medium text-gray-500">{t("initiative.label")}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-gray-800">{initiativeLabel}</span>
          <span className="text-[10px] text-gray-400 tabular-nums">
            {t("initiative.detail", { spdA: spdA.toLocaleString(), spdB: spdB.toLocaleString() })}
          </span>
        </div>
      </div>

      {/* 耐久テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[10px] text-gray-500">
              <th className="text-left px-2 py-1.5 border border-gray-100">{t("durability.direction")}</th>
              <th className="text-right px-2 py-1.5 border border-gray-100">{t("durability.worst")}</th>
              <th className="text-right px-2 py-1.5 border border-gray-100">{t("durability.best")}</th>
              <th className="text-right px-2 py-1.5 border border-gray-100">{t("durability.expectedWithMiss")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2 py-1.5 border border-gray-100 font-medium text-blue-700">{t("damage.aToB")}</td>
              <td className="px-2 py-1.5 border border-gray-100 text-right tabular-nums font-bold text-gray-800">
                {t("durability.turns", { n: formatTurns(aToB.hitsToKill.worst, inf) })}
              </td>
              <td className="px-2 py-1.5 border border-gray-100 text-right tabular-nums text-gray-500">
                {t("durability.turns", { n: formatTurns(aToB.hitsToKill.best, inf) })}
              </td>
              <td className="px-2 py-1.5 border border-gray-100 text-right tabular-nums text-gray-500">
                {t("durability.turns", { n: formatTurns(aToB.expectedTurnsWithMiss, inf) })}
              </td>
            </tr>
            <tr className="bg-gray-50/50">
              <td className="px-2 py-1.5 border border-gray-100 font-medium text-orange-700">{t("damage.bToA")}</td>
              <td className="px-2 py-1.5 border border-gray-100 text-right tabular-nums font-bold text-gray-800">
                {t("durability.turns", { n: formatTurns(bToA.hitsToKill.worst, inf) })}
              </td>
              <td className="px-2 py-1.5 border border-gray-100 text-right tabular-nums text-gray-500">
                {t("durability.turns", { n: formatTurns(bToA.hitsToKill.best, inf) })}
              </td>
              <td className="px-2 py-1.5 border border-gray-100 text-right tabular-nums text-gray-500">
                {t("durability.turns", { n: formatTurns(bToA.expectedTurnsWithMiss, inf) })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
