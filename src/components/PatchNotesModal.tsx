import { useEffect } from "react";
import type { PatchEntry, ChangeType } from "../data/patchNotes";
import { patchNotes } from "../data/patchNotes";

const badgeClass: Record<ChangeType, string> = {
  fix: "bg-red-100 text-red-600",
  feature: "bg-green-100 text-green-600",
  improve: "bg-blue-100 text-blue-600",
};

const badgeLabel: Record<ChangeType, string> = {
  fix: "修正",
  feature: "追加",
  improve: "改善",
};

function PatchEntryBlock({
  entry,
  defaultOpen,
}: {
  entry: PatchEntry;
  defaultOpen: boolean;
}) {
  return (
    <details open={defaultOpen} className="border-b border-gray-100 last:border-b-0">
      <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-gray-50 select-none list-none">
        <span className="text-xs font-medium text-gray-400">{entry.date}</span>
        {entry.title && (
          <span className="text-sm font-semibold text-gray-700">{entry.title}</span>
        )}
        <span className="ml-auto text-xs text-gray-400">{entry.changes.length}件</span>
      </summary>
      <ul className="px-4 pb-3 space-y-1.5">
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

export function PatchNotesModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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
          <h3 className="text-sm font-semibold text-gray-700">更新履歴</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* エントリリスト */}
        <div className="overflow-y-auto flex-1">
          {patchNotes.map((entry, i) => (
            <PatchEntryBlock key={entry.date} entry={entry} defaultOpen={i === 0} />
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
