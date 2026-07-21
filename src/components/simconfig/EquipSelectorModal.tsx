import { useTranslation } from "react-i18next";
import type { EquipmentSlot } from "../../types/game";
import { ModalShell, ModalBody } from "../ui/modal/ModalShell";
import { SelectorRow } from "../ui/modal/SelectorRow";
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

  const slotGroups = equipGroups.get(slot);
  const isNoneSelected = !selectedName || selectedName === "なし";
  const items = EQUIP_SERIES_ORDER.flatMap((series) => slotGroups?.get(series) ?? []);

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      size="lg"
      height="fixed"
      title={t("equipSelect", { slot: slotLabel })}
    >
      <ModalBody>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
          <SelectorRow
            selected={isNoneSelected}
            onClick={() => { onEquipChange(""); onClose(); }}
            primary={t("common:none")}
          />
          {items.map((item) => (
            <SelectorRow
              key={item.name}
              selected={selectedName === item.name}
              onClick={() => { onEquipChange(item.name); onClose(); }}
              primary={isEn ? (item.nameEn ?? item.name) : item.name}
              secondary={getEquipStatSummary(item) || undefined}
            />
          ))}
        </div>
      </ModalBody>
    </ModalShell>
  );
}
