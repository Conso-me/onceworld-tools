import type { DefensiveComparisonRow } from "../../utils/multiDamageCalc";

interface Props {
  rows: DefensiveComparisonRow[];
}

export function DefenseMaxSummary({ rows }: Props) {
  if (rows.length === 0) return null;

  const physRows = rows.filter((r) => r.enemyIsPhysical);
  const magicRows = rows.filter((r) => !r.enemyIsPhysical);
  const maxPhysReq = physRows.length > 0 ? Math.max(...physRows.map((r) => r.nullifyDef)) : null;
  const maxMagicReq = magicRows.length > 0 ? Math.max(...magicRows.map((r) => r.nullifyDef)) : null;
  const physEffective = physRows.length > 0 ? physRows[0].effectiveSelfDef : null;
  const magicEffective = magicRows.length > 0 ? magicRows[0].effectiveSelfDef : null;
  const hasPlayerStats = physEffective !== null || magicEffective !== null;

  if (maxPhysReq === null && maxMagicReq === null) return null;

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
      </div>
      {!hasPlayerStats && (
        <div className="text-[10px] text-gray-400 mt-1">プレイヤーDEF/MDEFを設定すると達成状況を表示します</div>
      )}
    </div>
  );
}
