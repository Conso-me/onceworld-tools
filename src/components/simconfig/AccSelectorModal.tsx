import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalShell, ModalBody } from "../ui/modal/ModalShell";
import { GroupNav } from "../ui/modal/GroupNav";
import { SelectorRow } from "../ui/modal/SelectorRow";
import {
  accGroups,
  ACC_CATEGORY_ORDER,
  ACC_SUBGROUP_ORDER,
  getAccSubgroup,
  getAccSummary,
  getAccMaxLvLabel,
  type AccCategory,
  type AccSubgroupKey,
} from "./grouping";

const NONE_ID = "__none__";

const SUBGROUP_STYLE: Record<AccSubgroupKey, string> = {
  flat: "bg-sky-50 text-sky-700 border-sky-200",
  pct: "bg-emerald-50 text-emerald-700 border-emerald-200",
  finalPct: "bg-violet-50 text-violet-700 border-violet-200",
};

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

  // 選択中アクセが属する最初のカテゴリを初期グループにする
  const [selectedCat, setSelectedCat] = useState<string>(() => {
    if (accName) {
      for (const cat of ACC_CATEGORY_ORDER) {
        if (accGroups.get(cat)?.some((a) => a.name === accName)) return cat;
      }
    }
    return NONE_ID;
  });

  const navItems = [
    { id: NONE_ID, label: t("common:none") },
    ...ACC_CATEGORY_ORDER.filter((cat) => accGroups.get(cat)?.length).map((cat) => ({
      id: cat,
      label: (
        <>
          {t(`accCategory.${cat}`)}
          <span className="ml-1 opacity-50 font-normal">{accGroups.get(cat)!.length}</span>
        </>
      ),
    })),
  ];

  const items = selectedCat === NONE_ID
    ? []
    : accGroups.get(selectedCat as AccCategory) ?? [];
  const groupedItems = ACC_SUBGROUP_ORDER
    .map((subgroupKey) => ({
      subgroupKey,
      items: items.filter((acc) => getAccSubgroup(acc, selectedCat as AccCategory) === subgroupKey),
    }))
    .filter(({ items: subgroupItems }) => subgroupItems.length > 0);

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
              selected={!accName}
              onClick={() => { onAccChange(""); onClose(); }}
              primary={t("common:none")}
            />
          ) : (
            groupedItems.map(({ subgroupKey, items: subgroupItems }) => (
              <div key={subgroupKey}>
                <div className={`flex items-center justify-between w-full px-4 py-1 border-y text-xs font-semibold ${SUBGROUP_STYLE[subgroupKey]}`}>
                  <span className="flex items-center gap-2">
                    <span>{t(`petSubgroup.${subgroupKey}`)}</span>
                    <span className="font-normal opacity-60">{subgroupItems.length}</span>
                  </span>
                </div>
                {subgroupItems.map((acc) => (
                  <SelectorRow
                    key={acc.name}
                    selected={accName === acc.name}
                    onClick={() => { onAccChange(acc.name); onClose(); }}
                    primary={isEn ? (acc.nameEn ?? acc.name) : acc.name}
                    secondary={
                      <>
                        {getAccSummary(acc, t)}
                        <span className="ml-2 opacity-60">{getAccMaxLvLabel(acc.maxLevel, t)}</span>
                      </>
                    }
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </ModalBody>
    </ModalShell>
  );
}
