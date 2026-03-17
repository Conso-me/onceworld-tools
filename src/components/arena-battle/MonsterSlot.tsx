import { useState } from "react";
import type { MonsterBase, Element } from "../../types/game";
import { MonsterSelectorModal } from "../ui/MonsterSelectorModal";

const elementColors: Record<string, string> = {
  火: "text-red-600",
  水: "text-blue-600",
  木: "text-green-600",
  光: "text-yellow-700",
  闇: "text-purple-600",
};

interface Props {
  monster: MonsterBase | null;
  level: number;
  detectedElement?: Element;
  onSelectMonster: (monster: MonsterBase) => void;
  onLevelChange: (level: number) => void;
  onRemove: () => void;
}

export function MonsterSlot({
  monster,
  level,
  detectedElement,
  onSelectMonster,
  onLevelChange,
  onRemove,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setModalOpen(true)}
          className={`flex-1 min-w-0 text-left px-2.5 py-1.5 rounded-lg border text-sm transition-colors truncate ${
            monster
              ? "border-gray-200 bg-white hover:bg-gray-50 font-medium text-gray-900"
              : "border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-400"
          }`}
        >
          {monster ? (
            <span className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${elementColors[monster.element] ?? ""}`}>
                {monster.element}
              </span>
              <span className="truncate">{monster.name}</span>
            </span>
          ) : detectedElement ? (
            <span className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${elementColors[detectedElement] ?? ""}`}>
                {detectedElement}
              </span>
              <span className="text-gray-400">モンスター選択...</span>
            </span>
          ) : (
            "モンスター選択..."
          )}
        </button>

        <div className="flex items-center gap-0.5">
          <span className="text-xs text-gray-500 font-medium">Lv</span>
          <input
            type="number"
            min={1}
            max={9999}
            value={level}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 1) onLevelChange(Math.min(v, 9999));
            }}
            className="w-[4.5rem] px-1.5 py-1.5 text-sm text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <button
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none flex-shrink-0"
          title="削除"
        >
          ×
        </button>
      </div>

      {modalOpen && (
        <MonsterSelectorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSelect={(m) => {
            onSelectMonster(m);
            setModalOpen(false);
          }}
          initialElement={!monster ? detectedElement : undefined}
        />
      )}
    </>
  );
}
