import { useTranslation } from "react-i18next";
import type { OffensiveComparisonRow } from "../../utils/multiDamageCalc";
import { calcIntForKill } from "../../utils/damageCalc";

interface Props {
  rows: OffensiveComparisonRow[];
  selectedSpellName: string | null;
  currentInt: number;
  currentCubeCount: number;
  magicBaseInt: number;
  crystalCubeFinalMult: number;
}

export function MagicOffensiveSummary({
  rows,
  selectedSpellName,
  currentInt,
  currentCubeCount,
  magicBaseInt,
  crystalCubeFinalMult,
}: Props) {
  const { t } = useTranslation(["damage", "common"]);
  const magicRows = rows.filter((r) => r.mode === "魔攻" && r.spellResults !== undefined);
  if (magicRows.length === 0) return null;

  const rowsWithSpell = magicRows
    .map((row) => {
      const activeSpell = selectedSpellName
        ? (row.spellResults?.find((r) => r.spell.name === selectedSpellName) ?? row.bestSpell)
        : row.bestSpell;
      return { row, activeSpell };
    })
    .filter((x) => x.activeSpell && !x.activeSpell.dmg.isNullified);

  if (rowsWithSpell.length === 0) return null;

  const hardestByKill = rowsWithSpell.reduce((max, x) =>
    (x.activeSpell!.hitsToKill ?? Infinity) > (max.activeSpell?.hitsToKill ?? Infinity) ? x : max
  );

  const hardestByInt = rowsWithSpell.reduce((max, x) =>
    x.activeSpell!.overkillStatNeeded > max.activeSpell!.overkillStatNeeded ? x : max
  );
  const maxOverkillInt = hardestByInt.activeSpell!.overkillStatNeeded;
  const intShortfall = Math.max(0, maxOverkillInt - currentInt);
  const intAchieved = currentInt > 0 && intShortfall <= 0;

  let maxCubesNeeded = 0;
  let hardestByCubeName = rowsWithSpell[0].row.scaled.name;
  let isUnachievable = false;

  if (currentInt > 0) {
    for (const { row, activeSpell } of rowsWithSpell) {
      if (!activeSpell) continue;
      let cubesForThis: number | null = null;
      for (let cubes = 0; cubes <= 1000; cubes++) {
        const effectiveMult = activeSpell.spell.multiplier * (1 + cubes * 0.01);
        const intNeeded = calcIntForKill(
          row.scaled.hp * 10,
          row.scaled.scaledDef,
          row.scaled.scaledMdef,
          row.affinity,
          effectiveMult,
          magicBaseInt,
          activeSpell.spell.hits,
          crystalCubeFinalMult
        );
        if (intNeeded <= currentInt) {
          cubesForThis = cubes;
          break;
        }
      }
      if (cubesForThis === null) {
        isUnachievable = true;
        hardestByCubeName = row.scaled.name;
        break;
      }
      if (cubesForThis > maxCubesNeeded) {
        maxCubesNeeded = cubesForThis;
        hardestByCubeName = row.scaled.name;
      }
    }
  }

  const cubeShortfall = !isUnachievable ? Math.max(0, maxCubesNeeded - currentCubeCount) : null;
  const cubeAchieved = currentInt > 0 && !isUnachievable && cubeShortfall === 0;

  const mostKillLabel = t("damage:mostHitsToKill", { name: hardestByKill.row.scaled.name });
  const overkillIntLabel = t("damage:overkillIntFor", { name: hardestByInt.row.scaled.name });
  const overkillCubesLabel = t("damage:overkillCubesFor", { name: hardestByCubeName });

  return (
    <div className="bg-indigo-50 rounded-2xl px-4 py-3 border border-indigo-100">
      <div className="text-xs font-bold text-indigo-600 mb-2">{t("damage:magicSummary")}</div>
      <div className="grid grid-cols-2 gap-3">

        <div className="bg-white rounded-xl px-3 py-2">
          <div className="text-[10px] text-gray-400 font-medium mb-0.5 truncate" title={mostKillLabel}>
            {mostKillLabel}
          </div>
          <div className="text-base font-bold text-gray-800 tabular-nums">
            {hardestByKill.activeSpell!.totalMin.toLocaleString()}〜{hardestByKill.activeSpell!.totalMax.toLocaleString()}
          </div>
          <div className="text-xs tabular-nums text-gray-500 font-medium mt-0.5">
            {hardestByKill.activeSpell!.hitsToKill === Infinity
              ? t("damage:cannotKill")
              : t("damage:nHitsKillSimple", { n: hardestByKill.activeSpell!.hitsToKill })}
          </div>
        </div>

        <div className="bg-white rounded-xl px-3 py-2 space-y-2">
          <div>
            <div className="text-[10px] text-gray-400 font-medium truncate" title={overkillIntLabel}>
              {overkillIntLabel}
            </div>
            <div className="text-base font-bold text-orange-600 tabular-nums">
              {maxOverkillInt.toLocaleString()}
            </div>
            {currentInt > 0 && (
              <div className={`text-xs tabular-nums font-medium ${intAchieved ? "text-green-600" : "text-orange-500"}`}>
                {intAchieved ? t("common:achievedDone") : t("common:remaining", { value: intShortfall.toLocaleString() })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          <div>
            <div className="text-[10px] text-gray-400 font-medium truncate" title={overkillCubesLabel}>
              {overkillCubesLabel}
            </div>
            {currentInt === 0 ? (
              <div className="text-[10px] text-gray-400 mt-0.5">{t("damage:setIntForDisplay")}</div>
            ) : isUnachievable ? (
              <>
                <div className="text-sm font-bold text-red-500">{t("damage:impossible")}</div>
                <div className="text-[10px] text-gray-400">{t("damage:cubesShortfall1k")}</div>
              </>
            ) : (
              <>
                <div className="text-base font-bold text-purple-600 tabular-nums">
                  {maxCubesNeeded.toLocaleString()}{t("common:units")}
                </div>
                <div className={`text-xs tabular-nums font-medium ${cubeAchieved ? "text-green-600" : "text-purple-500"}`}>
                  {cubeAchieved ? t("common:achievedDone") : t("common:remaining", { value: `${cubeShortfall!.toLocaleString()}${t("common:units")}` })}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
