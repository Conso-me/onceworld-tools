import { useMemo, useState } from "react";
import { usePersistedState, usePersistedGroup } from "../hooks/usePersistedState";
import { useStatPresets } from "../hooks/useStatPresets";
import { calcStatus, calcAllocatedPoints, getAvailablePoints, getPerStatLimit } from "../utils/statusCalc";
import {
  getEquipmentBySlot, getEquipmentByName,
  getAllAccessoryNames, getAccessoryByName,
  getPetsByPrimaryStat, getPetMaxSkillSummary,
} from "../data";
import type { PetStatCategory } from "../data";
import type { SimConfig, CoreStats, EquipmentSlot, Element } from "../types/game";

// ── Constants ─────────────────────────────────────────────────────────────────

const STAT_LABELS: { key: keyof CoreStats; label: string }[] = [
  { key: "vit",  label: "VIT" },
  { key: "spd",  label: "SPD" },
  { key: "atk",  label: "ATK" },
  { key: "int",  label: "INT" },
  { key: "def",  label: "DEF" },
  { key: "mdef", label: "M-DEF" },
  { key: "luck", label: "LUCK" },
];

const EQUIPMENT_SLOTS: {
  slot: EquipmentSlot; label: string;
  cfgKey: keyof SimConfig; enhKey: keyof SimConfig;
}[] = [
  { slot: "武器", label: "武器",  cfgKey: "equipWeapon",  enhKey: "enhWeapon"  },
  { slot: "頭",   label: "頭",    cfgKey: "equipHead",    enhKey: "enhHead"    },
  { slot: "服",   label: "服",    cfgKey: "equipBody",    enhKey: "enhBody"    },
  { slot: "手",   label: "手",    cfgKey: "equipHand",    enhKey: "enhHand"    },
  { slot: "盾",   label: "盾",    cfgKey: "equipShield",  enhKey: "enhShield"  },
  { slot: "脚",   label: "脚",    cfgKey: "equipFoot",    enhKey: "enhFoot"    },
];

const ACC_SLOTS: {
  nameKey: keyof SimConfig; levelKey: keyof SimConfig; label: string;
}[] = [
  { nameKey: "acc1", levelKey: "acc1Level", label: "スロット1" },
  { nameKey: "acc2", levelKey: "acc2Level", label: "スロット2" },
  { nameKey: "acc3", levelKey: "acc3Level", label: "スロット3" },
  { nameKey: "acc4", levelKey: "acc4Level", label: "スロット4" },
];

const PET_SLOTS: {
  nameKey: keyof SimConfig; levelKey: keyof SimConfig; label: string;
}[] = [
  { nameKey: "petName",  levelKey: "petLevel",  label: "ペット1" },
  { nameKey: "pet2Name", levelKey: "pet2Level", label: "ペット2" },
  { nameKey: "pet3Name", levelKey: "pet3Level", label: "ペット3" },
];

const PET_LEVELS = [0, 31, 71, 121, 181] as const;

const ELEMENTS: Element[] = ["火", "水", "木", "光", "闇"];

const PET_STAT_CATEGORY_ORDER: PetStatCategory[] = [
  "体力", "攻撃力", "魔力", "防御力", "魔法防御力", "幸運", "攻撃速度",
  "経験値", "捕獲率", "ドロップ率", "その他",
];

// Computed once — pet data is static
const petStatGroups = getPetsByPrimaryStat();

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

/** アクセサリー選択時のデフォルトレベル（上限不明=9999は100、それ以外は上限値） */
function defaultAccLevel(maxLevel: number): number {
  return maxLevel >= 9999 ? 100 : Math.min(maxLevel, 1000);
}

const DEFAULT_CONFIG: SimConfig = {
  charLevel: 100,
  reinCount: 0,
  charElement: "火",
  hasCosmoCube: false,
  johaneCount: 0,
  kinikiBookCount: 1000,
  sageItemCount: 1000,
  hasChoyoContract: true,
  allocVit: 0, allocSpd: 0, allocAtk: 0, allocInt: 0,
  allocDef: 0, allocMdef: 0, allocLuck: 0,
  equipWeapon: "", enhWeapon: 1100,
  equipHead:   "", enhHead:   1100,
  equipBody:   "", enhBody:   1100,
  equipHand:   "", enhHand:   1100,
  equipShield: "", enhShield: 1100,
  equipFoot:   "", enhFoot:   1100,
  acc1: "", acc1Level: 1,
  acc2: "", acc2Level: 1,
  acc3: "", acc3Level: 1,
  acc4: "", acc4Level: 1,
  petName:  "", petLevel:  181,
  pet2Name: "", pet2Level: 181,
  pet3Name: "", pet3Level: 181,
  proteinVit: 1000, proteinSpd: 1000, proteinAtk: 1000, proteinInt: 1000,
  proteinDef: 1000, proteinMdef: 1000, proteinLuck: 1000,
  pShakerCount: 1000,
  kinikiLiquidCount: 1000,
};

// ── UI Helpers ────────────────────────────────────────────────────────────────

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";
const maxBtnCls = "shrink-0 text-xs px-2 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
const allMaxBtnCls = "text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors border border-blue-100";

function SectionHeader({ title, onAllMax }: { title: string; onAllMax?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h3>
      {onAllMax && (
        <button onClick={onAllMax} className={allMaxBtnCls}>全MAX</button>
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
  return (
    <div className="flex gap-1 items-end">
      <label className="space-y-1 flex-1 min-w-0">
        {label && (
          <span className={`text-xs ${error ? "text-red-500 font-semibold" : "text-gray-500"}`}>{label}</span>
        )}
        <input
          type="number" min={min} max={max} value={value} disabled={disabled}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(max !== undefined ? Math.max(min, Math.min(max, v)) : Math.max(min, v));
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
  const [openCategory, setOpenCategory] = useState<PetStatCategory | null>(null);

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-gray-500 font-medium">{slotLabel}</span>
      <div className="text-xs bg-gray-50 rounded-lg px-3 py-1.5 text-gray-600 min-h-[28px]">
        {petName
          ? `選択中: ${petName} (${petLevel === 0 ? "Lv—" : `Lv${petLevel}`})`
          : "なし"}
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden text-sm max-h-64 overflow-y-auto">
        {/* なし */}
        <button
          type="button"
          onClick={() => { onPetChange(""); onLevelChange(0); }}
          className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 transition-colors text-xs ${
            !petName ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600"
          }`}
        >
          なし
        </button>

        {/* カテゴリアコーディオン */}
        {PET_STAT_CATEGORY_ORDER.map((cat) => {
          const petsInCat = petStatGroups.get(cat);
          if (!petsInCat?.length) return null;
          const isOpen = openCategory === cat;
          return (
            <div key={cat} className="border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : cat)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-xs">[{cat}]</span>
                <span className="text-xs text-gray-400">
                  {isOpen ? "▲" : "▼"} {petsInCat.length}体
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100">
                  {petsInCat.map((pet) => (
                    <div key={pet.name} className="border-b border-gray-100 last:border-0">
                      <button
                        type="button"
                        onClick={() => {
                          onPetChange(pet.name);
                          if (petName !== pet.name) onLevelChange(181);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-1.5 text-xs hover:bg-blue-50/50 transition-colors ${
                          petName === pet.name
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-600"
                        }`}
                      >
                        <span>{pet.name}</span>
                        <span className="text-gray-400 ml-2 shrink-0">{getPetMaxSkillSummary(pet)}</span>
                      </button>
                      {petName === pet.name && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-1.5 bg-blue-50/30">
                          {PET_LEVELS.map((lv) => (
                            <label key={lv} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input
                                type="radio"
                                checked={petLevel === lv}
                                onChange={() => onLevelChange(lv)}
                                className="accent-blue-500"
                              />
                              {lv === 0 ? "なし" : `Lv${lv}`}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Input Panel ───────────────────────────────────────────────────────────────

type SetField = <K extends keyof SimConfig>(field: K, value: SimConfig[K]) => void;
type PanelTab = "basic" | "equip" | "acc" | "pet" | "other";

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "basic",  label: "基本" },
  { id: "equip",  label: "装備" },
  { id: "acc",    label: "アクセ" },
  { id: "pet",    label: "ペット" },
  { id: "other",  label: "その他" },
];

function InputPanel({ cfg, setField, reset }: { cfg: SimConfig; setField: SetField; reset: () => void }) {
  const [activeTab, setActiveTab] = useState<PanelTab>("basic");

  const available = getAvailablePoints(cfg);
  const perStatLimit = getPerStatLimit(cfg);
  const used = calcAllocatedPoints(cfg);
  const remaining = available - used;
  const overflowed = remaining < 0;

  const accNames = getAllAccessoryNames();

  const cappedStats = ALLOC_KEYS
    .map(({ cfg: k, label }) => ({ label, value: cfg[k] as number }))
    .filter((s) => s.value > perStatLimit);

  // ── 全MAX handlers ──────────────────────────────────────────────────────

  function maxAllPoints() {
    setField("johaneCount", 1000);
    setField("kinikiBookCount", 1000);
    setField("sageItemCount", 1000);
    setField("hasChoyoContract", true);
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
    setField("petLevel",  181);
    setField("pet2Level", 181);
    setField("pet3Level", 181);
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
        {PANEL_TABS.map(({ id, label }) => (
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
        <div className="space-y-4">
          {/* キャラクター設定 */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">キャラクター設定</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="レベル" value={cfg.charLevel} min={1} max={200}
                onChange={(v) => setField("charLevel", v)} />
              <NumInput label="天命輪廻 (回数)" value={cfg.reinCount} min={0}
                onChange={(v) => setField("reinCount", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-gray-500">属性</span>
                <select
                  value={cfg.charElement}
                  onChange={(e) => setField("charElement", e.target.value as Element)}
                  className={inputCls}
                >
                  {ELEMENTS.map((el) => (
                    <option key={el} value={el}>{el}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-5">
                <input
                  type="checkbox" checked={cfg.hasCosmoCube}
                  onChange={(e) => setField("hasCosmoCube", e.target.checked)}
                  className="accent-blue-500 w-4 h-4"
                />
                <span className="text-xs">コスモキューブ
                  {cfg.hasCosmoCube && cfg.reinCount > 0 && (
                    <span className="text-blue-500 ml-1">
                      (+{(cfg.reinCount * 10000).toLocaleString()}pt)
                    </span>
                  )}
                </span>
              </label>
            </div>
          </section>

          {/* 振り分けポイント・上限 */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <SectionHeader title="振り分けポイント・上限" onAllMax={maxAllPoints} />
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">ポイント補正</p>
              <NumInput label="ヨハネの羽ペン (利用可能ポイント×1%/個)" value={cfg.johaneCount} max={1000}
                onChange={(v) => setField("johaneCount", v)} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">上限補正</p>
              <div className="grid grid-cols-2 gap-3">
                <NumInput label="禁域の書物 (+80/個)" value={cfg.kinikiBookCount} max={1000}
                  onChange={(v) => setField("kinikiBookCount", v)} />
                <NumInput label="賢者の落とし物 (+10/個)" value={cfg.sageItemCount} max={1000}
                  onChange={(v) => setField("sageItemCount", v)} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox" checked={cfg.hasChoyoContract}
                  onChange={(e) => setField("hasChoyoContract", e.target.checked)}
                  className="accent-blue-500 w-4 h-4"
                />
                <span>超越の契約書所持 (+900,000)</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
              <div>利用可能ポイント<br /><span className="font-mono font-semibold text-gray-700">{available.toLocaleString()}</span></div>
              <div>1ステータス上限<br /><span className="font-mono font-semibold text-gray-700">{perStatLimit.toLocaleString()}</span></div>
            </div>
          </section>

          {/* ステータス割り振り */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">割り振りポイント</h3>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${overflowed ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                残り {remaining.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {ALLOC_KEYS.map(({ cfg: cfgKey, label }) => {
                const val = cfg[cfgKey] as number;
                const over = val > perStatLimit;
                return (
                  <label key={cfgKey} className="space-y-1">
                    <span className={`text-xs ${over ? "text-red-500 font-semibold" : "text-gray-500"}`}>{label}</span>
                    <input
                      type="number" min={0} value={val}
                      onChange={(e) => setField(cfgKey, Math.max(0, Number(e.target.value)))}
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 ${over ? "border-red-300 focus:ring-red-300" : "border-gray-200 focus:ring-blue-300"}`}
                    />
                  </label>
                );
              })}
            </div>
            {cappedStats.length > 0 && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-1.5">
                上限超過: {cappedStats.map((s) => s.label).join("、")}（上限 {perStatLimit.toLocaleString()}）
              </p>
            )}
          </section>
        </div>
      )}

      {/* ── 装備タブ ── */}
      {activeTab === "equip" && (
        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <SectionHeader title="装備" onAllMax={maxAllEquip} />
            <div className="space-y-3">
              {EQUIPMENT_SLOTS.map(({ slot, label, cfgKey, enhKey }) => {
                const items = getEquipmentBySlot(slot);
                const selectedName = cfg[cfgKey] as string;
                const item = selectedName ? getEquipmentByName(selectedName) : undefined;
                const canEnhance = item ? item.material !== "強化できない" : false;
                const enhVal = cfg[enhKey] as number;
                return (
                  <div key={slot} className="space-y-1.5">
                    <span className="text-xs text-gray-500 font-medium">{label}</span>
                    <div className="flex gap-2 items-center">
                      <select
                        value={selectedName}
                        onChange={(e) => setField(cfgKey, e.target.value)}
                        className={`${inputCls} flex-1`}
                      >
                        <option value="">なし</option>
                        {items.map((it) => (
                          <option key={it.name} value={it.name}>{it.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-gray-400">+</span>
                        <input
                          type="number" min={0} max={1100} value={enhVal}
                          disabled={!canEnhance}
                          onChange={(e) => setField(enhKey, Math.max(0, Math.min(1100, Number(e.target.value))))}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-300"
                        />
                        <button
                          onClick={() => setField(enhKey, 1100)}
                          disabled={!canEnhance}
                          className={maxBtnCls}
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ── アクセタブ ── */}
      {activeTab === "acc" && (
        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <SectionHeader title="アクセサリー" onAllMax={maxAllAcc} />
            <div className="space-y-3">
              {ACC_SLOTS.map(({ nameKey, levelKey, label }) => {
                const accName = cfg[nameKey] as string;
                const acc = accName ? getAccessoryByName(accName) : undefined;
                const effMax = acc ? effectiveAccMax(acc.maxLevel) : 1;
                const lv = Math.min(cfg[levelKey] as number, effMax);
                return (
                  <div key={String(nameKey)} className="space-y-1.5">
                    <span className="text-xs text-gray-500 font-medium">{label}</span>
                    <div className="flex gap-2 items-center">
                      <select
                        value={accName}
                        onChange={(e) => {
                          const name = e.target.value;
                          setField(nameKey, name);
                          if (name) {
                            const a = getAccessoryByName(name);
                            if (a) setField(levelKey, defaultAccLevel(a.maxLevel));
                          }
                        }}
                        className={`${inputCls} flex-1`}
                      >
                        <option value="">なし</option>
                        {accNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-gray-400">Lv</span>
                        <input
                          type="number" min={1} max={effMax} value={lv}
                          disabled={!accName}
                          onChange={(e) => setField(levelKey, Math.max(1, Math.min(effMax, Number(e.target.value))))}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-300"
                        />
                        <button
                          onClick={() => setField(levelKey, effMax)}
                          disabled={!accName}
                          className={maxBtnCls}
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  </div>
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
            <SectionHeader title="ペット" onAllMax={maxAllPet} />
            {PET_SLOTS.map(({ nameKey, levelKey, label }) => (
              <PetSelector
                key={String(nameKey)}
                slotLabel={label}
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
            <SectionHeader title="プロテイン" onAllMax={maxAllProtein} />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {PROTEIN_KEYS.map(({ cfg: cfgKey, label }) => (
                <NumInput key={cfgKey} label={label} value={cfg[cfgKey] as number} max={1000}
                  onChange={(v) => setField(cfgKey, v)} />
              ))}
              <NumInput label="Pシェーカー (+1%/個)" value={cfg.pShakerCount} max={1000}
                onChange={(v) => setField("pShakerCount", v)} />
            </div>
            {cfg.pShakerCount > 0 && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5">
                プロテイン効果 × {(1 + cfg.pShakerCount / 100).toFixed(2)}
              </p>
            )}
          </section>

          {/* HP補正 */}
          <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <SectionHeader title="HP補正" onAllMax={maxAllHp} />
            <NumInput label="禁域の液体 (HP+1%/個)" value={cfg.kinikiLiquidCount} max={1000}
              onChange={(v) => setField("kinikiLiquidCount", v)} />
            {cfg.kinikiLiquidCount > 0 && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
                HP × {(1 + cfg.kinikiLiquidCount / 100).toFixed(2)}
              </p>
            )}
          </section>

          <button
            onClick={reset}
            className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
          >
            リセット
          </button>
        </div>
      )}
    </div>
  );
}

// ── Result Tables ─────────────────────────────────────────────────────────────

function StatTable({ breakdown, label }: { breakdown: ReturnType<typeof calcStatus>; label?: string }) {
  const { final, alloc, equipment, protein, accFlat, petFlat, pctBonus, finalPctBonus, hp, setBonus, setBonusSeries } = breakdown;
  const showProtein = STAT_LABELS.some(({ key }) => protein[key] > 0);

  function fmtPct(v: number): string {
    if (v === 0) return "—";
    return `+${v.toFixed(1)}%`;
  }

  return (
    <div className="overflow-x-auto space-y-2">
      {label && <p className="text-xs font-semibold text-gray-500">{label}</p>}
      {setBonus && (
        <div className="inline-flex items-center gap-1.5 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-3 py-1">
          <span className="font-bold">セット効果 ×1.10</span>
          {setBonusSeries && <span className="text-yellow-500">({setBonusSeries})</span>}
        </div>
      )}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <th className="text-left px-3 py-2 border border-gray-100">ステータス</th>
            <th className="text-right px-3 py-2 border border-gray-100">割り振り</th>
            <th className="text-right px-3 py-2 border border-gray-100">装備</th>
            {showProtein && <th className="text-right px-3 py-2 border border-gray-100">プロテイン</th>}
            <th className="text-right px-3 py-2 border border-gray-100">アクセ</th>
            <th className="text-right px-3 py-2 border border-gray-100">ペット</th>
            <th className="text-right px-3 py-2 border border-gray-100 text-green-600">加算%</th>
            <th className="text-right px-3 py-2 border border-gray-100 text-purple-600">最終%</th>
            <th className="text-right px-3 py-2 border border-gray-100 font-bold text-gray-700">最終</th>
          </tr>
        </thead>
        <tbody>
          {STAT_LABELS.map(({ key, label: statLabel }) => (
            <tr key={key} className="even:bg-gray-50/50 hover:bg-blue-50/40 transition-colors">
              <td className="px-3 py-1.5 border border-gray-100 font-medium text-gray-600">{statLabel}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums">{alloc[key].toLocaleString()}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums">{equipment[key].toLocaleString()}</td>
              {showProtein && <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums">{protein[key].toLocaleString()}</td>}
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums">{accFlat[key].toLocaleString()}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums">{petFlat[key].toLocaleString()}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-green-600">{fmtPct(pctBonus[key])}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-purple-600">{fmtPct(finalPctBonus[key])}</td>
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold text-blue-700">{final[key].toLocaleString()}</td>
            </tr>
          ))}
          <tr className="bg-red-50/60 hover:bg-red-50 transition-colors">
            <td className="px-3 py-1.5 border border-gray-100 font-medium text-red-600">HP</td>
            <td colSpan={showProtein ? 7 : 6} className="px-3 py-1.5 border border-gray-100 text-right text-gray-400 text-xs">VIT × 18 + 100</td>
            <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold text-red-600">{hp.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CompareTable({ resultA, resultB }: { resultA: ReturnType<typeof calcStatus>; resultB: ReturnType<typeof calcStatus> }) {
  return (
    <div className="overflow-x-auto space-y-2">
      <div className="flex gap-2 flex-wrap">
        {resultA.setBonus && (
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5">
            A: セット効果 ×1.10{resultA.setBonusSeries ? ` (${resultA.setBonusSeries})` : ""}
          </span>
        )}
        {resultB.setBonus && (
          <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 rounded-full px-2 py-0.5">
            B: セット効果 ×1.10{resultB.setBonusSeries ? ` (${resultB.setBonusSeries})` : ""}
          </span>
        )}
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <th className="text-left px-3 py-2 border border-gray-100">ステータス</th>
            <th className="text-right px-3 py-2 border border-gray-100 text-blue-600">構成 A</th>
            <th className="text-right px-3 py-2 border border-gray-100 text-orange-500">構成 B</th>
            <th className="text-right px-3 py-2 border border-gray-100">差分 (B−A)</th>
          </tr>
        </thead>
        <tbody>
          {STAT_LABELS.map(({ key, label }) => {
            const a = resultA.final[key];
            const b = resultB.final[key];
            const diff = b - a;
            return (
              <tr key={key} className="even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                <td className="px-3 py-1.5 border border-gray-100 font-medium text-gray-600">{label}</td>
                <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-blue-700 font-medium">{a.toLocaleString()}</td>
                <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-orange-600 font-medium">{b.toLocaleString()}</td>
                <td className={`px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                </td>
              </tr>
            );
          })}
          {(() => {
            const diff = resultB.hp - resultA.hp;
            return (
              <tr className="even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                <td className="px-3 py-1.5 border border-gray-100 font-medium text-red-600">HP</td>
                <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-blue-700 font-medium">{resultA.hp.toLocaleString()}</td>
                <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums text-orange-600 font-medium">{resultB.hp.toLocaleString()}</td>
                <td className={`px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                </td>
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StatusSimulator() {
  const [cfgA, setFieldA, resetA] = usePersistedGroup<SimConfig>("sim-a", DEFAULT_CONFIG);
  const [cfgB, setFieldB, resetB] = usePersistedGroup<SimConfig>("sim-b", DEFAULT_CONFIG);
  const [activeConfig, setActiveConfig] = usePersistedState<"A" | "B">("sim-active", "A");
  const [compareMode, setCompareMode] = usePersistedState<boolean>("sim-compare", false);

  const { presets, savePreset } = useStatPresets();
  const [presetName, setPresetName] = useState("");

  const resultA = useMemo(() => calcStatus(cfgA), [cfgA]);
  const resultB = useMemo(() => calcStatus(cfgB), [cfgB]);

  const activeCfg = activeConfig === "A" ? cfgA : cfgB;
  const activeSetField = activeConfig === "A" ? setFieldA : setFieldB;
  const activeReset = activeConfig === "A" ? resetA : resetB;

  function handleSavePreset() {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    const activeResult = activeConfig === "A" ? resultA : resultB;
    const existing = presets.find((p) => p.name === trimmed);
    if (existing && !window.confirm(`プリセット「${trimmed}」を上書きしますか？`)) return;
    savePreset(trimmed, {
      atk: String(activeResult.final.atk),
      int: String(activeResult.final.int),
      def: String(activeResult.final.def),
      mdef: String(activeResult.final.mdef),
      spd: String(activeResult.final.spd),
      element: activeCfg.charElement,
      attackMode: "物理",
      targetTurns: "1",
      analysisBook: "0",
      analysisAnalysisBook: "0",
    });
    setPresetName("");
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(360px,420px)_1fr] gap-6">
      {/* 左パネル（入力） */}
      <div className="space-y-4">
        {compareMode && (
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(["A", "B"] as const).map((id) => (
              <button
                key={id}
                onClick={() => setActiveConfig(id)}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  activeConfig === id
                    ? id === "A" ? "bg-blue-500 text-white" : "bg-orange-400 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                構成 {id}
              </button>
            ))}
          </div>
        )}
        <InputPanel cfg={activeCfg} setField={activeSetField} reset={activeReset} />
      </div>

      {/* 右パネル（結果） */}
      <div className="mt-6 lg:mt-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-700">計算結果</h2>
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              compareMode
                ? "bg-purple-500 text-white hover:bg-purple-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {compareMode ? "比較モード ON" : "比較モード"}
          </button>
        </div>

        {compareMode ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <CompareTable resultA={resultA} resultB={resultB} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <StatTable breakdown={resultA} />
          </div>
        )}

        {compareMode && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
              <StatTable breakdown={resultA} label="構成 A の内訳" />
            </div>
            <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
              <StatTable breakdown={resultB} label="構成 B の内訳" />
            </div>
          </div>
        )}

        {/* ── ダメ計プリセット保存 ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">ダメ計プリセット保存</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="プリセット名"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
              className={`${inputCls} flex-1`}
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              保存
            </button>
          </div>
          {presets.length > 0 && (
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-600">登録済み ({presets.length}件)</p>
              <div className="flex flex-wrap gap-1">
                {presets.map((p) => (
                  <span key={p.id} className="bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
