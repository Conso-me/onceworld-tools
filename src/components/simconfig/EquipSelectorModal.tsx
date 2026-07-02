import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { EquipmentSlot } from "../../types/game";
import { ModalShell, ModalBody } from "../ui/modal/ModalShell";
import { GroupNav } from "../ui/modal/GroupNav";
import { SelectorRow } from "../ui/modal/SelectorRow";
import { equipGroups, EQUIP_SERIES_ORDER, getEquipStatSummary, type EquipSeries } from "./grouping";

const NONE_ID = "__none__";

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

  const slotGroups = equipGroups.get(slot);
  const isNoneSelected = !selectedName || selectedName === "なし";

  // 装備中アイテムの series を初期グループにする
  const [selectedSeries, setSelectedSeries] = useState<string>(() => {
    if (!isNoneSelected && slotGroups) {
      for (const [series, items] of slotGroups) {
        if (items.some((i) => i.name === selectedName)) return series;
      }
    }
    return NONE_ID;
  });

  const navItems = [
    { id: NONE_ID, label: t("common:none") },
    ...EQUIP_SERIES_ORDER.filter((s) => slotGroups?.get(s)?.length).map((series) => ({
      id: series,
      label: t(`equipSeries.${series}`),
    })),
  ];

  const items = selectedSeries === NONE_ID
    ? []
    : slotGroups?.get(selectedSeries as EquipSeries) ?? [];

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
          selectedId={selectedSeries}
          onSelect={setSelectedSeries}
          width="sm"
        />
        <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
          {selectedSeries === NONE_ID ? (
            <SelectorRow
              selected={isNoneSelected}
              onClick={() => { onEquipChange(""); onClose(); }}
              primary={t("common:none")}
            />
          ) : (
            items.map((item) => (
              <SelectorRow
                key={item.name}
                selected={selectedName === item.name}
                onClick={() => { onEquipChange(item.name); onClose(); }}
                primary={isEn ? (item.nameEn ?? item.name) : item.name}
                secondary={getEquipStatSummary(item) || undefined}
              />
            ))
          )}
        </div>
      </ModalBody>
    </ModalShell>
  );
}
