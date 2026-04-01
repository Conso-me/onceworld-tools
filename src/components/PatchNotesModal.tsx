import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { PatchEntry, ChangeType } from "../data/patchNotes";
import { patchNotes } from "../data/patchNotes";

const badgeClass: Record<ChangeType, string> = {
  fix: "bg-red-100 text-red-600",
  feature: "bg-green-100 text-green-600",
  improve: "bg-blue-100 text-blue-600",
  feedback: "bg-orange-100 text-orange-600",
  wip: "bg-yellow-100 text-yellow-700",
};

const BADGE_LABELS: Record<string, Record<ChangeType, string>> = {
  ja: { fix: "修正", feature: "追加", improve: "改善", feedback: "FB対応", wip: "調査中" },
  en: { fix: "Fix", feature: "New", improve: "Improve", feedback: "Feedback", wip: "Investigating" },
};

const EN_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function groupByYearMonth(entries: PatchEntry[]): Map<string, Map<string, PatchEntry[]>> {
  const grouped = new Map<string, Map<string, PatchEntry[]>>();
  for (const entry of entries) {
    const [year, month] = entry.date.split("-");
    if (!grouped.has(year)) grouped.set(year, new Map());
    const yearGroup = grouped.get(year)!;
    if (!yearGroup.has(month)) yearGroup.set(month, []);
    yearGroup.get(month)!.push(entry);
  }
  return grouped;
}

function PatchEntryBlock({
  entry,
  defaultOpen,
  badgeLabel,
}: {
  entry: PatchEntry;
  defaultOpen: boolean;
  badgeLabel: Record<ChangeType, string>;
}) {
  return (
    <details open={defaultOpen} className="border-b border-gray-100 last:border-b-0">
      <summary className="flex items-center gap-2 pl-8 pr-4 py-2 cursor-pointer hover:bg-gray-50 select-none list-none">
        <span className="text-xs font-medium text-gray-400">{entry.date}</span>
        {entry.title && (
          <span className="text-sm font-semibold text-gray-700">{entry.title}</span>
        )}
        <span className="ml-auto text-xs text-gray-400">{entry.changes.length}</span>
      </summary>
      <ul className="pl-8 pr-4 pb-3 space-y-1.5">
        {entry.changes.map((change, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span
              className={`shrink-0 mt-0.5 text-xs px-1.5 py-0.5 rounded font-medium ${badgeClass[change.type]}`}
            >
              {badgeLabel[change.type]}
            </span>
            <span>{change.text}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function MonthBlock({
  month,
  entries,
  defaultOpen,
  lang,
  badgeLabel,
}: {
  month: string;
  entries: PatchEntry[];
  defaultOpen: boolean;
  lang: string;
  badgeLabel: Record<ChangeType, string>;
}) {
  const totalChanges = entries.reduce((sum, e) => sum + e.changes.length, 0);
  const monthDisplay = lang === "ja" ? `${parseInt(month)}月` : EN_MONTHS[parseInt(month) - 1] ?? month;
  return (
    <details open={defaultOpen} className="border-b border-gray-100 last:border-b-0">
      <summary className="flex items-center gap-2 pl-5 pr-4 py-2 cursor-pointer hover:bg-gray-50 select-none list-none">
        <span className="text-xs font-semibold text-gray-500">{monthDisplay}</span>
        <span className="ml-auto text-xs text-gray-400">{totalChanges}</span>
      </summary>
      <div>
        {entries.map((entry, i) => (
          <PatchEntryBlock key={entry.date} entry={entry} defaultOpen={defaultOpen && i === 0} badgeLabel={badgeLabel} />
        ))}
      </div>
    </details>
  );
}

function YearBlock({
  year,
  monthMap,
  defaultOpen,
  lang,
  badgeLabel,
}: {
  year: string;
  monthMap: Map<string, PatchEntry[]>;
  defaultOpen: boolean;
  lang: string;
  badgeLabel: Record<ChangeType, string>;
}) {
  const yearDisplay = lang === "ja" ? `${year}年` : year;
  return (
    <details open={defaultOpen} className="border-b border-gray-200 last:border-b-0">
      <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-gray-50 select-none list-none">
        <span className="text-sm font-semibold text-gray-700">{yearDisplay}</span>
      </summary>
      <div>
        {[...monthMap.entries()].map(([month, entries], i) => (
          <MonthBlock
            key={month}
            month={month}
            entries={entries}
            defaultOpen={defaultOpen && i === 0}
            lang={lang}
            badgeLabel={badgeLabel}
          />
        ))}
      </div>
    </details>
  );
}

type TypeTab = "all" | ChangeType;

export function PatchNotesModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [typeTab, setTypeTab] = useState<TypeTab>("all");
  const [yearTab, setYearTab] = useState<string>("all");

  const lang = i18n.language.startsWith("ja") ? "ja" : "en";
  const badgeLabel = BADGE_LABELS[lang] ?? BADGE_LABELS.ja;

  const typeTabs: { id: TypeTab; label: string }[] = [
    { id: "all", label: lang === "ja" ? "全て" : "All" },
    { id: "feature", label: badgeLabel.feature },
    { id: "fix", label: badgeLabel.fix },
    { id: "improve", label: badgeLabel.improve },
    { id: "feedback", label: badgeLabel.feedback },
    { id: "wip", label: badgeLabel.wip },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const typeFiltered =
    typeTab === "all"
      ? patchNotes
      : patchNotes
          .map((entry) => ({
            ...entry,
            changes: entry.changes.filter((c) => c.type === typeTab),
          }))
          .filter((entry) => entry.changes.length > 0);

  const availableYears = [
    ...new Set(typeFiltered.map((e) => e.date.split("-")[0])),
  ].sort().reverse();

  const effectiveYearTab =
    yearTab === "all" || availableYears.includes(yearTab) ? yearTab : "all";

  const filtered =
    effectiveYearTab === "all"
      ? typeFiltered
      : typeFiltered.filter((e) => e.date.startsWith(effectiveYearTab));

  const grouped = groupByYearMonth(filtered);

  const handleTypeTab = (tab: TypeTab) => {
    setTypeTab(tab);
    setYearTab("all");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">{t("patchNotes")}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* タイプタブ */}
        <div className="border-b border-gray-200 shrink-0">
          <div className="flex -mb-px px-2">
            {typeTabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleTypeTab(id)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  typeTab === id
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 年タブ */}
        {availableYears.length > 1 && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100 shrink-0 flex-wrap">
            <button
              onClick={() => setYearTab("all")}
              className={`px-2.5 py-0.5 text-xs rounded-full font-medium transition-colors ${
                effectiveYearTab === "all"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {lang === "ja" ? "全期間" : "All"}
            </button>
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setYearTab(year)}
                className={`px-2.5 py-0.5 text-xs rounded-full font-medium transition-colors ${
                  effectiveYearTab === year
                    ? "bg-gray-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {lang === "ja" ? `${year}年` : year}
              </button>
            ))}
          </div>
        )}

        {/* エントリリスト */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {lang === "ja" ? "該当する更新はありません" : "No matching updates"}
            </div>
          ) : effectiveYearTab === "all" ? (
            [...grouped.entries()].map(([year, monthMap], i) => (
              <YearBlock
                key={year}
                year={year}
                monthMap={monthMap}
                defaultOpen={i === 0}
                lang={lang}
                badgeLabel={badgeLabel}
              />
            ))
          ) : (
            [...grouped.values()].flatMap((monthMap) =>
              [...monthMap.entries()].map(([month, entries], i) => (
                <MonthBlock
                  key={month}
                  month={month}
                  entries={entries}
                  defaultOpen={i === 0}
                  lang={lang}
                  badgeLabel={badgeLabel}
                />
              ))
            )
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full text-xs py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
