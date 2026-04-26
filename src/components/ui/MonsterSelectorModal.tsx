import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { MonsterBase, Element } from "../../types/game";
import { useAllMonsters } from "../../hooks/useAllMonsters";

type SortKey = "default" | "total" | "atk" | "int" | "vit" | "def" | "mdef" | "spd" | "luck";

const SORT_KEYS: SortKey[] = ["default", "total", "atk", "int", "vit", "def", "mdef", "spd", "luck"];
const STAT_LABEL: Partial<Record<SortKey, string>> = {
  atk: "ATK", int: "INT", vit: "VIT", def: "DEF", mdef: "M-DEF", spd: "SPD", luck: "LUK",
};

function getSortValue(m: MonsterBase, key: SortKey): number {
  switch (key) {
    case "total": return m.vit + m.atk + m.int + m.def + m.mdef + m.spd + m.luck;
    case "atk":   return m.atk;
    case "int":   return m.int;
    case "vit":   return m.vit;
    case "def":   return m.def;
    case "mdef":  return m.mdef;
    case "spd":   return m.spd;
    case "luck":  return m.luck;
    default:      return 0;
  }
}

function PetStatRow({ monster, sortKey, totalLabel }: { monster: MonsterBase; sortKey: SortKey; totalLabel: string }) {
  const statDefs: { label: string; key: SortKey; v: number }[] = [
    { label: "ATK",   key: "atk",  v: monster.atk },
    { label: "INT",   key: "int",  v: monster.int },
    { label: "VIT",   key: "vit",  v: monster.vit },
    { label: "DEF",   key: "def",  v: monster.def },
    { label: "M-DEF", key: "mdef", v: monster.mdef },
    { label: "SPD",   key: "spd",  v: monster.spd },
    { label: "LUK",   key: "luck", v: monster.luck },
  ];
  const total = statDefs.reduce((s, x) => s + x.v, 0);
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0 mt-0.5 text-[10px] leading-tight">
      {statDefs.map(({ label, key, v }) =>
        v > 0 ? (
          <span key={key} className={sortKey === key ? "font-bold text-indigo-600" : "text-gray-500"}>
            <span className={sortKey === key ? "text-indigo-400" : "text-gray-400"}>{label} </span>
            <span>{v}</span>
          </span>
        ) : null
      )}
      <span className={`font-semibold ${sortKey === "total" ? "text-indigo-600" : "text-gray-600"}`}>
        {totalLabel} {total}
      </span>
    </div>
  );
}

type ElementFilter = "all" | Element;

const ELEMENTS: Element[] = ["火", "水", "木", "光", "闇"];

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
  showPetStats?: boolean;
}

export function MonsterSelectorModal({ isOpen, onClose, onSelect, showPetStats }: Props) {
  const { t } = useTranslation(["game", "monsters", "common"]);
  const [elementFilter, setElementFilter] = useState<ElementFilter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const allMonsters = useAllMonsters();
  const totalLabel = t("common:total");
  const sortOptions = SORT_KEYS.map((key) => ({
    key,
    label: key === "default" ? t("common:sortDefault")
      : key === "total" ? totalLabel
      : STAT_LABEL[key]!,
  }));

  const filtered = useMemo(() => {
    let list = allMonsters;
    if (elementFilter !== "all") {
      list = list.filter((m) => m.element === elementFilter);
    }
    if (query.trim()) {
      const lower = query.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(lower));
    }
    if (showPetStats && sortKey !== "default") {
      list = [...list].sort((a, b) => getSortValue(b, sortKey) - getSortValue(a, sortKey));
    }
    return list;
  }, [allMonsters, elementFilter, query, showPetStats, sortKey]);

  if (!isOpen) return null;

  const filterElements: { key: ElementFilter; label: string }[] = [
    { key: "all", label: t("game:elementFilter.all") },
    ...ELEMENTS.map((el) => ({ key: el as ElementFilter, label: t(`game:element.${el}`) })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ height: "min(600px, 85vh)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">{t("selectMonsterTitle")}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">

          {/* Mobile: 横スクロール属性フィルタ */}
          <div className="sm:hidden flex overflow-x-auto gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            {filterElements.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setElementFilter(key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  elementFilter === key
                    ? key === "all"
                      ? "bg-indigo-600 text-white"
                      : `${elementColors[key]} ring-1 ring-current`
                    : "bg-white text-gray-700 border border-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* PC: 左サイドバー属性フィルタ */}
          <div className="hidden sm:flex sm:flex-col w-28 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto py-2">
            {filterElements.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setElementFilter(key)}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                  elementFilter === key
                    ? "bg-white border-r-2 border-indigo-500 shadow-sm " + (key === "all" ? "text-indigo-600" : elementLeftColors[key])
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* モンスター一覧 */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* 検索バー + ソートバー (sticky unit) */}
            <div className="border-b border-gray-200 bg-white sticky top-0">
              <div className="px-4 py-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  placeholder={t("searchByName")}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              {showPetStats && (
                <div className="flex overflow-x-auto gap-1.5 px-4 pb-2 shrink-0">
                  {sortOptions.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSortKey(key)}
                      className={`flex-shrink-0 px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                        sortKey === key
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PC: カラムヘッダー */}
            <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 bg-gray-50">
              <span className="flex-1 text-xs font-bold text-gray-600 uppercase tracking-wide">{t("game:name")}</span>
              <span className="w-14 text-center text-xs font-bold text-gray-600 uppercase tracking-wide">{t("monsters:element")}</span>
              <span className="w-16 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">{t("monsters:attackType")}</span>
            </div>

            {/* モンスター行 */}
            <div className="flex-1">
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  {t("game:noMatchingMonsters")}
                </div>
              ) : (
                filtered.map((monster, i) => (
                  <button
                    key={`${monster.name}-${i}`}
                    onClick={() => {
                      onSelect(monster);
                      onClose();
                    }}
                    className="w-full px-5 py-3 hover:bg-indigo-50 border-b border-gray-100 text-left transition-colors group"
                  >
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-3">
                        <span className="flex-1 font-semibold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors">
                          {monster.name}
                        </span>
                        <span className={`w-14 text-center text-xs px-2 py-0.5 rounded-full font-medium ${elementColors[monster.element] ?? "bg-gray-100 text-gray-500"}`}>
                          {t(`game:element.${monster.element}`)}
                        </span>
                        <span className="w-16 text-right text-sm text-gray-700">
                          {t(`game:attackType.${monster.attackType}`)}
                        </span>
                      </div>
                      {showPetStats && <PetStatRow monster={monster} sortKey={sortKey} totalLabel={totalLabel} />}
                    </div>
                    <div className="sm:hidden">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 font-semibold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors">
                          {monster.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${elementColors[monster.element] ?? "bg-gray-100 text-gray-500"}`}>
                          {t(`game:element.${monster.element}`)}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {t(`game:attackType.${monster.attackType}`)}
                        </span>
                      </div>
                      {showPetStats && <PetStatRow monster={monster} sortKey={sortKey} totalLabel={totalLabel} />}
                    </div>
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
