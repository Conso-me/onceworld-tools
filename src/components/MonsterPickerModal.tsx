import { useState, useMemo, useEffect } from "react";
import type { MonsterBase } from "../types/game";
import { getAllMonsters } from "../data/monsters";

type SortKey = "exp_desc" | "exp_asc" | "gold_desc" | "gold_asc";

const elementColors: Record<string, string> = {
  火: "bg-red-100 text-red-600",
  水: "bg-blue-100 text-blue-600",
  木: "bg-green-100 text-green-600",
  光: "bg-yellow-100 text-yellow-700",
  闇: "bg-purple-100 text-purple-600",
};

export function MonsterPickerModal({
  onPick,
  onClose,
}: {
  onPick: (monster: MonsterBase) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("exp_desc");

  const allMonsters = useMemo(() => getAllMonsters(), []);

  const filtered = useMemo(() => {
    let list = allMonsters;
    if (query) {
      const lower = query.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(lower));
    }
    const [key, dir] = sort.split("_") as ["exp" | "gold", "desc" | "asc"];
    return [...list].sort((a, b) => {
      const diff = a[key] - b[key];
      return dir === "desc" ? -diff : diff;
    });
  }, [allMonsters, query, sort]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "exp_desc", label: "EXP↓" },
    { key: "exp_asc", label: "EXP↑" },
    { key: "gold_desc", label: "G↓" },
    { key: "gold_asc", label: "G↑" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">モンスターを選択</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* 検索・ソート */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0 space-y-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="モンスター名を検索..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 shrink-0">並び替え:</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  sort === opt.key
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* モンスターリスト */}
        <div className="overflow-y-auto flex-1">
          {filtered.map((monster, i) => (
            <button
              key={`${monster.name}-${i}`}
              type="button"
              onClick={() => {
                onPick(monster);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-800 truncate">
                  {monster.name}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${elementColors[monster.element] ?? "bg-gray-100 text-gray-500"}`}
                >
                  {monster.element}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {monster.attackType}
                </span>
              </div>
              <div className="flex flex-col items-end sm:flex-row sm:items-center gap-0.5 sm:gap-3 shrink-0 ml-2">
                <span className="text-xs font-medium text-indigo-600 whitespace-nowrap">
                  {monster.exp.toLocaleString()} EXP
                </span>
                <span className="text-xs font-medium text-yellow-600 whitespace-nowrap">
                  {monster.gold.toLocaleString()} G
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* フッター */}
        <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full text-xs py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
