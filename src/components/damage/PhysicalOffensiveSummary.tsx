import { useTranslation } from "react-i18next";
import type { OffensiveComparisonRow } from "../../utils/multiDamageCalc";
import { calcMinAtkToHit } from "../../utils/damageCalc";

interface Props {
  rows: OffensiveComparisonRow[];
  playerAtk: number;
  playerLuck: number;
}

export function PhysicalOffensiveSummary({ rows, playerAtk, playerLuck }: Props) {
  const { t } = useTranslation(["damage", "common"]);
  const physRows = rows.filter((r) => r.mode === "物理" && r.dmg !== undefined);
  if (physRows.length === 0) return null;

  const hardestRow = physRows.reduce((hardest, r) => {
    const effDef = r.scaled.scaledDef + r.scaled.scaledMdef / 10;
    const hardestEffDef = hardest.scaled.scaledDef + hardest.scaled.scaledMdef / 10;
    return effDef > hardestEffDef ? r : hardest;
  });
  const minAtkNeeded = calcMinAtkToHit(hardestRow.scaled.scaledDef, hardestRow.scaled.scaledMdef);
  const atkShortfall = Math.max(0, minAtkNeeded - playerAtk);
  const atkAchieved = atkShortfall <= 0;

  const hardestLuckRow = physRows.reduce((max, r) =>
    (r.requiredHitLuck ?? 0) > (max.requiredHitLuck ?? 0) ? r : max
  );
  const requiredLuck = hardestLuckRow.requiredHitLuck ?? 0;
  const luckShortfall = Math.max(0, requiredLuck - playerLuck);
  const luckAchieved = luckShortfall <= 0;
  const hitRate = hardestLuckRow.hitRate;

  const toughestLabel = t("damage:toughestEnemyDamage", { name: hardestRow.scaled.name });
  const maxLuckLabel = t("damage:maxLuckEnemyHit", { name: hardestLuckRow.scaled.name });

  return (
    <div className="bg-indigo-50 rounded-2xl px-4 py-3 border border-indigo-100">
      <div className="text-xs font-bold text-indigo-600 mb-2">{t("damage:physMaxSummary")}</div>
      <div className="grid grid-cols-2 gap-3">

        <div className="bg-white rounded-xl px-3 py-2 col-span-1">
          <div className="text-[10px] text-gray-400 font-medium mb-0.5 truncate" title={toughestLabel}>
            {toughestLabel}
          </div>
          {hardestRow.dmg?.isNullified ? (
            <div className="text-sm font-semibold text-gray-400">{t("damage:nullifiedShort")}</div>
          ) : (
            <div className="text-base font-bold text-gray-800 tabular-nums">
              {hardestRow.dmg!.min.toLocaleString()}〜{hardestRow.dmg!.max.toLocaleString()}
            </div>
          )}
          <div className="mt-1">
            <div className="text-[10px] text-gray-400">{t("damage:atkToPenetrate")}</div>
            <div className={`text-sm font-bold tabular-nums ${atkAchieved ? "text-green-600" : "text-gray-800"}`}>
              {minAtkNeeded.toLocaleString()}
            </div>
            {playerAtk > 0 && (
              <div className={`text-xs tabular-nums font-medium ${atkAchieved ? "text-green-600" : "text-orange-500"}`}>
                {atkAchieved ? t("common:achievedDone") : t("common:remaining", { value: atkShortfall.toLocaleString() })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl px-3 py-2 col-span-1">
          <div className="text-[10px] text-gray-400 font-medium mb-0.5 truncate" title={maxLuckLabel}>
            {maxLuckLabel}
          </div>
          {hitRate !== null && hitRate !== undefined ? (
            <div className={`text-base font-bold tabular-nums ${hitRate === 100 ? "text-green-600" : hitRate < 50 ? "text-red-500" : "text-gray-800"}`}>
              {hitRate}%
            </div>
          ) : (
            <div className="text-base font-bold text-green-600">100%</div>
          )}
          <div className="mt-1">
            <div className="text-[10px] text-gray-400">{t("damage:luckForFullHit")}</div>
            <div className={`text-sm font-bold tabular-nums ${luckAchieved ? "text-green-600" : "text-gray-800"}`}>
              {requiredLuck.toLocaleString()}
            </div>
            {playerLuck > 0 && (
              <div className={`text-xs tabular-nums font-medium ${luckAchieved ? "text-green-600" : "text-orange-500"}`}>
                {luckAchieved ? t("common:achievedDone") : t("common:remaining", { value: luckShortfall.toLocaleString() })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
