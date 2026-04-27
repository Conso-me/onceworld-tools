import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSharedSimConfig } from "../../hooks/useSharedSimConfig";
import { usePersistedState } from "../../hooks/usePersistedState";
import { calcStatus } from "../../utils/statusCalc";
import { getEquipmentByName } from "../../data/equipment";
import { getAccessoryByName } from "../../data/accessories";
import { getPetNameEn } from "../../data/petSkills";

const STAT_LABELS: Record<string, string> = {
  vit: "VIT", spd: "SPD", atk: "ATK", int: "INT",
  def: "DEF", mdef: "M-DEF", luck: "LUCK",
};
const STAT_KEYS = ["vit", "spd", "atk", "int", "def", "mdef", "luck"] as const;

function fmt(n: number) {
  return n.toLocaleString();
}

function ItemRow({ label, name, enh, canEnhance }: {
  label: string;
  name: string;
  enh?: number;
  canEnhance?: boolean;
}) {
  return (
    <div className="flex items-baseline text-xs gap-2">
      <span className="text-gray-400 w-8 shrink-0">{label}</span>
      {name
        ? <>
            <span className="text-gray-800 font-medium flex-1 min-w-0 truncate">{name}</span>
            {enh !== undefined && (canEnhance ?? true) && (
              <span className="text-gray-400 shrink-0">+{enh}</span>
            )}
          </>
        : <span className="text-gray-300 flex-1">-</span>
      }
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold text-indigo-600 border-b border-indigo-100 pb-0.5 mb-1.5">
      {children}
    </div>
  );
}

export function EquipmentSummaryModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation(["common", "status", "game"]);
  const isEn = i18n.language === "en";
  const displayName = (jaName: string, nameEn?: string) => (isEn ? (nameEn ?? jaName) : jaName);
  const [cfg] = useSharedSimConfig();
  const [copied, setCopied] = useState(false);
  const [crystalCubeRaw] = usePersistedState("dmg:crystalCube", "");
  const crystalCubeNum = Math.min(parseInt(crystalCubeRaw) || 0, 1000);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const breakdown = calcStatus(cfg);
  const { final, hp, setBonus, setBonusSeries } = breakdown;

  const weaponItem = cfg.equipWeapon ? getEquipmentByName(cfg.equipWeapon) : undefined;
  const weaponCanEnh = weaponItem ? weaponItem.material !== "強化できない" : true;

  const slotLabel = (slot: string) => t(`game:equipSlot.${slot}`);
  const noneText = t("common:none");

  const armorSlots = [
    { slot: "頭", name: cfg.equipHead,   enh: cfg.enhHead,   item: cfg.equipHead   ? getEquipmentByName(cfg.equipHead)   : undefined },
    { slot: "服", name: cfg.equipBody,   enh: cfg.enhBody,   item: cfg.equipBody   ? getEquipmentByName(cfg.equipBody)   : undefined },
    { slot: "手", name: cfg.equipHand,   enh: cfg.enhHand,   item: cfg.equipHand   ? getEquipmentByName(cfg.equipHand)   : undefined },
    { slot: "盾", name: cfg.equipShield, enh: cfg.enhShield, item: cfg.equipShield ? getEquipmentByName(cfg.equipShield) : undefined },
    { slot: "脚", name: cfg.equipFoot,   enh: cfg.enhFoot,   item: cfg.equipFoot   ? getEquipmentByName(cfg.equipFoot)   : undefined },
  ] as const;

  const accSlots = [
    { name: cfg.acc1, level: cfg.acc1Level },
    { name: cfg.acc2, level: cfg.acc2Level },
    { name: cfg.acc3, level: cfg.acc3Level },
    { name: cfg.acc4, level: cfg.acc4Level },
  ];

  const petSlots = [
    { name: cfg.petName,  level: cfg.petLevel  },
    { name: cfg.pet2Name, level: cfg.pet2Level },
    { name: cfg.pet3Name, level: cfg.pet3Level },
  ];

  const allocTotal = cfg.allocVit + cfg.allocSpd + cfg.allocAtk + cfg.allocInt
    + cfg.allocDef + cfg.allocMdef + cfg.allocLuck;

  const buildCopyText = useCallback(() => {
    const lines: string[] = [
      `【${t("common:characterInfo")}】`,
      `  ${t("status:level")}: ${cfg.charLevel}`,
      `  ${t("common:destiny")}: ${cfg.reinCount}`,
      `  ${t("status:element")}: ${cfg.charElement}`,
      `  ${t("status:crystalCube")}: ${crystalCubeNum.toLocaleString()}${t("common:units")}`,
      "",
      `【${t("status:equipment")}】`,
    ];
    lines.push(`  ${slotLabel("武器")}: ${cfg.equipWeapon || noneText}${cfg.equipWeapon && weaponCanEnh ? ` +${cfg.enhWeapon}` : ""}`);
    for (const { slot, name, enh, item } of armorSlots) {
      const canEnh = item ? item.material !== "強化できない" : true;
      lines.push(`  ${slotLabel(slot)}: ${name || noneText}${name && canEnh ? ` +${enh}` : ""}`);
    }
    if (setBonus) lines.push(`  ★${t("common:setBonus")}: ${setBonusSeries}`);

    lines.push("");
    lines.push(`【${t("status:accessory")}】`);
    for (const { name, level } of accSlots) {
      if (name) lines.push(`  ${name} Lv.${level}`);
    }
    if (accSlots.every((s) => !s.name)) lines.push(`  ${noneText}`);

    lines.push("");
    lines.push(`【${t("status:pet")}】`);
    for (const { name, level } of petSlots) {
      if (name) lines.push(`  ${name} Lv.${level}`);
    }
    if (petSlots.every((s) => !s.name)) lines.push(`  ${noneText}`);

    const alignStats = (entries: [string, number][]) => {
      const maxLabel = Math.max(...entries.map(([l]) => l.length));
      const vals = entries.map(([, v]) => fmt(v));
      const maxVal = Math.max(...vals.map((v) => v.length));
      return entries.map(([l], i) => `  ${l.padStart(maxLabel)}: ${vals[i].padStart(maxVal)}`);
    };

    lines.push("");
    lines.push(`【${t("common:statAllocation")}】`);
    for (const l of alignStats([
      ["VIT",   cfg.allocVit],
      ["SPD",   cfg.allocSpd],
      ["ATK",   cfg.allocAtk],
      ["INT",   cfg.allocInt],
      ["DEF",   cfg.allocDef],
      ["M-DEF", cfg.allocMdef],
      ["LUCK",  cfg.allocLuck],
      [t("common:total"), allocTotal],
    ])) lines.push(l);

    lines.push("");
    lines.push(`【${t("common:finalStatus")}】`);
    for (const l of alignStats([
      ["VIT",   final.vit],
      ["SPD",   final.spd],
      ["ATK",   final.atk],
      ["INT",   final.int],
      ["DEF",   final.def],
      ["M-DEF", final.mdef],
      ["LUCK",  final.luck],
      ["HP",    hp],
    ])) lines.push(l);

    return lines.join("\n");
  }, [t, cfg, crystalCubeNum, weaponCanEnh, armorSlots, accSlots, petSlots, setBonus, setBonusSeries, allocTotal, final, hp, noneText]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select textarea content
    }
  }, [buildCopyText]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">{t("common:equipmentSummary")}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {copied ? t("common:copied") : t("common:copyText")}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
            >
              ×
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          <div>
            <SectionHeader>{t("common:characterInfo")}</SectionHeader>
            <div className="grid grid-cols-4 gap-x-2 gap-y-1">
              <div className="flex flex-col items-center bg-gray-50 rounded-lg px-2 py-1">
                <span className="text-xs text-gray-400">{t("status:level")}</span>
                <span className="text-xs font-semibold text-gray-700">{fmt(cfg.charLevel)}</span>
              </div>
              <div className="flex flex-col items-center bg-gray-50 rounded-lg px-2 py-1">
                <span className="text-xs text-gray-400">{t("common:destiny")}</span>
                <span className="text-xs font-semibold text-gray-700">{cfg.reinCount}</span>
              </div>
              <div className="flex flex-col items-center bg-gray-50 rounded-lg px-2 py-1">
                <span className="text-xs text-gray-400">{t("status:element")}</span>
                <span className="text-xs font-semibold text-gray-700">{t(`game:element.${cfg.charElement}`)}</span>
              </div>
              <div className="flex flex-col items-center bg-gray-50 rounded-lg px-2 py-1">
                <span className="text-xs text-gray-400">{t("status:crystalCube")}</span>
                <span className="text-xs font-semibold text-gray-700">{fmt(crystalCubeNum)}{t("common:units")}</span>
              </div>
            </div>
          </div>

          <div>
            <SectionHeader>{t("status:equipment")}</SectionHeader>
            <div className="space-y-1 max-w-[60%]">
              <ItemRow label={slotLabel("武器")} name={displayName(cfg.equipWeapon, weaponItem?.nameEn)} enh={cfg.enhWeapon} canEnhance={weaponCanEnh} />
              {armorSlots.map(({ slot, name, enh, item }) => (
                <ItemRow
                  key={slot}
                  label={slotLabel(slot)}
                  name={displayName(name, item?.nameEn)}
                  enh={enh}
                  canEnhance={item ? item.material !== "強化できない" : true}
                />
              ))}
            </div>
            {setBonus && (
              <div className="mt-1.5 text-xs text-indigo-500 font-medium">
                ★ {t("common:setBonus")}: {setBonusSeries}
              </div>
            )}
          </div>

          <div>
            <SectionHeader>{t("status:accessory")}</SectionHeader>
            <div className="space-y-1 max-w-[60%]">
              {accSlots.map((s, i) => (
                <div key={i} className="flex items-baseline gap-2 text-xs">
                  <span className="text-gray-400 w-8 shrink-0">{i + 1}</span>
                  {s.name
                    ? <>
                        <span className="text-gray-800 font-medium flex-1 min-w-0 truncate">{displayName(s.name, getAccessoryByName(s.name)?.nameEn)}</span>
                        <span className="text-gray-400 shrink-0">Lv.{s.level}</span>
                      </>
                    : <span className="text-gray-300 flex-1">-</span>
                  }
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader>{t("status:pet")}</SectionHeader>
            <div className="space-y-1 max-w-[60%]">
              {petSlots.map((s, i) => (
                <div key={i} className="flex items-baseline gap-2 text-xs">
                  <span className="text-gray-400 w-8 shrink-0">{i + 1}</span>
                  {s.name
                    ? <>
                        <span className="text-gray-800 font-medium flex-1 min-w-0 truncate">{displayName(s.name, getPetNameEn(s.name))}</span>
                        <span className="text-gray-400 shrink-0">Lv.{s.level}</span>
                      </>
                    : <span className="text-gray-300 flex-1">-</span>
                  }
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader>{t("common:statAllocation")}</SectionHeader>
            <div className="grid grid-cols-4 gap-x-2 gap-y-1">
              {STAT_KEYS.map((k) => {
                const alloc = cfg[`alloc${k.charAt(0).toUpperCase() + k.slice(1)}` as keyof typeof cfg] as number;
                return (
                  <div key={k} className="flex flex-col items-center bg-gray-50 rounded-lg px-2 py-1">
                    <span className="text-xs text-gray-400">{STAT_LABELS[k]}</span>
                    <span className="text-xs font-semibold text-gray-700">{fmt(alloc)}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-gray-400 mt-1 text-right">{t("common:total")} {fmt(allocTotal)}</div>
          </div>

          <div>
            <SectionHeader>{t("common:finalStatus")}</SectionHeader>
            <div className="grid grid-cols-4 gap-x-2 gap-y-1">
              {STAT_KEYS.map((k) => (
                <div key={k} className="flex flex-col items-center bg-indigo-50 rounded-lg px-2 py-1">
                  <span className="text-xs text-indigo-400">{STAT_LABELS[k]}</span>
                  <span className="text-xs font-semibold text-indigo-700">{fmt(final[k])}</span>
                </div>
              ))}
              <div className="flex flex-col items-center bg-red-50 rounded-lg px-2 py-1">
                <span className="text-xs text-red-400">HP</span>
                <span className="text-xs font-semibold text-red-700">{fmt(hp)}</span>
              </div>
            </div>
          </div>
        </div>

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
