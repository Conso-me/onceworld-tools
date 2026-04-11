import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { EnemyPresetGroup, EnemyPreset } from "../../data/enemyPresets";

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
  const { t } = useTranslation();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ height: "min(640px, 85vh)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">{t("damage:enemyPresetSelect")}</h3>
            {canMultiSelect && (
              <button
                onClick={() => setMultiSelect((v) => !v)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  multiSelect
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {t("damage:multiSelectMode")}
              </button>
            )}
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors text-xl leading-none">×</button>
        </div>

        {/* Mobile: マップピル */}
        <div className="sm:hidden flex overflow-x-auto gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          {maps.map(map => (
            <button key={map} onClick={() => handleMapSelect(map)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedMap === map ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border border-gray-200"}`}>
              {map}
            </button>
          ))}
        </div>

        {/* Mobile: エリアピル */}
        <div className="sm:hidden flex overflow-x-auto gap-2 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
          {mapGroups.map(g => (
            <button key={g.globalIdx} onClick={() => setSelectedGroupIdx(g.globalIdx)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedGroupIdx === g.globalIdx ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border border-gray-200"}`}>
              {g.label}
            </button>
          ))}
        </div>

        {/* PC: 3列レイアウト / Mobile: モンスター一覧 */}
        <div className="flex flex-1 overflow-hidden">

          {/* PC: マップ列 */}
          <div className="hidden sm:flex flex-col w-28 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto py-2" style={{ scrollbarGutter: "stable" }}>
            {maps.map(map => (
              <button key={map} onClick={() => handleMapSelect(map)}
                className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors ${selectedMap === map ? "bg-white text-indigo-600 border-r-2 border-indigo-500 shadow-sm" : "text-gray-700 hover:bg-gray-100"}`}>
                {map}
              </button>
            ))}
          </div>

          {/* PC: エリア列 */}
          <div className="hidden sm:flex flex-col w-40 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto py-2" style={{ scrollbarGutter: "stable" }}>
            {mapGroups.map(g => (
              <button key={g.globalIdx} onClick={() => setSelectedGroupIdx(g.globalIdx)}
                className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors ${selectedGroupIdx === g.globalIdx ? "bg-white text-indigo-700 border-r-2 border-indigo-400" : "text-gray-700 hover:bg-gray-100"}`}>
                {g.label}
              </button>
            ))}
          </div>

          {/* モンスター一覧 */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
            {/* PC: カラムヘッダー */}
            <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 bg-gray-50 sticky top-0">
              {multiSelect && <span className="w-6" />}
              <span className="flex-1 text-xs font-bold text-gray-600 uppercase tracking-wide">{t("game:name")}</span>
              <span className="w-28 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">{t("game:level")}</span>
              <span className="w-56 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">{t("game:location")}</span>
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
                  className={`w-full px-5 py-3 border-b border-gray-100 text-left transition-colors group ${
                    isChecked ? "bg-indigo-50" : "hover:bg-indigo-50"
                  }`}
                >
                  <div className="hidden sm:flex items-center gap-3">
                    {multiSelect && (
                      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isChecked
                          ? "bg-indigo-500 border-indigo-500 text-white"
                          : "border-gray-300"
                      }`}>
                        {isChecked && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    )}
                    <span className="flex-1 font-semibold text-gray-900 text-sm group-hover:text-indigo-700 flex items-center gap-1.5">
                      {preset.monsterName ?? t("game:unknownName")}
                      {preset.magicImmune && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">魔法無効</span>
                      )}
                    </span>
                    <span className="w-28 text-right text-sm font-mono font-semibold text-indigo-600">{preset.level.toLocaleString()}</span>
                    <span className="w-56 text-right text-sm text-gray-700">{preset.location}</span>
                  </div>
                  <div className="sm:hidden flex items-center gap-2">
                    {multiSelect && (
                      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isChecked
                          ? "bg-indigo-500 border-indigo-500 text-white"
                          : "border-gray-300"
                      }`}>
                        {isChecked && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 text-sm group-hover:text-indigo-700 flex items-center gap-1.5">
                        {preset.monsterName ?? t("game:unknownName")}
                        {preset.magicImmune && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">魔法無効</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono font-semibold text-indigo-600">Lv {preset.level.toLocaleString()}</span>
                        <span className="text-xs text-gray-500">{preset.location}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 複数選択フッター */}
        {multiSelect && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <span className="text-sm text-gray-500">
              {comparisonCount}{t("common:monsterCount")}{t("damage:selected")}
            </span>
            <button
              onClick={handleConfirm}
              disabled={comparisonCount < 2}
              className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("damage:showComparison")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
