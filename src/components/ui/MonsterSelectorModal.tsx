import { useState, useMemo } from "react";
import type { MonsterBase } from "../../types/game";
import { getAllMonsters } from "../../data/monsters";

type ElementFilter = "すべて" | "火" | "水" | "木" | "光" | "闇";

const ELEMENTS: ElementFilter[] = ["すべて", "火", "水", "木", "光", "闇"];

const elementColors: Record<string, string> = {
  火: "bg-red-100 text-red-600",
  水: "bg-blue-100 text-blue-600",
  木: "bg-green-100 text-green-600",
  光: "bg-yellow-100 text-yellow-700",
  闇: "bg-purple-100 text-purple-600",
};

const elementLeftColors: Record<string, string> = {
  火: "text-red-600",
  水: "text-blue-600",
  木: "text-green-600",
  光: "text-yellow-700",
  闇: "text-purple-600",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (monster: MonsterBase) => void;
}

export function MonsterSelectorModal({ isOpen, onClose, onSelect }: Props) {
  const [elementFilter, setElementFilter] = useState<ElementFilter>("すべて");
  const [query, setQuery] = useState("");

  const allMonsters = useMemo(() => getAllMonsters(), []);

  const filtered = useMemo(() => {
    let list = allMonsters;
    if (elementFilter !== "すべて") {
      list = list.filter((m) => m.element === elementFilter);
    }
    if (query.trim()) {
      const lower = query.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(lower));
    }
    return list;
  }, [allMonsters, elementFilter, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ height: "min(600px, 80vh)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">モンスター選択</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: Element filter */}
          <div className="w-28 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto py-2">
            {ELEMENTS.map((el) => (
              <button
                key={el}
                onClick={() => setElementFilter(el)}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                  elementFilter === el
                    ? "bg-white border-r-2 border-indigo-500 shadow-sm " + (el === "すべて" ? "text-indigo-600" : elementLeftColors[el])
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {el}
              </button>
            ))}
          </div>

          {/* Right: Monster list */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Search bar (sticky) */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white sticky top-0">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                placeholder="名前で検索..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Column header */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 bg-gray-50 sticky top-[57px]">
              <span className="flex-1 text-xs font-bold text-gray-600 uppercase tracking-wide">名前</span>
              <span className="w-14 text-center text-xs font-bold text-gray-600 uppercase tracking-wide">属性</span>
              <span className="w-16 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">攻撃タイプ</span>
            </div>

            {/* Monster rows */}
            <div className="flex-1">
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  該当するモンスターがいません
                </div>
              ) : (
                filtered.map((monster, i) => (
                  <button
                    key={`${monster.name}-${i}`}
                    onClick={() => {
                      onSelect(monster);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-indigo-50 border-b border-gray-100 text-left transition-colors group"
                  >
                    <span className="flex-1 font-semibold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors">
                      {monster.name}
                    </span>
                    <span className={`w-14 text-center text-xs px-2 py-0.5 rounded-full font-medium ${elementColors[monster.element] ?? "bg-gray-100 text-gray-500"}`}>
                      {monster.element}
                    </span>
                    <span className="w-16 text-right text-sm text-gray-700">
                      {monster.attackType}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
