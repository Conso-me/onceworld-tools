import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSimPresets, type SimPresetExtra } from "../hooks/useSimPresets";
import { calcAllocatedPoints, getAvailablePoints, getPerStatLimit } from "../utils/statusCalc";
import {
  getEquipmentByName, equipment,
  getAccessoryByName, accessories,
  getPetsByPrimaryStat, getPetSkillSummaryForCategory,
  getPatternLevels, getPetMaxLevel, getPetNameEn,
} from "../data";
import type { PetStatCategory, PetCategoryGroup } from "../data";
import type { SimConfig, CoreStats, EquipmentSlot, Element, AccessoryItem, EquipmentItem } from "../types/game";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SimSetField = <K extends keyof SimConfig>(field: K, value: SimConfig[K]) => void;

// ── Constants ─────────────────────────────────────────────────────────────────

export const STAT_LABELS: { key: keyof CoreStats; label: string }[] = [
  { key: "vit",  label: "VIT" },
  { key: "spd",  label: "SPD" },
  { key: "atk",  label: "ATK" },
  { key: "int",  label: "INT" },
  { key: "def",  label: "DEF" },
  { key: "mdef", label: "M-DEF" },
  { key: "luck", label: "LUCK" },
];

const EQUIPMENT_SLOTS: {
  slot: EquipmentSlot;
  cfgKey: keyof SimConfig; enhKey: keyof SimConfig;
}[] = [
  { slot: "武器", cfgKey: "equipWeapon",  enhKey: "enhWeapon"  },
  { slot: "頭",   cfgKey: "equipHead",    enhKey: "enhHead"    },
  { slot: "服",   cfgKey: "equipBody",    enhKey: "enhBody"    },
  { slot: "手",   cfgKey: "equipHand",    enhKey: "enhHand"    },
  { slot: "盾",   cfgKey: "equipShield",  enhKey: "enhShield"  },
  { slot: "脚",   cfgKey: "equipFoot",    enhKey: "enhFoot"    },
];

const ACC_SLOTS: {
  nameKey: keyof SimConfig; levelKey: keyof SimConfig;
}[] = [
  { nameKey: "acc1", levelKey: "acc1Level" },
  { nameKey: "acc2", levelKey: "acc2Level" },
  { nameKey: "acc3", levelKey: "acc3Level" },
  { nameKey: "acc4", levelKey: "acc4Level" },
];

const PET_SLOTS: {
  nameKey: keyof SimConfig; levelKey: keyof SimConfig;
}[] = [
  { nameKey: "petName",  levelKey: "petLevel"  },
  { nameKey: "pet2Name", levelKey: "pet2Level" },
  { nameKey: "pet3Name", levelKey: "pet3Level" },
];

// パターン別レベルは getPatternLevels() で取得するため定数は不要

const ELEMENTS: Element[] = ["火", "水", "木", "光", "闇"];

const PET_STAT_CATEGORY_ORDER: PetStatCategory[] = [
  "体力", "攻撃力", "魔力", "防御力", "魔法防御力", "幸運", "攻撃速度",
  "経験値", "捕獲率", "ドロップ率", "MOV", "HP回復", "その他",
];

// Computed once — pet data is static
const petStatGroups = getPetsByPrimaryStat();

// ── Equipment grouping ────────────────────────────────────────────────────────

const EQUIP_SERIES_ORDER = ["皮", "鉄", "プラチナ", "魔導士", "獄炎", "ドラゴン", "暴君", "悪魔", "その他"] as const;
type EquipSeries = typeof EQUIP_SERIES_ORDER[number];

// Computed once — slot → series → items (items named "なし" are excluded)
const equipGroups = (() => {
  const slotMap = new Map<EquipmentSlot, Map<EquipSeries, EquipmentItem[]>>();
  for (const item of equipment) {
    if (item.name === "なし") continue;
    if (!slotMap.has(item.slot)) slotMap.set(item.slot, new Map());
    const seriesMap = slotMap.get(item.slot)!;
    const series: EquipSeries = (item.series as EquipSeries) ?? "その他";
    if (!seriesMap.has(series)) seriesMap.set(series, []);
    seriesMap.get(series)!.push(item);
  }
  return slotMap;
})();

function getEquipStatSummary(item: EquipmentItem): string {
  const stats = [
    { key: "ATK", val: item.atk }, { key: "INT", val: item.int },
    { key: "DEF", val: item.def }, { key: "M-DEF", val: item.mdef },
    { key: "VIT", val: item.vit }, { key: "SPD", val: item.spd },
    { key: "LUCK", val: item.luck },
  ].filter((s) => s.val > 0).sort((a, b) => b.val - a.val);
  return stats.slice(0, 2).map((s) => `${s.key} +${s.val}`).join("・");
}

// ── Accessory grouping ────────────────────────────────────────────────────────

const ACC_CATEGORY_ORDER = ["体力", "攻撃力", "魔力", "防御力", "魔法防御力", "幸運", "攻撃速度", "経験値", "捕獲率", "ドロップ率", "MOV", "HP回復", "その他"] as const;
type AccCategory = typeof ACC_CATEGORY_ORDER[number];

function accEffectCat(type: string): AccCategory {
  if (type.startsWith("VIT"))    return "体力";
  if (type.startsWith("ATK"))    return "攻撃力";
  if (type.startsWith("INT"))    return "魔力";
  if (type.startsWith("M-DEF"))  return "魔法防御力";
  if (type.startsWith("DEF"))    return "防御力";
  if (type.startsWith("LUCK"))   return "幸運";
  if (type.startsWith("SPD"))    return "攻撃速度";
  if (type === "経験値")         return "経験値";
  if (type === "捕獲率")         return "捕獲率";
  if (type === "ドロップ率")     return "ドロップ率";
  if (type === "MOV")            return "MOV";
  if (type === "HP回復")         return "HP回復";
  return "その他";
}

// Computed once — accessory data is static
// Multi-effect accessories appear in all matching categories
const accGroups = (() => {
  const map = new Map<AccCategory, AccessoryItem[]>();
  for (const acc of accessories) {
    const cats = new Set<AccCategory>(
      acc.effects.length > 0
        ? acc.effects.map(e => accEffectCat(e.type))
        : ["その他"]
    );
    for (const cat of cats) {
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(acc);
    }
  }
  return map;
})();

const ACC_EFFECT_TYPE_CATEGORY_KEY: Record<string, string> = {
  "経験値": "経験値",
  "捕獲率": "捕獲率",
  "ドロップ率": "ドロップ率",
  "HP回復": "HP回復",
};

function getAccSummary(acc: AccessoryItem, tFn?: (key: string) => string): string {
  const effects = acc.effects;
  // 全effectが同じ%値 → "ALL+X%" で圧縮
  if (effects.length >= 3 && effects.every(e => e.type.endsWith("%") && e.value === effects[0].value)) {
    return `ALL+${effects[0].value}%`;
  }
  return effects.map((e) => {
    const catKey = ACC_EFFECT_TYPE_CATEGORY_KEY[e.type];
    const label = tFn && catKey ? tFn(`accCategory.${catKey}`) : e.type;
    return `${label} +${e.value}`;
  }).join("・");
}

function getAccMaxLvLabel(maxLevel: number, tFn: (key: string) => string): string {
  return maxLevel >= 9999 ? tFn("cannotEnhance") : `Lv~${maxLevel}`;
}

const PROTEIN_KEYS: { cfg: keyof SimConfig; label: string }[] = [
  { cfg: "proteinVit",  label: "VIT"   },
  { cfg: "proteinSpd",  label: "SPD"   },
  { cfg: "proteinAtk",  label: "ATK"   },
  { cfg: "proteinInt",  label: "INT"   },
  { cfg: "proteinDef",  label: "DEF"   },
  { cfg: "proteinMdef", label: "M-DEF" },
  { cfg: "proteinLuck", label: "LUCK"  },
];

const ALLOC_KEYS: { cfg: keyof SimConfig; label: string }[] = [
  { cfg: "allocVit",  label: "VIT"   },
  { cfg: "allocSpd",  label: "SPD"   },
  { cfg: "allocAtk",  label: "ATK"   },
  { cfg: "allocInt",  label: "INT"   },
  { cfg: "allocDef",  label: "DEF"   },
  { cfg: "allocMdef", label: "M-DEF" },
  { cfg: "allocLuck", label: "LUCK"  },
];

/** アクセサリーの実効最大レベル（9999 以上は上限なし扱いで 1000 に制限） */
function effectiveAccMax(maxLevel: number): number {
  return Math.min(maxLevel, 1000);
}

/** アクセサリー選択時のデフォルトレベル（最大レベルをそのままセット） */
function defaultAccLevel(maxLevel: number): number {
  return maxLevel;
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";
const maxBtnCls = "shrink-0 text-xs px-2 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
const allMaxBtnCls = "text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors border border-blue-100";

function SectionHeader({ title, onAllMax }: { title: string; onAllMax?: () => void }) {
  const { t } = useTranslation("status");
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h3>
      {onAllMax && (
        <button onClick={onAllMax} className={allMaxBtnCls}>{t("common:allMax")}</button>
      )}
    </div>
  );
}

function NumInput({
  value, onChange, min = 0, max, label, error, disabled,
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; label?: string; error?: boolean; disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value.toLocaleString());
  const focused = useRef(false);

  // 外部からvalueが変わったとき（リセット等）はフォーカス中でなければ同期
  useEffect(() => {
    if (!focused.current) {
      setLocalValue(value.toLocaleString());
    }
  }, [value]);

  const commit = (str: string) => {
    const raw = str.replace(/[^0-9]/g, "");
    const v = raw === "" ? min : Number(raw);
    const clamped = max !== undefined ? Math.max(min, Math.min(max, v)) : Math.max(min, v);
    onChange(clamped);
    setLocalValue(clamped.toLocaleString());
  };

  return (
    <div className="flex gap-1 items-end">
      <label className="space-y-1 flex-1 min-w-0">
        {label && (
          <span className={`text-xs ${error ? "text-red-500 font-semibold" : "text-gray-500"}`}>{label}</span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={localValue}
          disabled={disabled}
          onFocus={() => {
            focused.current = true;
            setLocalValue(String(value)); // カンマなしの生数値で編集しやすく
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "");
            setLocalValue(raw); // 空文字も許容して入力をブロックしない
            if (raw !== "") {
              const v = Number(raw);
              onChange(max !== undefined ? Math.max(min, Math.min(max, v)) : Math.max(min, v));
            }
          }}
          onBlur={() => {
            focused.current = false;
            commit(localValue); // ブラー時にクランプ＆カンマ整形
          }}
          className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-300 ${error ? "border-red-300 focus:ring-red-300" : "border-gray-200 focus:ring-blue-300"}`}
        />
      </label>
      {max !== undefined && !disabled && (
        <button onClick={() => onChange(max)} className={maxBtnCls}>MAX</button>
      )}
    </div>
  );
}

// ── SmallNumInput（インライン数値入力・空文字許容） ────────────────────────────

function SmallNumInput({
  value, onChange, min = 0, max, disabled, className,
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; disabled?: boolean; className: string;
}) {
  const [localValue, setLocalValue] = useState(value.toLocaleString());
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocalValue(value.toLocaleString());
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localValue}
      disabled={disabled}
      onFocus={() => { focused.current = true; setLocalValue(String(value)); }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setLocalValue(raw);
        if (raw !== "") {
          const v = Number(raw);
          onChange(max !== undefined ? Math.max(min, Math.min(max, v)) : Math.max(min, v));
        }
      }}
      onBlur={() => {
        focused.current = false;
        const raw = localValue.replace(/[^0-9]/g, "");
        const v = raw === "" ? min : Number(raw);
        const clamped = max !== undefined ? Math.max(min, Math.min(max, v)) : Math.max(min, v);
        onChange(clamped);
        setLocalValue(clamped.toLocaleString());
      }}
      className={className}
    />
  );
}

// ── Equip Selector Modal ──────────────────────────────────────────────────────

function EquipSelectorModal({
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

function EquipSelector({
  slot, slotLabel, selectedName, enhVal, onEquipChange, onEnhChange,
}: {
  slot: EquipmentSlot;
  slotLabel: string;
  selectedName: string;
  enhVal: number;
  onEquipChange: (name: string) => void;
  onEnhChange: (v: number) => void;
}) {
  const { t, i18n } = useTranslation("status");
  const isEn = i18n.language === "en";
  const [modalOpen, setModalOpen] = useState(false);
  const item = selectedName ? getEquipmentByName(selectedName) : undefined;
  const canEnhance = item ? item.material !== "強化できない" : false;
  const isNone = !selectedName || selectedName === "なし";

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-gray-500 font-medium">{slotLabel}</span>
      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex-1 text-left border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white hover:bg-gray-50 transition-colors min-w-0"
        >
          {!isNone
            ? <span className="text-gray-700 truncate block">{isEn ? (item?.nameEn ?? selectedName) : selectedName}</span>
            : <span className="text-gray-400">{t("common:noneTapToSelect")}</span>
          }
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-gray-400">+</span>
          <SmallNumInput
            value={enhVal} onChange={onEnhChange} min={0} max={1100}
            disabled={!canEnhance}
            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-300"
          />
          <button onClick={() => onEnhChange(1100)} disabled={!canEnhance} className={maxBtnCls}>MAX</button>
        </div>
      </div>
      {modalOpen && (
        <EquipSelectorModal
          slotLabel={slotLabel}
          slot={slot}
          selectedName={selectedName}
          onEquipChange={onEquipChange}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

// ── Acc Selector Modal ────────────────────────────────────────────────────────

function AccSelectorModal({
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

function AccSelector({
  slotLabel, accName, accLevel, effMax,
  onAccChange, onLevelChange,
}: {
  slotLabel: string;
  accName: string;
  accLevel: number;
  effMax: number;
  onAccChange: (name: string) => void;
  onLevelChange: (lv: number) => void;
}) {
  const { t, i18n } = useTranslation("status");
  const isEn = i18n.language === "en";
  const accItem = accName ? getAccessoryByName(accName) : undefined;
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-gray-500 font-medium">{slotLabel}</span>
      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex-1 text-left border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white hover:bg-gray-50 transition-colors min-w-0"
        >
          {accName
            ? <span className="text-gray-700 truncate block">{isEn ? (accItem?.nameEn ?? accName) : accName}</span>
            : <span className="text-gray-400">{t("common:noneTapToSelect")}</span>
          }
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-gray-400">Lv</span>
          <SmallNumInput
            value={accLevel} onChange={onLevelChange} min={1} max={effMax}
            disabled={!accName}
            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-300"
          />
          <button
            onClick={() => onLevelChange(effMax)}
            disabled={!accName}
            className={maxBtnCls}
          >MAX</button>
        </div>
      </div>
      {modalOpen && (
        <AccSelectorModal
          slotLabel={slotLabel}
          accName={accName}
          onAccChange={(name) => {
            onAccChange(name);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

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

function PetSelectorModal({
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

// ── Pet Selector ──────────────────────────────────────────────────────────────

function PetSelector({
  slotLabel, petName, petLevel, onPetChange, onLevelChange,
}: {
  slotLabel: string;
  petName: string;
  petLevel: number;
  onPetChange: (name: string) => void;
  onLevelChange: (level: number) => void;
}) {
  const { t, i18n } = useTranslation("status");
  const isEn = i18n.language === "en";
  const [modalOpen, setModalOpen] = useState(false);
  const petDisplayName = petName ? (isEn ? (getPetNameEn(petName) ?? petName) : petName) : "";

  return (
    <div className="space-y-1">
      <span className="text-xs text-gray-500 font-medium">{slotLabel}</span>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full text-left border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white hover:bg-gray-50 transition-colors"
      >
        {petName
          ? <span className="text-gray-700">{petDisplayName}（{petLevel === 0 ? "Lv—" : `Lv${petLevel}`}）</span>
          : <span className="text-gray-400">{t("common:noneTapToSelect")}</span>
        }
      </button>
      {modalOpen && (
        <PetSelectorModal
          slotLabel={slotLabel}
          petName={petName}
          petLevel={petLevel}
          onPetChange={onPetChange}
          onLevelChange={onLevelChange}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

// ── Input Panel ───────────────────────────────────────────────────────────────

type PanelTab = "basic" | "equip" | "acc" | "pet" | "other";

function InputPanel({ cfg, setField, reset }: { cfg: SimConfig; setField: SimSetField; reset: () => void }) {
  const { t } = useTranslation("status");
  const [activeTab, setActiveTab] = useState<PanelTab>("basic");

  const panelTabs: { id: PanelTab; label: string }[] = [
    { id: "basic",  label: t("panelTabs.basic") },
    { id: "equip",  label: t("panelTabs.equip") },
    { id: "acc",    label: t("panelTabs.acc") },
    { id: "pet",    label: t("panelTabs.pet") },
    { id: "other",  label: t("panelTabs.other") },
  ];

  const equipmentSlotLabels: Record<EquipmentSlot, string> = {
    "武器": t("game:equipSlot.武器"),
    "頭":   t("game:equipSlot.頭"),
    "服":   t("game:equipSlot.服"),
    "手":   t("game:equipSlot.手"),
    "盾":   t("game:equipSlot.盾"),
    "脚":   t("game:equipSlot.脚"),
  };

  const accSlotLabels = [
    t("game:accSlot.1"),
    t("game:accSlot.2"),
    t("game:accSlot.3"),
    t("game:accSlot.4"),
  ];

  const petSlotLabels = [
    t("game:petSlot.1"),
    t("game:petSlot.2"),
    t("game:petSlot.3"),
  ];

  const available = getAvailablePoints(cfg);
  const perStatLimit = getPerStatLimit(cfg);
  const used = calcAllocatedPoints(cfg);
  const remaining = available - used;
  const overflowed = remaining < 0;

  const cappedStats = ALLOC_KEYS
    .map(({ cfg: k, label }) => ({ label, value: cfg[k] as number }))
    .filter((s) => s.value > perStatLimit);

  // ── 全MAX handlers ──────────────────────────────────────────────────────

  function maxAllPoints() {
    setField("johaneCount", 1000);
  }

  function maxAllEquip() {
    for (const { enhKey } of EQUIPMENT_SLOTS) {
      setField(enhKey, 1100);
    }
  }

  function maxAllAcc() {
    for (const { nameKey, levelKey } of ACC_SLOTS) {
      const name = cfg[nameKey] as string;
      if (!name) continue;
      const acc = getAccessoryByName(name);
      if (!acc) continue;
      setField(levelKey, effectiveAccMax(acc.maxLevel));
    }
  }

  function maxAllPet() {
    setField("petLevel",  getPetMaxLevel(cfg.petName) as SimConfig["petLevel"]);
    setField("pet2Level", getPetMaxLevel(cfg.pet2Name) as SimConfig["pet2Level"]);
    setField("pet3Level", getPetMaxLevel(cfg.pet3Name) as SimConfig["pet3Level"]);
  }

  function maxAllProtein() {
    for (const { cfg: k } of PROTEIN_KEYS) setField(k, 1000);
    setField("pShakerCount", 1000);
  }

  function maxAllHp() {
    setField("kinikiLiquidCount", 1000);
  }

  return (
    <div className="space-y-3">
      {/* ── タブ ── */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white">
        {panelTabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              activeTab === id
                ? "bg-blue-500 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 基本タブ ── */}
      {activeTab === "basic" && (
        <div className="space-y-3">
          {/* キャラクター設定 */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t("characterSettings")}</h3>
            <div className="grid grid-cols-3 gap-2">
              <NumInput label={t("level")} value={cfg.charLevel} min={1} max={200}
                onChange={(v) => {
                  setField("charLevel", v);
                  if (cfg.reinCount < 10) {
                    setField("tenseisCount", Math.min(10, Math.max(0, Math.ceil((v - 100) / 10))));
                  }
                }} />
              {cfg.reinCount >= 10 ? (
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">{t("reincarnation")}</span>
                  <div className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-1.5 bg-gray-50">{t("reincarnationUltimate")}</div>
                </label>
              ) : (
                <NumInput label={t("reincarnation")} value={cfg.tenseisCount} min={0} max={10}
                  onChange={(v) => setField("tenseisCount", v)} />
              )}
              <div className="space-y-1">
                <NumInput label={t("tenmeiRinne")} value={cfg.reinCount} min={0}
                  onChange={(v) => setField("reinCount", v)} />
                {cfg.reinCount >= 1 && (
                  <span className="block text-xs text-blue-500">
                    {t("cosmoCubeBonus", { points: (990000).toLocaleString() })}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-gray-500">{t("element")}</span>
                <select
                  value={cfg.charElement}
                  onChange={(e) => setField("charElement", e.target.value as Element)}
                  className={inputCls}
                >
                  {ELEMENTS.map((el) => (
                    <option key={el} value={el}>{t(`game:element.${el}`)}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* ステータス割り振り */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t("allocationPoints")}</h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${overflowed ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                  {t("remainingPoints", { value: remaining.toLocaleString() })}
                </span>
                <button
                  onClick={() => ALLOC_KEYS.forEach(({ cfg: k }) => setField(k, 0))}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  {t("common:reset")}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
              {ALLOC_KEYS.map(({ cfg: cfgKey, label }) => {
                const val = cfg[cfgKey] as number;
                const over = val > perStatLimit;
                const canAdd = remaining > 0 && val < perStatLimit;
                return (
                  <div key={cfgKey} className="space-y-0.5">
                    <span className={`text-xs ${over ? "text-red-500 font-semibold" : "text-gray-500"}`}>{label}</span>
                    <div className="flex gap-1 items-center">
                      <SmallNumInput
                        value={val} onChange={(v) => setField(cfgKey, v)} min={0}
                        className={`flex-1 min-w-0 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 ${over ? "border-red-300 focus:ring-red-300" : "border-gray-200 focus:ring-blue-300"}`}
                      />
                      <button
                        disabled={!canAdd}
                        onClick={() => setField(cfgKey, Math.min(val + remaining, perStatLimit))}
                        title={t("dumpRemainingTitle", { value: remaining.toLocaleString() })}
                        className="shrink-0 text-xs px-1 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                      >{t("dumpRemaining")}</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {cappedStats.length > 0 && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-1.5">
                {t("overCap", { stats: cappedStats.map((s) => s.label).join("、"), limit: perStatLimit.toLocaleString() })}
              </p>
            )}
          </section>

          {/* 振り分けポイント */}
          <section className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
            <SectionHeader title={t("allocationSection")} onAllMax={maxAllPoints} />
            <div className="grid grid-cols-2 gap-2">
              <NumInput label={t("johannePen")} value={cfg.johaneCount} max={1000}
                onChange={(v) => setField("johaneCount", v)} />
              <NumInput label={t("johanneAltar")} value={cfg.johanneAltarCount} max={1000}
                onChange={(v) => setField("johanneAltarCount", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded-lg px-3 py-1.5">
              <div>{t("availablePoints")}<br /><span className="font-mono font-semibold text-gray-700">{available.toLocaleString()}</span></div>
              <div>{t("perStatLimit")}<br /><span className="font-mono font-semibold text-gray-700">{perStatLimit.toLocaleString()}</span></div>
            </div>
          </section>
        </div>
      )}

      {/* ── 装備タブ ── */}
      {activeTab === "equip" && (
        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <SectionHeader title={t("equipment")} onAllMax={maxAllEquip} />
            <div className="space-y-3">
              {EQUIPMENT_SLOTS.map(({ slot, cfgKey, enhKey }) => (
                <EquipSelector
                  key={slot}
                  slot={slot}
                  slotLabel={equipmentSlotLabels[slot]}
                  selectedName={cfg[cfgKey] as string}
                  enhVal={cfg[enhKey] as number}
                  onEquipChange={(name) => setField(cfgKey, name)}
                  onEnhChange={(v) => setField(enhKey, v)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── アクセタブ ── */}
      {activeTab === "acc" && (
        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <SectionHeader title={t("accessory")} onAllMax={maxAllAcc} />
            <div className="space-y-3">
              {ACC_SLOTS.map(({ nameKey, levelKey }, idx) => {
                const accName = cfg[nameKey] as string;
                const acc = accName ? getAccessoryByName(accName) : undefined;
                const effMax = acc ? effectiveAccMax(acc.maxLevel) : 1;
                const lv = Math.min(cfg[levelKey] as number, effMax);
                return (
                  <AccSelector
                    key={String(nameKey)}
                    slotLabel={accSlotLabels[idx]}
                    accName={accName}
                    accLevel={lv}
                    effMax={effMax}
                    onAccChange={(name) => {
                      setField(nameKey, name);
                      if (name) {
                        const a = getAccessoryByName(name);
                        if (a) setField(levelKey, defaultAccLevel(a.maxLevel));
                      }
                    }}
                    onLevelChange={(lv) => setField(levelKey, lv)}
                  />
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ── ペットタブ ── */}
      {activeTab === "pet" && (
        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <SectionHeader title={t("pet")} onAllMax={maxAllPet} />
            {PET_SLOTS.map(({ nameKey, levelKey }, idx) => (
              <PetSelector
                key={String(nameKey)}
                slotLabel={petSlotLabels[idx]}
                petName={cfg[nameKey] as string}
                petLevel={cfg[levelKey] as number}
                onPetChange={(name) => setField(nameKey, name)}
                onLevelChange={(lv) => setField(levelKey, lv as SimConfig["petLevel"])}
              />
            ))}
          </section>
        </div>
      )}

      {/* ── その他タブ ── */}
      {activeTab === "other" && (
        <div className="space-y-4">
          {/* プロテイン */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <SectionHeader title={t("protein")} onAllMax={maxAllProtein} />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {PROTEIN_KEYS.map(({ cfg: cfgKey, label }) => (
                <NumInput key={cfgKey} label={label} value={cfg[cfgKey] as number} max={1000}
                  onChange={(v) => setField(cfgKey, v)} />
              ))}
              <NumInput label={t("pShaker")} value={cfg.pShakerCount} max={1000}
                onChange={(v) => setField("pShakerCount", v)} />
            </div>
            {cfg.pShakerCount > 0 && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5">
                {t("proteinEffect", { value: (1 + cfg.pShakerCount / 100).toFixed(2) })}
              </p>
            )}
          </section>

          {/* HP補正 */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <SectionHeader title={t("hpCorrection")} onAllMax={maxAllHp} />
            <NumInput label={t("kinikiLiquid")} value={cfg.kinikiLiquidCount} max={1000}
              onChange={(v) => setField("kinikiLiquidCount", v)} />
            {cfg.kinikiLiquidCount > 0 && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
                {t("hpEffect", { value: (1 + cfg.kinikiLiquidCount / 100).toFixed(2) })}
              </p>
            )}
          </section>

          <button
            onClick={reset}
            className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
          >
            {t("common:reset")}
          </button>
        </div>
      )}
    </div>
  );
}

// ── SimConfigPanel (exported) ─────────────────────────────────────────────────

export interface SimConfigPanelProps {
  cfg: SimConfig;
  setField: SimSetField;
  reset: () => void;
  replaceAll: (cfg: SimConfig) => void;
  extraFields?: SimPresetExtra;
  onLoadExtraFields?: (extra: SimPresetExtra) => void;
}

export function SimConfigPanel({ cfg, setField, reset, replaceAll, extraFields, onLoadExtraFields }: SimConfigPanelProps) {
  const { t } = useTranslation("status");
  const { presets: simPresets, savePreset, loadPreset, deletePreset } = useSimPresets();
  const [simPresetName, setSimPresetName] = useState("");
  const [selectedSimPresetId, setSelectedSimPresetId] = useState("");

  const [overwriteSaved, setOverwriteSaved] = useState(false);

  function handleSaveSimPreset() {
    const trimmed = simPresetName.trim();
    if (!trimmed) return;
    const existing = simPresets.find((p) => p.name === trimmed);
    if (existing && !window.confirm(t("overwriteBuildPresetConfirm", { name: trimmed }))) return;
    savePreset(trimmed, cfg, extraFields);
    setSimPresetName("");
  }

  function handleLoadSimPreset() {
    const preset = loadPreset(selectedSimPresetId);
    if (!preset) return;
    replaceAll(preset.config);
    if (preset.extra && onLoadExtraFields) onLoadExtraFields(preset.extra);
    setOverwriteSaved(false);
  }

  function handleOverwriteSimPreset() {
    const preset = simPresets.find((p) => p.id === selectedSimPresetId);
    if (!preset) return;
    savePreset(preset.name, cfg, extraFields);
    setOverwriteSaved(true);
    setTimeout(() => setOverwriteSaved(false), 1500);
  }

  function handleDeleteSimPreset() {
    deletePreset(selectedSimPresetId);
    setSelectedSimPresetId("");
    setOverwriteSaved(false);
  }

  return (
    <div className="space-y-3">
      {/* ── ビルドプリセット ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t("buildPreset")}</h3>
        <div className="flex gap-1.5 items-center">
          <select
            value={selectedSimPresetId}
            onChange={(e) => { setSelectedSimPresetId(e.target.value); setOverwriteSaved(false); }}
            className={`${inputCls} flex-1 min-w-0`}
          >
            <option value="">{t("selectBuildPreset")}</option>
            {simPresets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={handleLoadSimPreset}
            disabled={!selectedSimPresetId}
            className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-100 text-indigo-600 font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-200 transition-colors"
          >{t("common:load")}</button>
          <button
            onClick={handleDeleteSimPreset}
            disabled={!selectedSimPresetId}
            className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-200 transition-colors"
          >{t("common:delete")}</button>
        </div>
        {selectedSimPresetId && (
          <button
            onClick={handleOverwriteSimPreset}
            className={`w-full text-xs py-1.5 rounded-lg font-medium transition-colors ${
              overwriteSaved
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            {overwriteSaved
              ? `✓ ${t("common:saved")}`
              : `${t("overwriteSave")} — ${simPresets.find((p) => p.id === selectedSimPresetId)?.name}`
            }
          </button>
        )}
        <div className="flex gap-1.5 items-center">
          <input
            type="text"
            placeholder={t("common:presetName")}
            value={simPresetName}
            onChange={(e) => setSimPresetName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveSimPreset()}
            className={`${inputCls} flex-1`}
          />
          <button
            onClick={handleSaveSimPreset}
            disabled={!simPresetName.trim()}
            className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-green-500 text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
          >{t("common:save")}</button>
        </div>
      </div>
      {/* ── 5タブ設定パネル ── */}
      <InputPanel cfg={cfg} setField={setField} reset={reset} />
    </div>
  );
}
