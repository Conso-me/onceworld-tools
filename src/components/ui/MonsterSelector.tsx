import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { MonsterBase } from "../../types/game";
import { getAllMonsters } from "../../data/monsters";
import { MonsterSelectorModal } from "./MonsterSelectorModal";

const elementColors: Record<string, string> = {
  火: "bg-red-100 text-red-600",
  水: "bg-blue-100 text-blue-600",
  木: "bg-green-100 text-green-600",
  光: "bg-yellow-100 text-yellow-700",
  闇: "bg-purple-100 text-purple-600",
};

export function MonsterSelector({
  onSelect,
  onMonsterPick,
  selectedMonster: _selectedMonster,
  externalLevel,
  externalMonsterName,
  presetVersion,
}: {
  onSelect: (monster: MonsterBase, level: number) => void;
  onMonsterPick?: (monster: MonsterBase, level: number) => void;
  selectedMonster?: MonsterBase | null;
  externalLevel?: number;
  externalMonsterName?: string;
  presetVersion?: number;
}) {
  const { t } = useTranslation("game");
  const [level, setLevel] = useState("");
  const [selectedMonster, setSelectedMonster] = useState<MonsterBase | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allMonsters = useMemo(() => getAllMonsters(), []);

  useEffect(() => {
    if (externalLevel !== undefined) {
      setLevel(String(externalLevel));
    }
  }, [externalLevel, presetVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (externalMonsterName !== undefined) {
      const monster = allMonsters.find((m) => m.name === externalMonsterName);
      if (monster) setSelectedMonster(monster);
    }
  }, [externalMonsterName, allMonsters, presetVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectMonster = (monster: MonsterBase) => {
    setSelectedMonster(monster);
    const lvl = parseInt(level) || 1;
    onSelect(monster, lvl);
    onMonsterPick?.(monster, lvl);
  };

  const handleLevelChange = (newLevel: string) => {
    setLevel(newLevel);
    if (selectedMonster) {
      onSelect(selectedMonster, parseInt(newLevel) || 1);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
          {t("monster")}
        </span>
        <span className="text-sm text-gray-500">
          {t("selectMonsterPrompt")}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          {selectedMonster ? (
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-gray-800 truncate">{selectedMonster.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${elementColors[selectedMonster.element] ?? "bg-gray-100 text-gray-500"}`}>
                {t(`element.${selectedMonster.element}`)}
              </span>
            </span>
          ) : (
            <span className="text-gray-400">{t("selectMonster")}</span>
          )}
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
            Lv
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={(() => { const n = parseInt(level, 10); return isNaN(n) ? "" : n.toLocaleString(); })()}
            onChange={(e) => handleLevelChange(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="1"
            className="w-20 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-center font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <MonsterSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelectMonster}
      />
    </div>
  );
}
