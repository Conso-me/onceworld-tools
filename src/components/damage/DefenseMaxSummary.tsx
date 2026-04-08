import type { DefensiveComparisonRow, OffensiveComparisonRow } from "../../utils/multiDamageCalc";

interface Props {
  rows: DefensiveComparisonRow[];
  offensiveRows?: OffensiveComparisonRow[];
}

export function DefenseMaxSummary({ rows, offensiveRows }: Props) {
  if (rows.length === 0) return null;

  const physRows = rows.filter((r) => r.enemyIsPhysical);
  const magicRows = rows.filter((r) => !r.enemyIsPhysical);
  const maxPhysReq = physRows.length > 0 ? Math.max(...physRows.map((r) => r.nullifyDef)) : null;
  const maxMagicReq = magicRows.length > 0 ? Math.max(...magicRows.map((r) => r.nullifyDef)) : null;
  const physEffective = physRows.length > 0 ? physRows[0].effectiveSelfDef : null;
  const magicEffective = magicRows.length > 0 ? magicRows[0].effectiveSelfDef : null;
  const hasPlayerStats = physEffective !== null || magicEffective !== null;

  if (maxPhysReq === null && maxMagicReq === null) return null;

  // 物理offensive: 必要LUCKが最大の行を探す
  const physOffRows = offensiveRows?.filter((r) => r.mode === "物理") ?? [];
  const hardestLuckRow = physOffRows.length > 0
    ? physOffRows.reduce((max, r) =>
        (r.requiredHitLuck ?? 0) > (max.requiredHitLuck ?? 0) ? r : max
      )
    : null;
  const maxLuck = hardestLuckRow?.requiredHitLuck ?? null;
  const additionalLuck = hardestLuckRow?.additionalLuckNeeded ?? null;
  const luckAchieved = additionalLuck !== null && additionalLuck <= 0;
  const hardestDmg = hardestLuckRow?.dmg;

  return (
    <div className="bg-indigo-50 rounded-2xl px-4 py-3 border border-indigo-100">
      <div className="text-xs font-bold text-indigo-600 mb-2">全モンスターを無効化するのに必要な最大値</div>
      <div className="grid grid-cols-2 gap-3">
        {maxPhysReq !== null && (() => {
          const remaining = physEffective !== null ? Math.max(0, Math.ceil(maxPhysReq - physEffective)) : null;
          const achieved = remaining !== null && remaining <= 0;
          return (
            <div className="bg-white rounded-xl px-3 py-2">
              <div className="text-[10px] text-gray-400 font-medium">対物理 DEF</div>
              <div className="text-lg font-bold text-orange-600 tabular-nums">{maxPhysReq.toLocaleString()}</div>
              {remaining !== null && (
                <div className={`text-xs tabular-nums font-medium ${achieved ? "text-green-600" : "text-orange-500"}`}>
                  {achieved ? "達成済み ✓" : `あと${remaining.toLocaleString()}`}
                </div>
              )}
            </div>
          );
        })()}
        {maxMagicReq !== null && (() => {
          const remaining = magicEffective !== null ? Math.max(0, Math.ceil(maxMagicReq - magicEffective)) : null;
          const achieved = remaining !== null && remaining <= 0;
          return (
            <div className="bg-white rounded-xl px-3 py-2">
              <div className="text-[10px] text-gray-400 font-medium">対魔法 M-DEF</div>
              <div className="text-lg font-bold text-purple-600 tabular-nums">{maxMagicReq.toLocaleString()}</div>
              {remaining !== null && (
                <div className={`text-xs tabular-nums font-medium ${achieved ? "text-green-600" : "text-purple-500"}`}>
                  {achieved ? "達成済み ✓" : `あと${remaining.toLocaleString()}`}
                </div>
              )}
            </div>
          );
        })()}

        {/* 物理攻撃時: 最大LUCK要求敵への与ダメ・命中LUCK */}
        {maxLuck !== null && hardestLuckRow && (
          <div className="bg-white rounded-xl px-3 py-2">
            <div className="text-[10px] text-gray-400 font-medium">
              命中LUCK最大（{hardestLuckRow.scaled.name}）
            </div>
            <div className={`text-lg font-bold tabular-nums ${luckAchieved ? "text-green-600" : "text-gray-800"}`}>
              {maxLuck.toLocaleString()}
            </div>
            {additionalLuck !== null && (
              <div className={`text-xs tabular-nums font-medium ${luckAchieved ? "text-green-600" : "text-orange-500"}`}>
                {luckAchieved ? "達成済み ✓" : `あと${additionalLuck.toLocaleString()}`}
              </div>
            )}
          </div>
        )}
        {hardestDmg && !hardestDmg.isNullified && (
          <div className="bg-white rounded-xl px-3 py-2">
            <div className="text-[10px] text-gray-400 font-medium">
              上記の敵への与ダメ
            </div>
            <div className="text-base font-bold text-gray-700 tabular-nums">
              {hardestDmg.min.toLocaleString()}〜{hardestDmg.max.toLocaleString()}
            </div>
          </div>
        )}
        {hardestDmg?.isNullified && (
          <div className="bg-white rounded-xl px-3 py-2">
            <div className="text-[10px] text-gray-400 font-medium">
              上記の敵への与ダメ
            </div>
            <div className="text-sm text-gray-400">無効化</div>
          </div>
        )}
      </div>
      {!hasPlayerStats && (
        <div className="text-[10px] text-gray-400 mt-1">プレイヤーDEF/MDEFを設定すると達成状況を表示します</div>
      )}
    </div>
  );
}
