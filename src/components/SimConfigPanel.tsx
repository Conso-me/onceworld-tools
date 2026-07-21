import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSimPresets, type SimPresetExtra } from "../hooks/useSimPresets";
import { calcAllocatedPoints, getAvailablePoints, getPerStatLimit } from "../utils/statusCalc";
import {
  getEquipmentByName,
  getAccessoryByName,
  getPetMaxLevel, getPetNameEn,
} from "../data";
import type { SimConfig, CoreStats, EquipmentSlot, Element } from "../types/game";
import { effectiveAccMax, defaultAccLevel } from "./simconfig/grouping";
import { SmallNumInput } from "./simconfig/SmallNumInput";
import { EquipSelectorModal } from "./simconfig/EquipSelectorModal";
import { AccSelectorModal } from "./simconfig/AccSelectorModal";
import { PetSelectorModal } from "./simconfig/PetSelectorModal";

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
  cfgKey: keyof SimConfig; enhKey: keyof SimConfig; goldEnhKey: keyof SimConfig;
}[] = [
  { slot: "武器", cfgKey: "equipWeapon",  enhKey: "enhWeapon",  goldEnhKey: "goldEnhWeapon"  },
  { slot: "頭",   cfgKey: "equipHead",    enhKey: "enhHead",    goldEnhKey: "goldEnhHead"    },
  { slot: "服",   cfgKey: "equipBody",    enhKey: "enhBody",    goldEnhKey: "goldEnhBody"    },
  { slot: "手",   cfgKey: "equipHand",    enhKey: "enhHand",    goldEnhKey: "goldEnhHand"    },
  { slot: "盾",   cfgKey: "equipShield",  enhKey: "enhShield",  goldEnhKey: "goldEnhShield"  },
  { slot: "脚",   cfgKey: "equipFoot",    enhKey: "enhFoot",    goldEnhKey: "goldEnhFoot"    },
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

// ── Equip Selector ────────────────────────────────────────────────────────────

function EquipSelector({
  slot, slotLabel, selectedName, enhVal, goldEnhVal, onEquipChange, onEnhChange, onGoldEnhChange,
}: {
  slot: EquipmentSlot;
  slotLabel: string;
  selectedName: string;
  enhVal: number;
  goldEnhVal: number;
  onEquipChange: (name: string) => void;
  onEnhChange: (v: number) => void;
  onGoldEnhChange: (v: number) => void;
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
      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 sm:items-center">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full sm:flex-1 text-left border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white hover:bg-gray-50 transition-colors min-w-0"
        >
          {!isNone
            ? <span className="text-gray-700 truncate block">{isEn ? (item?.nameEn ?? selectedName) : selectedName}</span>
            : <span className="text-gray-400">{t("common:noneTapToSelect")}</span>
          }
        </button>
        <div className="flex items-center gap-1 sm:shrink-0">
          <span className="text-xs text-gray-400">+</span>
          <SmallNumInput
            value={enhVal} onChange={onEnhChange} min={0} max={1100}
            disabled={!canEnhance}
            className="flex-1 sm:w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-300"
          />
          <button onClick={() => onEnhChange(1100)} disabled={!canEnhance} className={maxBtnCls}>MAX</button>
        </div>
        {canEnhance && (
          <div className="flex items-center gap-1 sm:shrink-0">
            <span className="text-xs text-yellow-500 font-semibold">G+</span>
            <SmallNumInput
              value={goldEnhVal} onChange={onGoldEnhChange} min={0} max={300}
              className="flex-1 sm:w-14 border border-yellow-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
            <button onClick={() => onGoldEnhChange(300)} className={maxBtnCls}>MAX</button>
          </div>
        )}
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
      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 sm:items-center">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full sm:flex-1 text-left border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white hover:bg-gray-50 transition-colors min-w-0"
        >
          {accName
            ? <span className="text-gray-700 truncate block">{isEn ? (accItem?.nameEn ?? accName) : accName}</span>
            : <span className="text-gray-400">{t("common:noneTapToSelect")}</span>
          }
        </button>
        <div className="flex items-center gap-1 sm:shrink-0">
          <span className="text-xs text-gray-400">Lv</span>
          <SmallNumInput
            value={accLevel} onChange={onLevelChange} min={1} max={effMax}
            disabled={!accName}
            className="flex-1 sm:w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-300"
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
    setField("johanneAltarCount", 1000);
    setField("statusTenshouCount", 1000);
    setField("superScrollCount", 1000);
  }

  function maxAllEquip() {
    for (const { enhKey, goldEnhKey } of EQUIPMENT_SLOTS) {
      setField(enhKey, 1100);
      setField(goldEnhKey, 1000);
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
          <section className="bg-card border border-line rounded-card shadow-sm p-3 space-y-2">
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
              <NumInput label={t("tenmeiRinne")} value={cfg.reinCount} min={0}
                onChange={(v) => setField("reinCount", v)} />
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
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-5">
                <input
                  type="checkbox" checked={cfg.hasCosmoCube}
                  onChange={(e) => setField("hasCosmoCube", e.target.checked)}
                  className="accent-blue-500 w-4 h-4"
                />
                <span className="text-xs">{t("cosmoCube")}
                  {cfg.hasCosmoCube && cfg.reinCount > 0 && (
                    <span className="text-blue-500 ml-1">
                      {t("cosmoCubeBonus", { points: (cfg.reinCount * 10000).toLocaleString() })}
                    </span>
                  )}
                </span>
              </label>
            </div>
          </section>

          {/* ステータス割り振り */}
          <section className="bg-card border border-line rounded-card shadow-sm p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t("allocationPoints")}</h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full whitespace-nowrap ${overflowed ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-1 gap-y-1.5">
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
                        className={`flex-1 min-w-0 border rounded-lg px-0 py-1 text-[11px] focus:outline-none focus:ring-2 ${over ? "border-red-300 focus:ring-red-300" : "border-gray-200 focus:ring-blue-300"}`}
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
          <section className="bg-card border border-line rounded-card shadow-sm p-3 space-y-2">
            <SectionHeader title={t("allocationSection")} onAllMax={maxAllPoints} />
            <div className="grid grid-cols-2 gap-2">
              <NumInput label={t("johannePen")} value={cfg.johaneCount} max={1000}
                onChange={(v) => setField("johaneCount", v)} />
              <NumInput label={t("johanneAltar")} value={cfg.johanneAltarCount} max={1000}
                onChange={(v) => setField("johanneAltarCount", v)} />
              <NumInput label={t("statusTenshou")} value={cfg.statusTenshouCount} max={1000}
                onChange={(v) => setField("statusTenshouCount", v)} />
              <NumInput label={t("superScroll")} value={cfg.superScrollCount} max={1000}
                onChange={(v) => setField("superScrollCount", v)} />
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
          <section className="bg-card border border-line rounded-card shadow-sm p-4 space-y-3">
            <SectionHeader title={t("equipment")} onAllMax={maxAllEquip} />
            <div className="space-y-3">
              {EQUIPMENT_SLOTS.map(({ slot, cfgKey, enhKey, goldEnhKey }) => (
                <EquipSelector
                  key={slot}
                  slot={slot}
                  slotLabel={equipmentSlotLabels[slot]}
                  selectedName={cfg[cfgKey] as string}
                  enhVal={cfg[enhKey] as number}
                  goldEnhVal={cfg[goldEnhKey] as number}
                  onEquipChange={(name) => setField(cfgKey, name)}
                  onEnhChange={(v) => setField(enhKey, v)}
                  onGoldEnhChange={(v) => setField(goldEnhKey, v)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── アクセタブ ── */}
      {activeTab === "acc" && (
        <div className="space-y-4">
          <section className="bg-card border border-line rounded-card shadow-sm p-4 space-y-3">
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
          <section className="bg-card border border-line rounded-card shadow-sm p-4 space-y-4">
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
          <section className="bg-card border border-line rounded-card shadow-sm p-4 space-y-3">
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
          <section className="bg-card border border-line rounded-card shadow-sm p-4 space-y-3">
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
      <div className="bg-card border border-line rounded-card shadow-sm p-3 space-y-2">
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
