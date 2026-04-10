import { useState, useEffect, useCallback } from "react";
import { useSharedSimConfig } from "../../hooks/useSharedSimConfig";
import { calcStatus } from "../../utils/statusCalc";
import { getEquipmentByName } from "../../data/equipment";

const STAT_LABELS: Record<string, string> = {
  vit: "VIT", spd: "SPD", atk: "ATK", int: "INT",
  def: "DEF", mdef: "M-DEF", luck: "LUCK",
};
const STAT_KEYS = ["vit", "spd", "atk", "int", "def", "mdef", "luck"] as const;

function fmt(n: number) {
  return n.toLocaleString("ja-JP");
}

function EnhBadge({ enh, canEnhance }: { enh: number; canEnhance: boolean }) {
  if (!canEnhance) return null;
  return (
    <span className="text-gray-400 text-xs ml-1">+{enh}</span>
  );
}

function ItemRow({ label, name, enh, canEnhance }: {
  label: string;
  name: string;
  enh?: number;
  canEnhance?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5 text-xs">
      <span className="text-gray-400 w-8 shrink-0">{label}</span>
      {name
        ? <>
            <span className="text-gray-800 font-medium">{name}</span>
            {enh !== undefined && <EnhBadge enh={enh} canEnhance={canEnhance ?? true} />}
          </>
        : <span className="text-gray-300">-</span>
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
  const [cfg] = useSharedSimConfig();
  const [copied, setCopied] = useState(false);

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

  const armorSlots = [
    { label: "頭", name: cfg.equipHead,   enh: cfg.enhHead,   item: cfg.equipHead   ? getEquipmentByName(cfg.equipHead)   : undefined },
    { label: "服", name: cfg.equipBody,   enh: cfg.enhBody,   item: cfg.equipBody   ? getEquipmentByName(cfg.equipBody)   : undefined },
    { label: "手", name: cfg.equipHand,   enh: cfg.enhHand,   item: cfg.equipHand   ? getEquipmentByName(cfg.equipHand)   : undefined },
    { label: "盾", name: cfg.equipShield, enh: cfg.enhShield, item: cfg.equipShield ? getEquipmentByName(cfg.equipShield) : undefined },
    { label: "脚", name: cfg.equipFoot,   enh: cfg.enhFoot,   item: cfg.equipFoot   ? getEquipmentByName(cfg.equipFoot)   : undefined },
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
    const lines: string[] = ["【装備】"];
    lines.push(`  武器: ${cfg.equipWeapon || "なし"}${cfg.equipWeapon && weaponCanEnh ? ` +${cfg.enhWeapon}` : ""}`);
    for (const { label, name, enh, item } of armorSlots) {
      const canEnh = item ? item.material !== "強化できない" : true;
      lines.push(`  ${label}: ${name || "なし"}${name && canEnh ? ` +${enh}` : ""}`);
    }
    if (setBonus) lines.push(`  ★セット効果: ${setBonusSeries}`);

    lines.push("");
    lines.push("【アクセサリー】");
    for (const { name, level } of accSlots) {
      if (name) lines.push(`  ${name} Lv.${level}`);
    }
    if (accSlots.every((s) => !s.name)) lines.push("  なし");

    lines.push("");
    lines.push("【ペット】");
    for (const { name, level } of petSlots) {
      if (name) lines.push(`  ${name} Lv.${level}`);
    }
    if (petSlots.every((s) => !s.name)) lines.push("  なし");

    lines.push("");
    lines.push("【ステータス割り振り】");
    lines.push(`  VIT:   ${fmt(cfg.allocVit)}`);
    lines.push(`  SPD:   ${fmt(cfg.allocSpd)}`);
    lines.push(`  ATK:   ${fmt(cfg.allocAtk)}`);
    lines.push(`  INT:   ${fmt(cfg.allocInt)}`);
    lines.push(`  DEF:   ${fmt(cfg.allocDef)}`);
    lines.push(`  M-DEF: ${fmt(cfg.allocMdef)}`);
    lines.push(`  LUCK:  ${fmt(cfg.allocLuck)}`);
    lines.push(`  合計:  ${fmt(allocTotal)}`);

    lines.push("");
    lines.push("【最終ステータス】");
    lines.push(`  VIT:   ${fmt(final.vit)}`);
    lines.push(`  SPD:   ${fmt(final.spd)}`);
    lines.push(`  ATK:   ${fmt(final.atk)}`);
    lines.push(`  INT:   ${fmt(final.int)}`);
    lines.push(`  DEF:   ${fmt(final.def)}`);
    lines.push(`  M-DEF: ${fmt(final.mdef)}`);
    lines.push(`  LUCK:  ${fmt(final.luck)}`);
    lines.push(`  HP:    ${fmt(hp)}`);

    return lines.join("\n");
  }, [cfg, weaponCanEnh, armorSlots, accSlots, petSlots, setBonus, setBonusSeries, allocTotal, final, hp]);

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
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">装備サマリー</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {copied ? "コピー済み ✓" : "テキストコピー"}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* 本体 */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {/* 装備 */}
          <div>
            <SectionHeader>装備</SectionHeader>
            <div className="space-y-1">
              <ItemRow label="武器" name={cfg.equipWeapon} enh={cfg.enhWeapon} canEnhance={weaponCanEnh} />
              {armorSlots.map(({ label, name, enh, item }) => (
                <ItemRow
                  key={label}
                  label={label}
                  name={name}
                  enh={enh}
                  canEnhance={item ? item.material !== "強化できない" : true}
                />
              ))}
            </div>
            {setBonus && (
              <div className="mt-1.5 text-xs text-indigo-500 font-medium">
                ★ セット効果: {setBonusSeries}
              </div>
            )}
          </div>

          {/* アクセサリー */}
          <div>
            <SectionHeader>アクセサリー</SectionHeader>
            <div className="space-y-1">
              {accSlots.map((s, i) => (
                <div key={i} className="flex items-baseline gap-1.5 text-xs">
                  <span className="text-gray-400 w-8 shrink-0">{i + 1}</span>
                  {s.name
                    ? <>
                        <span className="text-gray-800 font-medium">{s.name}</span>
                        <span className="text-gray-400 ml-1">Lv.{s.level}</span>
                      </>
                    : <span className="text-gray-300">-</span>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* ペット */}
          <div>
            <SectionHeader>ペット</SectionHeader>
            <div className="space-y-1">
              {petSlots.map((s, i) => (
                <div key={i} className="flex items-baseline gap-1.5 text-xs">
                  <span className="text-gray-400 w-8 shrink-0">{i + 1}</span>
                  {s.name
                    ? <>
                        <span className="text-gray-800 font-medium">{s.name}</span>
                        <span className="text-gray-400 ml-1">Lv.{s.level}</span>
                      </>
                    : <span className="text-gray-300">-</span>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* ステータス割り振り */}
          <div>
            <SectionHeader>ステータス割り振り</SectionHeader>
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
            <div className="text-xs text-gray-400 mt-1 text-right">合計 {fmt(allocTotal)}</div>
          </div>

          {/* 最終ステータス */}
          <div>
            <SectionHeader>最終ステータス</SectionHeader>
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
