import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getPetSkillSummaryForCategory,
  getPatternLevels,
  getPetNameEn,
} from "../../data";
import type { PetStatCategory, PetCategoryGroup } from "../../data";
import { petStatGroups, PET_STAT_CATEGORY_ORDER } from "./grouping";

const SUBGROUP_STYLE: Record<string, string> = {
  "実数":       "bg-sky-50 text-sky-700 border-sky-200",
  "加算%":      "bg-emerald-50 text-emerald-700 border-emerald-200",
  "乗算（最終%）": "bg-violet-50 text-violet-700 border-violet-200",
};

const SUBGROUP_LABEL_KEY: Record<string, string> = {
  "実数":       "petSubgroup.flat",
  "加算%":      "petSubgroup.pct",
  "乗算（最終%）": "petSubgroup.finalPct",
};

function PetSubGroup({
  label, pets, showLabel, cat, subgroupKey, petName, petLevel, onPetChange, onLevelChange,
}: {
  label: string;
  pets: PetCategoryGroup["flat"];
  showLabel: boolean;
  cat: PetStatCategory;
  subgroupKey: keyof PetCategoryGroup;
  petName: string;
  petLevel: number;
  onPetChange: (name: string) => void;
  onLevelChange: (level: number) => void;
}) {
  const { t, i18n } = useTranslation("status");
  const isEn = i18n.language === "en";
  if (pets.length === 0) return null;
  const labelCls = SUBGROUP_STYLE[label] ?? "bg-gray-50 text-gray-500 border-gray-200";
  const translatedLabel = SUBGROUP_LABEL_KEY[label] ? t(SUBGROUP_LABEL_KEY[label]) : label;
  return (
    <>
      {showLabel && (
        <div className={`flex items-center gap-2 px-4 py-1 border-y text-xs font-semibold ${labelCls}`}>
          <span>{translatedLabel}</span>
          <span className="font-normal opacity-60">{`${pets.length}`}</span>
        </div>
      )}
      {pets.map((pet) => {
        const selected = petName === pet.name;
        const petLevels = getPatternLevels(pet.pattern);
        const maxLv = petLevels[petLevels.length - 1];
        return (
          <div key={pet.name}>
            <button
              type="button"
              onClick={() => {
                onPetChange(pet.name);
                if (!selected) onLevelChange(maxLv);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors border-l-2 ${
                selected
                  ? "bg-blue-50 text-blue-700 font-medium border-blue-400"
                  : "text-gray-700 hover:bg-gray-50 border-transparent"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected ? "bg-blue-400" : "bg-gray-300"}`} />
              <span className="flex-1 text-left text-xs truncate">{isEn ? (getPetNameEn(pet.name) ?? pet.name) : pet.name}</span>
              {pet.pattern === 2 && (
                <span className="text-xs text-purple-500 font-bold shrink-0 mr-1">P2</span>
              )}
              <span className="text-xs text-gray-400 shrink-0">{getPetSkillSummaryForCategory(pet, cat, subgroupKey)}</span>
            </button>
            {selected && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-6 py-2 bg-blue-50 border-t border-blue-100 border-l-2 border-l-blue-400">
                {petLevels.map((lv) => (
                  <label key={lv} className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      checked={petLevel === lv}
                      onChange={() => onLevelChange(lv)}
                      className="accent-blue-500"
                    />
                    <span className={petLevel === lv ? "text-blue-700 font-semibold" : "text-gray-600"}>
                      {lv === 0 ? t("common:none") : `Lv${lv}`}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ── Pet Selector Modal ────────────────────────────────────────────────────────

export function PetSelectorModal({
  slotLabel, petName, petLevel, onPetChange, onLevelChange, onClose,
}: {
  slotLabel: string;
  petName: string;
  petLevel: number;
  onPetChange: (name: string) => void;
  onLevelChange: (level: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation("status");
  const [openCategory, setOpenCategory] = useState<PetStatCategory | null>(null);

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
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
          >×</button>
        </div>

        {/* リスト */}
        <div className="overflow-y-auto flex-1">
          {/* なし */}
          <button
            type="button"
            onClick={() => { onPetChange(""); onLevelChange(0); onClose(); }}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-l-2 ${
              !petName
                ? "bg-blue-50 text-blue-700 font-medium border-blue-400"
                : "text-gray-500 hover:bg-gray-50 border-transparent"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${!petName ? "bg-blue-400" : "bg-gray-300"}`} />
            <span className="text-xs">{t("common:none")}</span>
          </button>

          {/* カテゴリアコーディオン */}
          {PET_STAT_CATEGORY_ORDER.map((cat) => {
            const group = petStatGroups.get(cat);
            const totalCount = (group?.flat.length ?? 0) + (group?.pct.length ?? 0) + (group?.finalPct.length ?? 0);
            if (!totalCount) return null;
            const isOpen = openCategory === cat;
            const hasMultipleGroups = group
              ? [group.flat, group.pct, group.finalPct].filter((g) => g.length > 0).length > 1
              : false;
            return (
              <div key={cat} className="border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setOpenCategory(isOpen ? null : cat)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isOpen ? "bg-indigo-50 text-indigo-700" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>{t(`petCategory.${cat}`)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-normal bg-white/80 rounded-full px-2 py-0.5 text-gray-500 border border-gray-200">
                      {t("bodyCount", { count: totalCount })}
                    </span>
                    <span className="text-xs text-gray-400">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>
                {isOpen && group && (
                  <div className="bg-white">
                    <PetSubGroup
                      label="実数" pets={group.flat} showLabel={hasMultipleGroups}
                      cat={cat} subgroupKey="flat"
                      petName={petName} petLevel={petLevel}
                      onPetChange={onPetChange} onLevelChange={onLevelChange}
                    />
                    <PetSubGroup
                      label="加算%" pets={group.pct} showLabel={hasMultipleGroups}
                      cat={cat} subgroupKey="pct"
                      petName={petName} petLevel={petLevel}
                      onPetChange={onPetChange} onLevelChange={onLevelChange}
                    />
                    <PetSubGroup
                      label="乗算（最終%）" pets={group.finalPct} showLabel={hasMultipleGroups}
                      cat={cat} subgroupKey="finalPct"
                      petName={petName} petLevel={petLevel}
                      onPetChange={onPetChange} onLevelChange={onLevelChange}
                    />
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
