import { useState, useMemo, useRef, useEffect } from "react";
import type { MonsterBase } from "../../types/game";
import { getAllMonsters } from "../../data/monsters";

export function MonsterSelector({
  onSelect,
  selectedMonster,
}: {
  onSelect: (monster: MonsterBase, level: number) => void;
  selectedMonster?: MonsterBase | null;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const allMonsters = useMemo(() => getAllMonsters(), []);

  const filtered = useMemo(() => {
    if (!query) return allMonsters;
    const lower = query.toLowerCase();
    return allMonsters.filter((m) => m.name.toLowerCase().includes(lower));
  }, [query, allMonsters]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectMonster = (monster: MonsterBase) => {
    setSelectedName(monster.name);
    setQuery(monster.name);
    setIsOpen(false);
    const lvl = parseInt(level) || 1;
    onSelect(monster, lvl);
  };

  const handleLevelChange = (newLevel: string) => {
    setLevel(newLevel);
    if (selectedName) {
      const monster = allMonsters.find((m) => m.name === selectedName);
      if (monster) {
        onSelect(monster, parseInt(newLevel) || 1);
      }
    }
  };

  const elementColors: Record<string, string> = {
    火: "bg-red-100 text-red-600",
    水: "bg-blue-100 text-blue-600",
    木: "bg-green-100 text-green-600",
    光: "bg-yellow-100 text-yellow-700",
    闇: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
          モンスター
        </span>
        <span className="text-sm text-gray-500">
          敵を選択してレベルを指定
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3" ref={containerRef}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              if (e.target.value !== selectedName) {
                setSelectedName("");
              }
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="モンスター名を検索..."
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {isOpen && filtered.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {filtered.map((monster, i) => (
                <button
                  key={`${monster.name}-${i}`}
                  onClick={() => handleSelectMonster(monster)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-gray-800">{monster.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${elementColors[monster.element] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {monster.element}
                    </span>
                    <span className="text-xs text-gray-400">
                      {monster.attackType}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
            Lv
          </label>
          <input
            type="number"
            min="1"
            value={level}
            onChange={(e) => handleLevelChange(e.target.value)}
            placeholder="1"
            className="w-24 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-center font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      {selectedMonster && selectedName && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span
            className={`px-1.5 py-0.5 rounded ${elementColors[selectedMonster.element] ?? ""}`}
          >
            {selectedMonster.element}
          </span>
          <span>{selectedMonster.attackType}</span>
          <span>ATK:{selectedMonster.atk}</span>
          <span>INT:{selectedMonster.int}</span>
          <span>DEF:{selectedMonster.def}</span>
          <span>M-DEF:{selectedMonster.mdef}</span>
        </div>
      )}
    </div>
  );
}
