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

  // 与ダメ判定: 最も倒しにくい敵（hitsToKill 最大）
  const hardestByKill = rowsWithSpell.reduce((max, x) =>
    (x.activeSpell!.hitsToKill ?? Infinity) > (max.activeSpell?.hitsToKill ?? Infinity) ? x : max
  );

  // OverKill必要INT: overkillStatNeeded が最大の敵
  const hardestByInt = rowsWithSpell.reduce((max, x) =>
    x.activeSpell!.overkillStatNeeded > max.activeSpell!.overkillStatNeeded ? x : max
  );
  const maxOverkillInt = hardestByInt.activeSpell!.overkillStatNeeded;
  const intShortfall = Math.max(0, maxOverkillInt - currentInt);
  const intAchieved = currentInt > 0 && intShortfall <= 0;

  // OverKill必要キューブ: 現在のINTで各モンスターをOKするための最小キューブ数
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

  return (
    <div className="bg-indigo-50 rounded-2xl px-4 py-3 border border-indigo-100">
      <div className="text-xs font-bold text-indigo-600 mb-2">魔法攻撃 サマリー</div>
      <div className="grid grid-cols-2 gap-3">

        {/* 与ダメ判定: 最も倒しにくい敵 */}
        <div className="bg-white rounded-xl px-3 py-2">
          <div
            className="text-[10px] text-gray-400 font-medium mb-0.5 truncate"
            title={`最多確殺（${hardestByKill.row.scaled.name}）`}
          >
            最多確殺（{hardestByKill.row.scaled.name}）
          </div>
          <div className="text-base font-bold text-gray-800 tabular-nums">
            {hardestByKill.activeSpell!.totalMin.toLocaleString()}〜{hardestByKill.activeSpell!.totalMax.toLocaleString()}
          </div>
          <div className="text-xs tabular-nums text-gray-500 font-medium mt-0.5">
            {hardestByKill.activeSpell!.hitsToKill === Infinity
              ? "倒せない"
              : `${hardestByKill.activeSpell!.hitsToKill}回確殺`}
          </div>
        </div>

        {/* OverKill: INT + キューブ */}
        <div className="bg-white rounded-xl px-3 py-2 space-y-2">
          {/* INT */}
          <div>
            <div
              className="text-[10px] text-gray-400 font-medium truncate"
              title={`OverKill必要INT（${hardestByInt.row.scaled.name}）`}
            >
              OverKill必要INT（{hardestByInt.row.scaled.name}）
            </div>
            <div className="text-base font-bold text-orange-600 tabular-nums">
              {maxOverkillInt.toLocaleString()}
            </div>
            {currentInt > 0 && (
              <div className={`text-xs tabular-nums font-medium ${intAchieved ? "text-green-600" : "text-orange-500"}`}>
                {intAchieved ? "達成済み ✓" : `あと${intShortfall.toLocaleString()}`}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* キューブ */}
          <div>
            <div
              className="text-[10px] text-gray-400 font-medium truncate"
              title={`OverKillキューブ数（${hardestByCubeName}）`}
            >
              OverKillキューブ数（{hardestByCubeName}）
            </div>
            {currentInt === 0 ? (
              <div className="text-[10px] text-gray-400 mt-0.5">INTを設定すると表示</div>
            ) : isUnachievable ? (
              <>
                <div className="text-sm font-bold text-red-500">不可</div>
                <div className="text-[10px] text-gray-400">1000個でも不足</div>
              </>
            ) : (
              <>
                <div className="text-base font-bold text-purple-600 tabular-nums">
                  {maxCubesNeeded.toLocaleString()}個
                </div>
                <div className={`text-xs tabular-nums font-medium ${cubeAchieved ? "text-green-600" : "text-purple-500"}`}>
                  {cubeAchieved ? "達成済み ✓" : `あと${cubeShortfall!.toLocaleString()}個`}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
