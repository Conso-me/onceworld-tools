import { useState, useMemo } from "react";
import type { EnemyPresetGroup } from "../../data/enemyPresets";

interface Props {
  isOpen: boolean;
  groups: EnemyPresetGroup[];
  onClose: () => void;
  onSelect: (groupIdx: number, presetIdx: number) => void;
}

export function EnemyPresetModal({ isOpen, groups, onClose, onSelect }: Props) {
  const maps = useMemo(() => Array.from(new Set(groups.map(g => g.mapLabel))), [groups]);
  const [selectedMap, setSelectedMap] = useState(() => maps[0] ?? "");
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);

  // 選択マップのグループ（エリア）をフィルタ（グローバルインデックス付き）
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ height: "min(640px, 85vh)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900">敵プリセット選択</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors text-xl leading-none">×</button>
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
              <span className="flex-1 text-xs font-bold text-gray-600 uppercase tracking-wide">名前</span>
              <span className="w-28 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">レベル</span>
              <span className="w-44 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">出現場所</span>
            </div>
            {group?.presets.map((preset, pi) => (
              <button key={pi} onClick={() => { onSelect(safeGroupIdx, pi); onClose(); }}
                className="w-full px-5 py-3 hover:bg-indigo-50 border-b border-gray-100 text-left transition-colors group">
                <div className="hidden sm:flex items-center gap-3">
                  <span className="flex-1 font-semibold text-gray-900 text-sm group-hover:text-indigo-700">{preset.monsterName ?? "(名称不明)"}</span>
                  <span className="w-28 text-right text-sm font-mono font-semibold text-indigo-600">{preset.level.toLocaleString()}</span>
                  <span className="w-44 text-right text-sm text-gray-700">{preset.location}</span>
                </div>
                <div className="sm:hidden">
                  <div className="font-semibold text-gray-900 text-sm group-hover:text-indigo-700">{preset.monsterName ?? "(名称不明)"}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono font-semibold text-indigo-600">Lv {preset.level.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">{preset.location}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
