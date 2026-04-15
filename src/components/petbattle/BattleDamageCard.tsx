import { useTranslation } from "react-i18next";
import type { AttackOutcome } from "../../utils/petBattleCalc";

export interface BattleDamageCardProps {
  label: string;
  outcome: AttackOutcome;
  color: "blue" | "orange";
}

const colorClasses = {
  blue: {
    card: "bg-blue-50 border-blue-100",
    header: "text-blue-700",
    accent: "text-blue-700",
  },
  orange: {
    card: "bg-orange-50 border-orange-100",
    header: "text-orange-700",
    accent: "text-orange-700",
  },
};

const affinityClasses: Record<string, string> = {
  weakness: "bg-green-100 text-green-700 border-green-200",
  resistance: "bg-red-100 text-red-600 border-red-200",
  neutral: "bg-gray-100 text-gray-500 border-gray-200",
};

function affinityKind(affinity: number): "weakness" | "resistance" | "neutral" {
  if (affinity > 1) return "weakness";
  if (affinity < 1) return "resistance";
  return "neutral";
}

export function BattleDamageCard({ label, outcome, color }: BattleDamageCardProps) {
  const { t } = useTranslation("petbattle");
  const { t: tGame } = useTranslation("game");
  const c = colorClasses[color];
  const kind = affinityKind(outcome.elementAffinity);
  const hitRateColor = outcome.hitRate >= 100 ? "text-gray-500" : outcome.hitRate >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className={`rounded-xl border ${c.card} p-3 space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`text-sm font-bold ${c.header}`}>{label}</div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/80 border border-gray-200 text-gray-600">
            {tGame(`attackType.${outcome.attackType}`)}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${affinityClasses[kind]}`}>
            {t(`damage.affinity.${kind}`)} ×{outcome.elementAffinity}
          </span>
        </div>
      </div>

      {outcome.isNullified ? (
        <div className="text-xs text-red-500 font-medium bg-white/70 rounded-lg px-2 py-1.5 text-center">
          {t("damage.nullified")}
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* メインダメージ: avg 大きく、min〜max sub */}
          <div className="bg-white/70 rounded-lg px-2 py-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-gray-500">{t("damage.perHit")}</span>
              <span className={`text-lg font-bold tabular-nums ${c.accent}`}>
                {outcome.damage.avg.toLocaleString()}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 tabular-nums text-right">
              {outcome.damage.min.toLocaleString()} 〜 {outcome.damage.max.toLocaleString()}
            </div>
          </div>

          {/* 1ターン総ダメ */}
          <div className="bg-white/70 rounded-lg px-2 py-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-gray-500">{t("damage.perTurn")}</span>
              <span className="text-sm font-semibold tabular-nums text-gray-700">
                {outcome.perTurn.avg.toLocaleString()}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 tabular-nums text-right">
              {outcome.perTurn.min.toLocaleString()} 〜 {outcome.perTurn.max.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* メタ情報 */}
      <div className="flex flex-wrap gap-1 text-[10px]">
        <span className="px-1.5 py-0.5 rounded-full bg-white/80 border border-gray-200 text-gray-600">
          {t("damage.multiHit", { n: outcome.multiHit })}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full bg-white/80 border border-gray-200 ${hitRateColor}`}>
          {t("damage.hitRate", { rate: outcome.hitRate })}
        </span>
        {outcome.damage.hasCrit && !outcome.isNullified && (
          <span className="px-1.5 py-0.5 rounded-full bg-white/80 border border-gray-200 text-gray-600">
            {t("damage.crit", { avg: outcome.damage.critAvg.toLocaleString() })}
          </span>
        )}
        <span className="px-1.5 py-0.5 rounded-full bg-white/80 border border-gray-200 text-gray-500">
          {t("damage.effectiveDef", { value: outcome.effectiveDef.toLocaleString() })}
        </span>
      </div>
    </div>
  );
}
