import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { PetDamageConfig, PetStatResult, Element } from "../../types/game";
import { useAllMonsters } from "../../hooks/useAllMonsters";
import { MonsterSelectorModal } from "../ui/MonsterSelectorModal";
import { usePetPresets } from "../../hooks/usePetPresets";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PetConfigPanelProps {
  config: PetDamageConfig;
  setField: <K extends keyof PetDamageConfig>(field: K, value: PetDamageConfig[K]) => void;
  reset: () => void;
  petResult: PetStatResult | null;
  replaceConfig?: (cfg: PetDamageConfig) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ELEMENTS: Element[] = ["火", "水", "木", "光", "闇"];

const elementColors: Record<Element, string> = {
  火: "bg-red-100 text-red-600 border-red-200",
  水: "bg-blue-100 text-blue-600 border-blue-200",
  木: "bg-green-100 text-green-600 border-green-200",
  光: "bg-yellow-100 text-yellow-700 border-yellow-200",
  闇: "bg-purple-100 text-purple-600 border-purple-200",
};

const elementBadgeColors: Record<Element, string> = {
  火: "bg-red-100 text-red-600",
  水: "bg-blue-100 text-blue-600",
  木: "bg-green-100 text-green-600",
  光: "bg-yellow-100 text-yellow-700",
  闇: "bg-purple-100 text-purple-600",
};

type MushroomKey = "mushroomFire" | "mushroomWater" | "mushroomWood" | "mushroomLight" | "mushroomDark";
const MUSHROOM_BY_ELEMENT: Record<Element, MushroomKey> = {
  火: "mushroomFire",
  水: "mushroomWater",
  木: "mushroomWood",
  光: "mushroomLight",
  闇: "mushroomDark",
};

const MUSHROOM_LABELS: Record<Element, string> = {
  火: "火",
  水: "水",
  木: "木",
  光: "光",
  闇: "闇",
};

type PowderKey = "powderVit" | "powderSpd" | "powderAtk" | "powderInt" | "powderDef" | "powderMdef" | "powderLuck";
const POWDER_FIELDS: { key: PowderKey; label: string }[] = [
  { key: "powderVit",  label: "VIT" },
  { key: "powderSpd",  label: "SPD" },
  { key: "powderAtk",  label: "ATK" },
  { key: "powderInt",  label: "INT" },
  { key: "powderDef",  label: "DEF" },
  { key: "powderMdef", label: "M-DEF" },
  { key: "powderLuck", label: "LUCK" },
];

const STAT_DISPLAY: { key: keyof PetStatResult["final"]; label: string }[] = [
  { key: "vit",  label: "VIT" },
  { key: "spd",  label: "SPD" },
  { key: "atk",  label: "ATK" },
  { key: "int",  label: "INT" },
  { key: "def",  label: "DEF" },
  { key: "mdef", label: "M-DEF" },
  { key: "luck", label: "LUCK" },
];

// ── Helper: compact number input ──────────────────────────────────────────────

function CompactInput({
  label,
  value,
  onChange,
  max,
  highlight = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
  highlight?: boolean;
}) {
  const [localStr, setLocalStr] = useState<string | null>(null);
  const displayVal = localStr !== null ? localStr : String(value);

  return (
    <div className="flex flex-col gap-0.5">
      <label
        className={`text-center text-[10px] lg:text-[9px] font-medium leading-none ${
          highlight ? "text-indigo-600" : "text-gray-500"
        }`}
      >
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={displayVal}
        onFocus={() => setLocalStr(String(value))}
        onBlur={() => {
          const raw = (localStr ?? "").replace(/[^0-9]/g, "");
          let num = parseInt(raw, 10);
          if (isNaN(num)) num = 0;
          if (max !== undefined) num = Math.min(num, max);
          onChange(num);
          setLocalStr(null);
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          if (max !== undefined && raw !== "" && parseInt(raw, 10) > max) return;
          setLocalStr(raw);
        }}
        className={`w-full text-center px-1 py-1.5 lg:py-1 border rounded-lg text-sm lg:text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow ${
          highlight
            ? "border-indigo-300 bg-indigo-50"
            : "border-gray-200 bg-white"
        }`}
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PetConfigPanel({ config, setField, reset, petResult, replaceConfig }: PetConfigPanelProps) {
  const { t } = useTranslation("damage");
  const { t: tGame } = useTranslation("game");
  const { t: tCommon } = useTranslation("common");
  const allMonsters = useAllMonsters();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { presets, savePreset, loadPreset, deletePreset } = usePetPresets();
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");

  const selectedMonster = useMemo(
    () => (config.petMonsterName ? allMonsters.find((m) => m.name === config.petMonsterName) ?? null : null),
    [config.petMonsterName, allMonsters],
  );

  const petElement: Element | null = selectedMonster?.element ?? null;
  const activeMushroomKey: MushroomKey | null = petElement ? MUSHROOM_BY_ELEMENT[petElement] : null;

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleNumField = <K extends keyof PetDamageConfig>(
    field: K,
    raw: string,
    maxVal?: number,
  ) => {
    let num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num)) num = 0;
    if (maxVal !== undefined) num = Math.min(num, maxVal);
    setField(field, num as PetDamageConfig[K]);
  };

  const handleSavePreset = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    const existing = presets.find((p) => p.name === trimmed);
    if (existing && !window.confirm(tCommon("overwriteConfirm", { name: trimmed }))) return;
    savePreset(trimmed, config);
    setPresetName("");
  };

  const handleLoadPreset = () => {
    const preset = loadPreset(selectedPresetId);
    if (!preset || !replaceConfig) return;
    replaceConfig(preset.config);
  };

  const handleDeletePreset = () => {
    deletePreset(selectedPresetId);
    setSelectedPresetId("");
  };

  return (
    <div className="space-y-3 lg:space-y-2">

      {/* ── ペット選択 ─────────────────────────────────────── */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-500">{t("petSelectPet")}</label>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          {selectedMonster ? (
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-gray-800 truncate">{selectedMonster.name}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${elementBadgeColors[selectedMonster.element]}`}
              >
                {tGame(`element.${selectedMonster.element}`)}
              </span>
            </span>
          ) : (
            <span className="text-gray-400">{t("petSelectPet")}</span>
          )}
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <MonsterSelectorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelect={(monster) => {
            setField("petMonsterName", monster.name);
            setIsModalOpen(false);
          }}
        />
      </div>

      {/* ── ペットレベル + 同族殲儀 ────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {/* ペットレベル */}
        <div className="space-y-1">
          <label className="block text-[10px] lg:text-[9px] font-medium text-gray-500 truncate">
            {t("petLevel")}
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={config.petLevel}
              onChange={(e) => handleNumField("petLevel", e.target.value, 1200)}
              className="w-full px-2 py-1.5 lg:py-1 bg-white border border-gray-200 rounded-lg text-center text-sm lg:text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
            <button
              type="button"
              onClick={() => setField("petLevel", 1200)}
              className="flex-shrink-0 px-1.5 py-1.5 lg:py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors leading-none"
            >
              MAX
            </button>
          </div>
        </div>

        {/* 同族殲儀回数 */}
        <div className="space-y-1">
          <label className="block text-[10px] lg:text-[9px] font-medium text-gray-500 truncate">
            {t("petSengiCount")}
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={config.sengiCount}
            onChange={(e) => handleNumField("sengiCount", e.target.value, 30)}
            className="w-full px-2 py-1.5 lg:py-1 bg-white border border-gray-200 rounded-lg text-center text-sm lg:text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          />
          <p className="text-[10px] text-gray-400 text-center leading-none">0〜30</p>
        </div>
      </div>

      {/* ── 一括MAX ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => {
          setField("mushroomFire", 1000);
          setField("mushroomWater", 1000);
          setField("mushroomWood", 1000);
          setField("mushroomLight", 1000);
          setField("mushroomDark", 1000);
          setField("powderVit", 100);
          setField("powderSpd", 100);
          setField("powderAtk", 100);
          setField("powderInt", 100);
          setField("powderDef", 100);
          setField("powderMdef", 100);
          setField("powderLuck", 100);
        }}
        className="w-full py-1.5 lg:py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
      >
        {t("petAllMax")}
      </button>

      {/* ── 属性キノコ ──────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">{t("petMushroomCount")}</label>
          {petElement && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${elementColors[petElement]}`}>
              {tGame(`element.${petElement}`)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {ELEMENTS.map((el) => {
            const key = MUSHROOM_BY_ELEMENT[el];
            const isActive = key === activeMushroomKey;
            return (
              <CompactInput
                key={el}
                label={MUSHROOM_LABELS[el]}
                value={config[key]}
                onChange={(v) => setField(key, v)}
                max={1000}
                highlight={isActive}
              />
            );
          })}
        </div>
        {/* キノコハウス */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.hasMushroomHouse}
            onChange={(e) => setField("hasMushroomHouse", e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-xs text-gray-600">{t("petMushroomHouse")}</span>
        </label>
      </div>

      {/* ── 粉の割り振り ───────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">{t("petPowderAlloc")}</label>
          <span className="text-[10px] text-gray-400">各 0〜100</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {POWDER_FIELDS.map(({ key, label }) => (
            <CompactInput
              key={key}
              label={label}
              value={config[key]}
              onChange={(v) => setField(key, v)}
              max={100}
            />
          ))}
        </div>
      </div>

      {/* ── 計算結果 ───────────────────────────────────────── */}
      {petResult ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">{t("petComputedStats")}</label>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${elementColors[petResult.element]}`}
            >
              {tGame(`element.${petResult.element}`)}
            </span>
            <span className="text-[10px] text-gray-500">
              {tGame(`attackType.${petResult.attackMode}`)}
            </span>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 lg:p-1.5 space-y-1">
            {/* HP row */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] lg:text-[9px] font-medium text-gray-500">HP</span>
              <span className="text-xs lg:text-[10px] font-semibold text-gray-800">
                {petResult.hp.toLocaleString()}
              </span>
            </div>
            {/* Stat grid */}
            <div className="grid grid-cols-4 gap-x-2 gap-y-0.5">
              {STAT_DISPLAY.map(({ key, label }) => (
                <div key={key} className="flex flex-col items-center">
                  <span className="text-[9px] text-gray-400 leading-none">{label}</span>
                  <span className="text-[10px] lg:text-[9px] font-semibold text-gray-700 leading-snug">
                    {petResult.final[key].toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-1">{t("petNoPetSelected")}</p>
      )}

      {/* ── プリセット ────────────────────────────────────── */}
      <div className="space-y-1 pt-1 border-t border-gray-100">
        {/* 保存 */}
        <div className="flex gap-1">
          <input
            type="text"
            placeholder={t("petPresetNamePlaceholder")}
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSavePreset(); }}
            className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className="flex-shrink-0 px-2 py-1 text-xs bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t("petPresetSave")}
          </button>
        </div>
        {/* 読み込み */}
        {presets.length > 0 && (
          <div className="flex gap-1">
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("petPresetSelect")}</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleLoadPreset}
              disabled={!selectedPresetId || !replaceConfig}
              className="flex-shrink-0 px-2 py-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("petPresetLoad")}
            </button>
            <button
              type="button"
              onClick={handleDeletePreset}
              disabled={!selectedPresetId}
              className="flex-shrink-0 px-2 py-1 text-xs bg-red-50 border border-red-200 text-red-500 rounded-lg hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {tCommon("delete")}
            </button>
          </div>
        )}
      </div>

      {/* ── リセットボタン ─────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={reset}
          className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
        >
          {tCommon("reset")}
        </button>
      </div>
    </div>
  );
}
