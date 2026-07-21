import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { EnemyPresetGroup, EnemyPreset } from "../../data/enemyPresets";
import { getMonsterByName, getMonsterDisplayName } from "../../data/monsters";
import { ModalShell, ModalBody } from "./modal/ModalShell";
import { GroupNav } from "./modal/GroupNav";

/** 比較リスト内のエントリを一意に識別するキー */
function presetKey(preset: EnemyPreset): string {
  return `${preset.monsterName ?? "?"}@${preset.level}@${preset.location}`;
}

interface Props {
  isOpen: boolean;
  groups: EnemyPresetGroup[];
  onClose: () => void;
  onSelect: (groupIdx: number, presetIdx: number) => void;
  /** 複数選択モード用: 現在の比較リストのキーセット */
  comparisonKeys?: Set<string>;
  /** 複数選択モード用: プリセットの追加/削除トグル */
  onToggleComparison?: (groupIdx: number, presetIdx: number) => void;
  /** 複数選択モード用: 比較確定 */
  onConfirmComparison?: () => void;
  comparisonCount?: number;
}

export { presetKey };

export function EnemyPresetModal({
  isOpen, groups, onClose, onSelect,
  comparisonKeys, onToggleComparison, onConfirmComparison, comparisonCount = 0,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const maps = useMemo(() => Array.from(new Set(groups.map(g => g.mapLabel))), [groups]);
  const [selectedMap, setSelectedMap] = useState(() => maps[0] ?? "");
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);
  const [multiSelect, setMultiSelect] = useState(false);

  const mapGroups = useMemo(() =>
    groups.map((g, idx) => ({ ...g, globalIdx: idx })).filter(g => g.mapLabel === selectedMap),
    [groups, selectedMap]
  );

  const safeGroupIdx = mapGroups.findIndex(g => g.globalIdx === selectedGroupIdx) >= 0
    ? selectedGroupIdx
    : (mapGroups[0]?.globalIdx ?? 0);

  const group = groups[safeGroupIdx];

  const handleMapSelect = (map: string) => {
    setSelectedMap(map);
    const firstGroup = groups.find(g => g.mapLabel === map);
    if (firstGroup) {
      setSelectedGroupIdx(groups.indexOf(firstGroup));
    }
  };

  const handleClose = useCallback(() => {
    setMultiSelect(false);
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    setMultiSelect(false);
    onConfirmComparison?.();
    onClose();
  }, [onConfirmComparison, onClose]);

  const canMultiSelect = !!onToggleComparison;

  const mapItems = maps.map(map => ({
    id: map,
    label: lang === "en"
      ? (groups.find(g => g.mapLabel === map)?.mapLabelEn ?? map)
      : map,
  }));

  const areaItems = mapGroups.map(g => ({
    id: String(g.globalIdx),
    label: lang === "en" ? (g.labelEn ?? g.label) : g.label,
  }));

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      height="fixed"
      title={t("damage:enemyPresetSelect")}
      headerAction={canMultiSelect && (
        <button
          onClick={() => setMultiSelect((v) => !v)}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
            multiSelect
              ? "bg-accent-soft text-accent"
              : "bg-ink/5 text-muted hover:bg-ink/10"
          }`}
        >
          {t("damage:multiSelectMode")}
        </button>
      )}
      footer={multiSelect && (
        <>
          <span className="text-sm text-muted">
            {comparisonCount}{t("common:monsterCount")}{t("damage:selected")}
          </span>
          <button
            onClick={handleConfirm}
            disabled={comparisonCount < 2}
            className="px-4 py-2 rounded-lg bg-accent text-accent-ink text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t("damage:showComparison")}
          </button>
        </>
      )}
    >
      <ModalBody>
        {/* マップ軸 → エリア軸の2階層グループ */}
        <GroupNav
          items={mapItems}
          selectedId={selectedMap}
          onSelect={handleMapSelect}
          width="sm"
        />
        <GroupNav
          items={areaItems}
          selectedId={String(safeGroupIdx)}
          onSelect={(id) => setSelectedGroupIdx(Number(id))}
          width="md"
        />

        {/* モンスター一覧 */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
          {/* PC: カラムヘッダー */}
          <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 border-b border-line bg-bg sticky top-0">
            {multiSelect && <span className="w-6" />}
            <span className="flex-1 text-xs font-bold text-muted uppercase tracking-wide">{t("game:name")}</span>
            <span className="w-28 text-right text-xs font-bold text-muted uppercase tracking-wide">{t("game:level")}</span>
            <span className="w-56 text-right text-xs font-bold text-muted uppercase tracking-wide">{t("game:location")}</span>
          </div>
          {group?.presets.map((preset, pi) => {
            const isChecked = multiSelect && comparisonKeys?.has(presetKey(preset));
            return (
              <button
                key={pi}
                onClick={() => {
                  if (multiSelect && onToggleComparison) {
                    onToggleComparison(safeGroupIdx, pi);
                  } else {
                    onSelect(safeGroupIdx, pi);
                    handleClose();
                  }
                }}
                className={`w-full px-5 py-3 border-b border-line/60 text-left transition-colors group ${
                  isChecked ? "bg-accent-soft" : "hover:bg-accent-soft"
                }`}
              >
                <div className="hidden sm:flex items-center gap-3">
                  {multiSelect && (
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isChecked
                        ? "bg-accent border-accent text-accent-ink"
                        : "border-line"
                    }`}>
                      {isChecked && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  )}
                  <span className="flex-1 font-semibold text-ink text-sm group-hover:text-accent flex items-center gap-1.5">
                    {(() => { const m = preset.monsterName ? getMonsterByName(preset.monsterName) : null; return m ? getMonsterDisplayName(m, lang) : (preset.monsterName ?? t("game:unknownName")); })()}
                    {preset.magicImmune && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">{t("damage:magicImmune")}</span>
                    )}
                  </span>
                  <span className="w-28 text-right text-sm font-mono font-semibold text-accent">{preset.level.toLocaleString()}</span>
                  <span className="w-56 text-right text-sm text-ink">{lang === "en" ? (preset.locationEn ?? preset.location) : preset.location}</span>
                </div>
                <div className="sm:hidden flex items-center gap-2">
                  {multiSelect && (
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isChecked
                        ? "bg-accent border-accent text-accent-ink"
                        : "border-line"
                    }`}>
                      {isChecked && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink text-sm group-hover:text-accent flex items-center gap-1.5">
                      {(() => { const m = preset.monsterName ? getMonsterByName(preset.monsterName) : null; return m ? getMonsterDisplayName(m, lang) : (preset.monsterName ?? t("game:unknownName")); })()}
                      {preset.magicImmune && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">{t("damage:magicImmune")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono font-semibold text-accent">Lv {preset.level.toLocaleString()}</span>
                      <span className="text-xs text-muted">{lang === "en" ? (preset.locationEn ?? preset.location) : preset.location}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ModalBody>
    </ModalShell>
  );
}
