import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalShell, ModalBody } from "../ui/modal/ModalShell";
import { GroupNav } from "../ui/modal/GroupNav";
import { SelectorRow } from "../ui/modal/SelectorRow";
import { accGroups, ACC_CATEGORY_ORDER, getAccSummary, getAccMaxLvLabel, type AccCategory } from "./grouping";

const NONE_ID = "__none__";

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
            items.map((acc) => (
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
            ))
          )}
        </div>
      </ModalBody>
    </ModalShell>
  );
}
