import { useState } from "react";
import { enemyPresetGroups } from "../../data/enemyPresets";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (groupIdx: number, presetIdx: number) => void;
}

export function EnemyPresetModal({ isOpen, onClose, onSelect }: Props) {
  const [selectedGroup, setSelectedGroup] = useState(0);

  if (!isOpen) return null;

  const group = enemyPresetGroups[selectedGroup];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ height: "min(600px, 80vh)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">敵プリセット選択</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body: 左エリア / 右敵一覧 */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: Area list */}
          <div className="w-44 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto py-2">
            {enemyPresetGroups.map((g, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedGroup(idx)}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                  selectedGroup === idx
                    ? "bg-white text-indigo-600 border-r-2 border-indigo-500 shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Right: Enemy list */}
          <div className="flex-1 overflow-y-auto">
            {/* Column header */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 bg-gray-50 sticky top-0">
              <span className="flex-1 text-xs font-bold text-gray-600 uppercase tracking-wide">名前</span>
              <span className="w-28 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">レベル</span>
              <span className="w-36 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">出現場所</span>
            </div>

            {group.presets.map((preset, pi) => (
              <button
                key={pi}
                onClick={() => {
                  onSelect(selectedGroup, pi);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-indigo-50 border-b border-gray-100 text-left transition-colors group"
              >
                <span className="flex-1 font-semibold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors">
                  {preset.monsterName ?? "(名称不明)"}
                </span>
                <span className="w-28 text-right text-sm font-mono font-semibold text-indigo-600">
                  {preset.level.toLocaleString()}
                </span>
                <span className="w-36 text-right text-sm text-gray-700">
                  {preset.location}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
