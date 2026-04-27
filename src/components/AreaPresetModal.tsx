import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { enemyPresetGroups } from "../data/enemyPresets";
import { getMonsterByName, getMonsterDisplayName } from "../data/monsters";
import { getMonsterDropInfo } from "../data/monsterDrops";
import type { MonsterBase } from "../types/game";

export interface AreaMonsterEntry {
  monster: MonsterBase;
  level: number;
  count: number;
  dropRate: number;
  normalDrop: string;
  rareDrop: string;
  superRareDrop: string;
}

// mapLabel ごとにグルーピング（キーはJA固定でIDとして使用）
const mapLabels = [...new Set(enemyPresetGroups.map((g) => g.mapLabel))];
const groupsByMap = new Map(
  mapLabels.map((label) => [
    label,
    enemyPresetGroups.filter((g) => g.mapLabel === label),
  ])
);
// mapLabel(JA) → mapLabelEn のルックアップ
const mapLabelEnMap = new Map(
  enemyPresetGroups
    .filter((g) => g.mapLabelEn)
    .map((g) => [g.mapLabel, g.mapLabelEn!])
);

export function AreaPresetModal({
  onPickGroup,
  onClose,
}: {
  onPickGroup: (entries: AreaMonsterEntry[]) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation("farm");
  const lang = i18n.language;
  const [selectedMap, setSelectedMap] = useState<string>(mapLabels[0] ?? "");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handlePickGroup = (groupIndex: number) => {
    const groups = groupsByMap.get(selectedMap) ?? [];
    const group = groups[groupIndex];
    if (!group) return;

    const entries: AreaMonsterEntry[] = [];
    for (const preset of group.presets) {
      if (!preset.monsterName) continue;
      const monster = getMonsterByName(preset.monsterName);
      if (!monster) continue;
      const dropInfo = getMonsterDropInfo(monster.name);
      entries.push({
        monster,
        level: preset.level,
        count: 1,
        dropRate: dropInfo?.baseDropRate ?? 50,
        normalDrop: dropInfo?.normalDrop ?? "",
        rareDrop: dropInfo?.rareDrop ?? "",
        superRareDrop: dropInfo?.superRareDrop ?? "",
      });
    }

    if (entries.length > 0) {
      onPickGroup(entries);
      onClose();
    }
  };

  const groups = groupsByMap.get(selectedMap) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">{t("areaPresetTitle")}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* 本体: 2カラム */}
        <div className="flex flex-1 min-h-0">
          {/* 左列: マップ選択 */}
          <div className="w-36 shrink-0 border-r border-gray-100 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 px-3 py-2">{t("selectMap")}</p>
            {mapLabels.map((label) => (
              <button
                key={label}
                onClick={() => setSelectedMap(label)}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                  selectedMap === label
                    ? "bg-indigo-50 text-indigo-600 border-r-2 border-indigo-400"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {lang === "en" ? (mapLabelEnMap.get(label) ?? label) : label}
              </button>
            ))}
          </div>

          {/* 右列: グループ一覧 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {groups.map((group, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">
                    {lang === "en" ? (group.labelEn ?? group.label) : group.label}
                  </span>
                  <button
                    onClick={() => handlePickGroup(idx)}
                    className="px-2.5 py-1 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    {t("addAllInGroup")}
                  </button>
                </div>
                <div className="space-y-0.5">
                  {group.presets.map((preset, pi) => (
                    <div key={pi} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="truncate flex-1">
                        {(() => {
                          const m = preset.monsterName ? getMonsterByName(preset.monsterName) : null;
                          return m ? getMonsterDisplayName(m, lang) : (preset.monsterName ?? t("game:unknownName"));
                        })()}
                      </span>
                      <span className="shrink-0 text-gray-400">
                        Lv{preset.level.toLocaleString()}
                      </span>
                      <span className="shrink-0 text-gray-300 text-[10px]">
                        {preset.location}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* フッター */}
        <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full text-xs py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
          >
            {t("common:close")}
          </button>
        </div>
      </div>
    </div>
  );
}
