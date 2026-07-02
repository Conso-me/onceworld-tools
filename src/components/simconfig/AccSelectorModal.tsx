import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { accGroups, ACC_CATEGORY_ORDER, getAccSummary, getAccMaxLvLabel, type AccCategory } from "./grouping";

export function AccSelectorModal({
  slotLabel, accName, onAccChange, onClose,
}: {
  slotLabel: string;
  accName: string;
  onAccChange: (name: string) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation("status");
  const isEn = i18n.language === "en";
  const [openCategory, setOpenCategory] = useState<AccCategory | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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
          <h3 className="text-sm font-semibold text-gray-700">{t("equipSelect", { slot: slotLabel })}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1">×</button>
        </div>

        {/* リスト */}
        <div className="overflow-y-auto flex-1">
          {/* なし */}
          <button
            type="button"
            onClick={() => { onAccChange(""); onClose(); }}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-l-2 ${
              !accName
                ? "bg-blue-50 text-blue-700 font-medium border-blue-400"
                : "text-gray-500 hover:bg-gray-50 border-transparent"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${!accName ? "bg-blue-400" : "bg-gray-300"}`} />
            <span className="text-xs">{t("common:none")}</span>
          </button>

          {/* カテゴリアコーディオン */}
          {ACC_CATEGORY_ORDER.map((cat) => {
            const items = accGroups.get(cat);
            if (!items?.length) return null;
            const isOpen = openCategory === cat;
            return (
              <div key={cat} className="border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setOpenCategory(isOpen ? null : cat)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isOpen ? "bg-indigo-50 text-indigo-700" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>{t(`accCategory.${cat}`)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-normal bg-white/80 rounded-full px-2 py-0.5 text-gray-500 border border-gray-200">
                      {items.length}
                    </span>
                    <span className="text-xs text-gray-400">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="bg-white">
                    {items.map((acc) => {
                      const selected = accName === acc.name;
                      return (
                        <button
                          key={acc.name}
                          type="button"
                          onClick={() => { onAccChange(acc.name); onClose(); }}
                          className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors border-l-2 border-b border-b-gray-100 last:border-b-0 ${
                            selected
                              ? "bg-blue-50 text-blue-700 font-medium border-l-blue-400"
                              : "text-gray-700 hover:bg-gray-50 border-l-transparent"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected ? "bg-blue-400" : "bg-gray-300"}`} />
                          <span className="flex-1 text-left text-xs truncate">{isEn ? (acc.nameEn ?? acc.name) : acc.name}</span>
                          <span className="text-xs text-gray-400 shrink-0">{getAccSummary(acc, t)}</span>
                          <span className="text-xs text-gray-300 shrink-0">{getAccMaxLvLabel(acc.maxLevel, t)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full text-xs py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
          >
            {t("common:close")}
          </button>
        </div>
      </div>
    </div>
  );
}
