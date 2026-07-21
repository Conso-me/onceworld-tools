import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { MonsterBase, Element } from "../../types/game";
import { useAllMonsters } from "../../hooks/useAllMonsters";
import { getMonsterDisplayName } from "../../data/monsters";
import { ModalShell, ModalBody } from "./modal/ModalShell";
import { GroupNav } from "./modal/GroupNav";

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
          <span key={key} className={sortKey === key ? "font-bold text-accent" : "text-muted"}>
            <span className={sortKey === key ? "text-accent/60" : "text-muted/70"}>{label} </span>
            <span>{v}</span>
          </span>
        ) : null
      )}
      <span className={`font-semibold ${sortKey === "total" ? "text-accent" : "text-ink/70"}`}>
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
  const { t, i18n } = useTranslation(["game", "monsters", "common"]);
  const lang = i18n.language;
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
      list = list.filter((m) => {
        if (m.name.toLowerCase().includes(lower)) return true;
        if (lang === "en" && m.nameEn && m.nameEn.toLowerCase().includes(lower)) return true;
        return false;
      });
    }
    if (showPetStats && sortKey !== "default") {
      list = [...list].sort((a, b) => getSortValue(b, sortKey) - getSortValue(a, sortKey));
    }
    return list;
  }, [allMonsters, elementFilter, query, lang, showPetStats, sortKey]);

  const filterItems = [
    { id: "all", label: t("game:elementFilter.all") },
    ...ELEMENTS.map((el) => ({
      id: el as string,
      label: t(`game:element.${el}`),
      activeTextClassName: elementLeftColors[el],
      activePillClassName: `${elementColors[el]} ring-1 ring-current`,
    })),
  ];

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      height="fixed"
      title={t("selectMonsterTitle")}
    >
      <ModalBody>
        <GroupNav
          items={filterItems}
          selectedId={elementFilter}
          onSelect={(id) => setElementFilter(id as ElementFilter)}
          width="sm"
        />

        {/* モンスター一覧 */}
        <div className="flex-1 overflow-y-auto flex flex-col" style={{ scrollbarGutter: "stable" }}>
          {/* 検索バー + ソートバー (sticky unit) */}
          <div className="border-b border-line bg-card sticky top-0">
            <div className="px-4 py-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                placeholder={t("searchByName")}
                className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
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
                        ? "bg-accent text-accent-ink border-accent"
                        : "bg-card text-muted border-line hover:bg-ink/5"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PC: カラムヘッダー */}
          <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 border-b border-line bg-bg">
            <span className="flex-1 text-xs font-bold text-muted uppercase tracking-wide">{t("game:name")}</span>
            <span className="w-14 text-center text-xs font-bold text-muted uppercase tracking-wide">{t("monsters:element")}</span>
            <span className="w-16 text-right text-xs font-bold text-muted uppercase tracking-wide">{t("monsters:attackType")}</span>
          </div>

          {/* モンスター行 */}
          <div className="flex-1">
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">
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
                  className="w-full px-5 py-3 hover:bg-accent-soft border-b border-line/60 text-left transition-colors group"
                >
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-3">
                      <span className="flex-1 font-semibold text-ink text-sm group-hover:text-accent transition-colors">
                        {getMonsterDisplayName(monster, lang)}
                      </span>
                      <span className={`w-14 text-center text-xs px-2 py-0.5 rounded-full font-medium ${elementColors[monster.element] ?? "bg-ink/5 text-muted"}`}>
                        {t(`game:element.${monster.element}`)}
                      </span>
                      <span className="w-16 text-right text-sm text-ink">
                        {t(`game:attackType.${monster.attackType}`)}
                      </span>
                    </div>
                    {showPetStats && <PetStatRow monster={monster} sortKey={sortKey} totalLabel={totalLabel} />}
                  </div>
                  <div className="sm:hidden">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-semibold text-ink text-sm group-hover:text-accent transition-colors">
                        {getMonsterDisplayName(monster, lang)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${elementColors[monster.element] ?? "bg-ink/5 text-muted"}`}>
                        {t(`game:element.${monster.element}`)}
                      </span>
                      <span className="text-xs text-muted flex-shrink-0">
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
      </ModalBody>
    </ModalShell>
  );
}
