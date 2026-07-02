import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { EquipmentSlot } from "../../types/game";
import { equipGroups, EQUIP_SERIES_ORDER, getEquipStatSummary } from "./grouping";

export function EquipSelectorModal({
  slotLabel, slot, selectedName, onEquipChange, onClose,
}: {
  slotLabel: string;
  slot: EquipmentSlot;
  selectedName: string;
  onEquipChange: (name: string) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation("status");
  const isEn = i18n.language === "en";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const slotGroups = equipGroups.get(slot);
  const isNoneSelected = !selectedName || selectedName === "なし";

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

        {/* リスト（常に展開） */}
        <div className="overflow-y-auto flex-1">
          {/* なし */}
          <button
            type="button"
            onClick={() => { onEquipChange(""); onClose(); }}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-l-2 ${
              isNoneSelected
                ? "bg-blue-50 text-blue-700 font-medium border-blue-400"
                : "text-gray-500 hover:bg-gray-50 border-transparent"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isNoneSelected ? "bg-blue-400" : "bg-gray-300"}`} />
            <span className="text-xs">{t("common:none")}</span>
          </button>

          {/* シリーズ見出し + アイテム（常に展開） */}
          {EQUIP_SERIES_ORDER.map((series) => {
            const items = slotGroups?.get(series);
            if (!items?.length) return null;
            return (
              <div key={series} className="border-t border-gray-200">
                <div className="px-4 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t(`equipSeries.${series}`)}
                </div>
                <div className="bg-white">
                  {items.map((item) => {
                    const selected = selectedName === item.name;
                    const summary = getEquipStatSummary(item);
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => { onEquipChange(item.name); onClose(); }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors border-l-2 border-b border-b-gray-100 last:border-b-0 ${
                          selected
                            ? "bg-blue-50 text-blue-700 font-medium border-l-blue-400"
                            : "text-gray-700 hover:bg-gray-50 border-l-transparent"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected ? "bg-blue-400" : "bg-gray-300"}`} />
                        <span className="flex-1 text-left text-xs truncate">{isEn ? (item.nameEn ?? item.name) : item.name}</span>
                        {summary && <span className="text-xs text-gray-400 shrink-0">{summary}</span>}
                      </button>
                    );
                  })}
                </div>
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
