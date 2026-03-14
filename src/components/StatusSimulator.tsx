import { useMemo } from "react";
import { usePersistedState, usePersistedGroup } from "../hooks/usePersistedState";
import { calcStatus, calcAllocatedPoints, getAvailablePoints, getPerStatLimit } from "../utils/statusCalc";
import { getEquipmentBySlot, getAllPetNames, getAllAccessoryNames } from "../data";
import type { SimConfig, CoreStats, EquipmentSlot } from "../types/game";

const STAT_LABELS: { key: keyof CoreStats; label: string }[] = [
  { key: "vit",  label: "VIT" },
  { key: "spd",  label: "SPD" },
  { key: "atk",  label: "ATK" },
  { key: "int",  label: "INT" },
  { key: "def",  label: "DEF" },
  { key: "mdef", label: "M-DEF" },
  { key: "luck", label: "LUCK" },
];

const EQUIPMENT_SLOTS: { slot: EquipmentSlot; label: string; cfgKey: keyof SimConfig }[] = [
  { slot: "武器", label: "武器",  cfgKey: "equipWeapon" },
  { slot: "頭",   label: "頭",    cfgKey: "equipHead" },
  { slot: "服",   label: "服",    cfgKey: "equipBody" },
  { slot: "手",   label: "手",    cfgKey: "equipHand" },
  { slot: "盾",   label: "盾",    cfgKey: "equipShield" },
  { slot: "脚",   label: "脚",    cfgKey: "equipFoot" },
];

const PROTEIN_KEYS: { cfg: keyof SimConfig; label: string }[] = [
  { cfg: "proteinVit",  label: "VIT" },
  { cfg: "proteinSpd",  label: "SPD" },
  { cfg: "proteinAtk",  label: "ATK" },
  { cfg: "proteinInt",  label: "INT" },
  { cfg: "proteinDef",  label: "DEF" },
  { cfg: "proteinMdef", label: "M-DEF" },
  { cfg: "proteinLuck", label: "LUCK" },
];

const ALLOC_KEYS: { cfg: keyof SimConfig; label: string }[] = [
  { cfg: "allocVit",  label: "VIT" },
  { cfg: "allocSpd",  label: "SPD" },
  { cfg: "allocAtk",  label: "ATK" },
  { cfg: "allocInt",  label: "INT" },
  { cfg: "allocDef",  label: "DEF" },
  { cfg: "allocMdef", label: "M-DEF" },
  { cfg: "allocLuck", label: "LUCK" },
];

const PET_LEVELS = [0, 31, 71, 121, 181] as const;

const DEFAULT_CONFIG: SimConfig = {
  charLevel: 100,
  reinCount: 0,
  // 振り分けポイント
  hasCosmoCube: false,
  johaneCount: 0,
  // 振り分け上限（デフォルトMAX）
  kinikiBookCount: 1000,
  sageItemCount: 1000,
  hasChoyoContract: true,
  // 割り振り
  allocVit: 0, allocSpd: 0, allocAtk: 0, allocInt: 0,
  allocDef: 0, allocMdef: 0, allocLuck: 0,
  // 装備
  equipWeapon: "", equipHead: "", equipBody: "",
  equipHand: "", equipShield: "", equipFoot: "",
  // アクセ
  acc1: "", acc2: "",
  // ペット
  petName: "", petLevel: 0,
  // プロテイン
  proteinVit: 0, proteinSpd: 0, proteinAtk: 0, proteinInt: 0,
  proteinDef: 0, proteinMdef: 0, proteinLuck: 0,
  pShakerCount: 0,
  // HP補正
  kinikiLiquidCount: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function NumInput({
  value, onChange, min = 0, max, label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type="number" min={min} max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(max !== undefined ? Math.max(min, Math.min(max, v)) : Math.max(min, v));
        }}
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    </label>
  );
}

// ── Input Panel ───────────────────────────────────────────────────────────────

function InputPanel({
  cfg,
  setField,
  reset,
}: {
  cfg: SimConfig;
  setField: <K extends keyof SimConfig>(field: K, value: SimConfig[K]) => void;
  reset: () => void;
}) {
  const available = getAvailablePoints(cfg);
  const perStatLimit = getPerStatLimit(cfg);
  const used = calcAllocatedPoints(cfg);
  const remaining = available - used;
  const overflowed = remaining < 0;

  const petNames = getAllPetNames();
  const accNames = getAllAccessoryNames();

  // Check if any alloc stat exceeds per-stat limit
  const allocValues: { label: string; value: number }[] = [
    { label: "VIT",   value: cfg.allocVit  },
    { label: "SPD",   value: cfg.allocSpd  },
    { label: "ATK",   value: cfg.allocAtk  },
    { label: "INT",   value: cfg.allocInt  },
    { label: "DEF",   value: cfg.allocDef  },
    { label: "M-DEF", value: cfg.allocMdef },
    { label: "LUCK",  value: cfg.allocLuck },
  ];
  const cappedStats = allocValues.filter((s) => s.value > perStatLimit);

  return (
    <div className="space-y-4">
      {/* ── キャラクター設定 ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">キャラクター設定</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="レベル" value={cfg.charLevel} min={1} max={200}
            onChange={(v) => setField("charLevel", v)} />
          <label className="space-y-1">
            <span className="text-xs text-gray-500">天命輪廻</span>
            <select
              value={cfg.reinCount}
              onChange={(e) => setField("reinCount", Number(e.target.value) as SimConfig["reinCount"])}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value={0}>なし</option>
              <option value={10}>10回</option>
              <option value={11}>11回</option>
              <option value={12}>12回</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.hasCosmoCube}
            onChange={(e) => setField("hasCosmoCube", e.target.checked)}
            className="accent-blue-500 w-4 h-4"
          />
          <span>コスモキューブ所持
            {cfg.hasCosmoCube && cfg.reinCount > 0 && (
              <span className="text-xs text-blue-500 ml-1">
                (+{(cfg.reinCount * 10000).toLocaleString()}pt)
              </span>
            )}
          </span>
        </label>
      </section>

      {/* ── 振り分けポイント・上限 ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">振り分けポイント・上限</h3>

        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">ポイント補正（総量を増やす）</p>
          <NumInput label="ヨハネの羽ペン (利用可能ポイント×1%/個)" value={cfg.johaneCount} max={1000}
            onChange={(v) => setField("johaneCount", v)} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">上限補正（各ステータスの上限を増やす）</p>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="禁域の書物 (+80/個)" value={cfg.kinikiBookCount} max={1000}
              onChange={(v) => setField("kinikiBookCount", v)} />
            <NumInput label="賢者の落とし物 (+10/個)" value={cfg.sageItemCount} max={1000}
              onChange={(v) => setField("sageItemCount", v)} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.hasChoyoContract}
              onChange={(e) => setField("hasChoyoContract", e.target.checked)}
              className="accent-blue-500 w-4 h-4"
            />
            <span>超越の契約書所持 (+900,000)</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
          <div>
            利用可能ポイント<br />
            <span className="font-mono font-semibold text-gray-700">{available.toLocaleString()}</span>
          </div>
          <div>
            1ステータス上限<br />
            <span className="font-mono font-semibold text-gray-700">{perStatLimit.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* ── ステータス割り振り ── */}
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
                  type="number" min={0}
                  value={val}
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

      {/* ── 装備 ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">装備</h3>
        <div className="grid grid-cols-2 gap-3">
          {EQUIPMENT_SLOTS.map(({ slot, label, cfgKey }) => {
            const items = getEquipmentBySlot(slot);
            return (
              <label key={slot} className="space-y-1">
                <span className="text-xs text-gray-500">{label}</span>
                <select
                  value={cfg[cfgKey] as string}
                  onChange={(e) => setField(cfgKey, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">なし</option>
                  {items.map((item) => (
                    <option key={item.name} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      </section>

      {/* ── アクセサリー ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">アクセサリー</h3>
        <div className="grid grid-cols-2 gap-3">
          {(["acc1", "acc2"] as const).map((key, i) => (
            <label key={key} className="space-y-1">
              <span className="text-xs text-gray-500">スロット {i + 1}</span>
              <select
                value={cfg[key]}
                onChange={(e) => setField(key, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">なし</option>
                {accNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      {/* ── ペット ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">ペット</h3>
        <label className="space-y-1 block">
          <span className="text-xs text-gray-500">ペット名</span>
          <select
            value={cfg.petName}
            onChange={(e) => setField("petName", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">なし</option>
            {petNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <div className="space-y-1">
          <span className="text-xs text-gray-500">ペットレベル</span>
          <div className="flex flex-wrap gap-2">
            {PET_LEVELS.map((lv) => (
              <label key={lv} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="radio" name="petLevel" value={lv}
                  checked={cfg.petLevel === lv}
                  onChange={() => setField("petLevel", lv as SimConfig["petLevel"])}
                  disabled={!cfg.petName && lv !== 0}
                  className="accent-blue-500"
                />
                {lv === 0 ? "なし" : `Lv${lv}`}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ── プロテイン ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">プロテイン</h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {PROTEIN_KEYS.map(({ cfg: cfgKey, label }) => (
            <NumInput key={cfgKey} label={`${label}プロテイン`} value={cfg[cfgKey] as number} max={1000}
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

      {/* ── HP補正 ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">HP補正</h3>
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
  );
}

// ── Result Tables ─────────────────────────────────────────────────────────────

function StatTable({ breakdown, label }: { breakdown: ReturnType<typeof calcStatus>; label?: string }) {
  const { final, alloc, equipment, protein, accFlat, petFlat, hp } = breakdown;
  const showProtein = STAT_LABELS.some(({ key }) => protein[key] > 0);

  return (
    <div className="overflow-x-auto">
      {label && <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <th className="text-left px-3 py-2 border border-gray-100">ステータス</th>
            <th className="text-right px-3 py-2 border border-gray-100">割り振り</th>
            <th className="text-right px-3 py-2 border border-gray-100">装備</th>
            {showProtein && <th className="text-right px-3 py-2 border border-gray-100">プロテイン</th>}
            <th className="text-right px-3 py-2 border border-gray-100">アクセ</th>
            <th className="text-right px-3 py-2 border border-gray-100">ペット</th>
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
              <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold text-blue-700">{final[key].toLocaleString()}</td>
            </tr>
          ))}
          <tr className="bg-red-50/60 hover:bg-red-50 transition-colors">
            <td className="px-3 py-1.5 border border-gray-100 font-medium text-red-600">HP</td>
            <td colSpan={showProtein ? 5 : 4} className="px-3 py-1.5 border border-gray-100 text-right text-gray-400 text-xs">VIT × 18 + 100</td>
            <td className="px-3 py-1.5 border border-gray-100 text-right tabular-nums font-bold text-red-600">{hp.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CompareTable({ resultA, resultB }: { resultA: ReturnType<typeof calcStatus>; resultB: ReturnType<typeof calcStatus> }) {
  return (
    <div className="overflow-x-auto">
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

  const resultA = useMemo(() => calcStatus(cfgA), [cfgA]);
  const resultB = useMemo(() => calcStatus(cfgB), [cfgB]);

  const activeCfg = activeConfig === "A" ? cfgA : cfgB;
  const activeSetField = activeConfig === "A" ? setFieldA : setFieldB;
  const activeReset = activeConfig === "A" ? resetA : resetB;

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
      </div>
    </div>
  );
}
