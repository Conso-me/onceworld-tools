import { useState } from "react";
import { useTranslation } from "react-i18next";
import { enemyPresetGroups } from "../data/enemyPresets";
import { getMonsterByName, getMonsterDisplayName } from "../data/monsters";
import { getMonsterDropInfo } from "../data/monsterDrops";
import type { MonsterBase } from "../types/game";
import { ModalShell, ModalBody } from "./ui/modal/ModalShell";
import { GroupNav } from "./ui/modal/GroupNav";

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

  const navItems = mapLabels.map((label) => ({
    id: label,
    label: lang === "en" ? (mapLabelEnMap.get(label) ?? label) : label,
  }));

  const groups = groupsByMap.get(selectedMap) ?? [];

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      size="lg"
      height="fixed"
      title={t("areaPresetTitle")}
    >
      <ModalBody>
        <GroupNav
          items={navItems}
          selectedId={selectedMap}
          onSelect={setSelectedMap}
          width="md"
        />

        {/* グループ一覧 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarGutter: "stable" }}>
          {groups.map((group, idx) => (
            <div key={idx} className="bg-bg rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-ink">
                  {lang === "en" ? (group.labelEn ?? group.label) : group.label}
                </span>
                <button
                  onClick={() => handlePickGroup(idx)}
                  className="px-2.5 py-1 bg-accent text-accent-ink text-xs font-medium rounded-lg hover:opacity-90 transition-colors"
                >
                  {t("addAllInGroup")}
                </button>
              </div>
              <div className="space-y-0.5">
                {group.presets.map((preset, pi) => (
                  <div key={pi} className="flex items-center gap-2 text-xs text-muted">
                    <span className="truncate flex-1">
                      {(() => {
                        const m = preset.monsterName ? getMonsterByName(preset.monsterName) : null;
                        return m ? getMonsterDisplayName(m, lang) : (preset.monsterName ?? t("game:unknownName"));
                      })()}
                    </span>
                    <span className="shrink-0">
                      Lv{preset.level.toLocaleString()}
                    </span>
                    <span className="shrink-0 opacity-60 text-[10px]">
                      {preset.location}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ModalBody>
    </ModalShell>
  );
}
