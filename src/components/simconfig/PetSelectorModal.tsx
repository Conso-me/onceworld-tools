import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getPetSkillSummaryForCategory,
  getPatternLevels,
  getPetNameEn,
} from "../../data";
import type { PetStatCategory, PetCategoryGroup } from "../../data";
import { ModalShell, ModalBody } from "../ui/modal/ModalShell";
import { GroupNav } from "../ui/modal/GroupNav";
import { SelectorRow } from "../ui/modal/SelectorRow";
import { petStatGroups, PET_STAT_CATEGORY_ORDER } from "./grouping";

const NONE_ID = "__none__";

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
          <SelectorRow
            key={pet.name}
            selected={selected}
            onClick={() => {
              onPetChange(pet.name);
              if (!selected) onLevelChange(maxLv);
            }}
            primary={isEn ? (getPetNameEn(pet.name) ?? pet.name) : pet.name}
            badge={pet.pattern === 2 ? (
              <span className="text-xs text-purple-500 font-bold shrink-0 mr-1">P2</span>
            ) : undefined}
            secondary={getPetSkillSummaryForCategory(pet, cat, subgroupKey)}
          >
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-6 py-2 bg-accent-soft border-t border-line border-l-2 border-l-accent">
              {petLevels.map((lv) => (
                <label key={lv} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="radio"
                    checked={petLevel === lv}
                    onChange={() => onLevelChange(lv)}
                    className="accent-[var(--accent)]"
                  />
                  <span className={petLevel === lv ? "text-accent font-semibold" : "text-ink/70"}>
                    {lv === 0 ? t("common:none") : `Lv${lv}`}
                  </span>
                </label>
              ))}
            </div>
          </SelectorRow>
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

  // 選択中ペットが属するカテゴリを初期グループにする
  const [selectedCat, setSelectedCat] = useState<string>(() => {
    if (petName) {
      for (const cat of PET_STAT_CATEGORY_ORDER) {
        const g = petStatGroups.get(cat);
        if (g && [...g.flat, ...g.pct, ...g.finalPct].some((p) => p.name === petName)) {
          return cat;
        }
      }
    }
    return NONE_ID;
  });

  const navItems = [
    { id: NONE_ID, label: t("common:none") },
    ...PET_STAT_CATEGORY_ORDER.filter((cat) => {
      const g = petStatGroups.get(cat);
      return (g?.flat.length ?? 0) + (g?.pct.length ?? 0) + (g?.finalPct.length ?? 0) > 0;
    }).map((cat) => {
      const g = petStatGroups.get(cat)!;
      const totalCount = g.flat.length + g.pct.length + g.finalPct.length;
      return {
        id: cat,
        label: (
          <>
            {t(`petCategory.${cat}`)}
            <span className="ml-1 opacity-50 font-normal">{totalCount}</span>
          </>
        ),
      };
    }),
  ];

  const group = selectedCat === NONE_ID
    ? undefined
    : petStatGroups.get(selectedCat as PetStatCategory);
  const hasMultipleGroups = group
    ? [group.flat, group.pct, group.finalPct].filter((g) => g.length > 0).length > 1
    : false;

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      size="lg"
      height="fixed"
      title={t("equipSelect", { slot: slotLabel })}
    >
      <ModalBody>
        <GroupNav
          items={navItems}
          selectedId={selectedCat}
          onSelect={setSelectedCat}
          width="md"
        />
        <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
          {selectedCat === NONE_ID ? (
            <SelectorRow
              selected={!petName}
              onClick={() => { onPetChange(""); onLevelChange(0); onClose(); }}
              primary={t("common:none")}
            />
          ) : group ? (
            <>
              <PetSubGroup
                label="実数" pets={group.flat} showLabel={hasMultipleGroups}
                cat={selectedCat as PetStatCategory} subgroupKey="flat"
                petName={petName} petLevel={petLevel}
                onPetChange={onPetChange} onLevelChange={onLevelChange}
              />
              <PetSubGroup
                label="加算%" pets={group.pct} showLabel={hasMultipleGroups}
                cat={selectedCat as PetStatCategory} subgroupKey="pct"
                petName={petName} petLevel={petLevel}
                onPetChange={onPetChange} onLevelChange={onLevelChange}
              />
              <PetSubGroup
                label="乗算（最終%）" pets={group.finalPct} showLabel={hasMultipleGroups}
                cat={selectedCat as PetStatCategory} subgroupKey="finalPct"
                petName={petName} petLevel={petLevel}
                onPetChange={onPetChange} onLevelChange={onLevelChange}
              />
            </>
          ) : null}
        </div>
      </ModalBody>
    </ModalShell>
  );
}
