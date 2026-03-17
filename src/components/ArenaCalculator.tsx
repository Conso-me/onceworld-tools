import { useMemo, useState } from "react";
import { usePersistedState } from "../hooks/usePersistedState";
import { useStatPresets } from "../hooks/useStatPresets";
import { scaleMonster } from "../utils/monsterScaling";
import {
  canNullifyDamage,
  calcAdditionalDefNeeded,
  calcDamage,
} from "../utils/defenseCalc";
import { calcMultiHitCount } from "../utils/damageCalc";
import { getMonsterByName } from "../data/monsters";
import { InputField } from "./ui/InputField";
import type { MonsterBase, ScaledMonster } from "../types/game";

// ────────────────────────────────────────────
// アリーナ裏路地 固定モンスター定義
// ────────────────────────────────────────────
const ARENA_MONSTER_DEFS = [
  { name: "ペリカンEXP", area: "1中央/2ランダム" },
  { name: "虹ペリカンEXP", area: "1中央/2ランダム" },
  { name: "マルコゲトカゲ", area: "1左右" },
  { name: "氷結晶", area: "1左右" },
  { name: "ファイヤーメイジ", area: "1左右" },
  { name: "燃えてる何か", area: "1左右" },
  { name: "ハネスライム", area: "1左右" },
  { name: "天狗", area: "1左右" },
  { name: "パンダ", area: "1左右" },
  { name: "白竜", area: "2中央" },
  { name: "支配のトリ", area: "2ランダム" },
  { name: "キングニワトリ", area: "2ランダム" },
] as const;

type ArenaMonsterDef = { base: MonsterBase; area: string };

const ARENA_MONSTERS: ArenaMonsterDef[] = ARENA_MONSTER_DEFS.flatMap((d) => {
  const base = getMonsterByName(d.name);
  return base ? [{ base, area: d.area }] : [];
});

// ────────────────────────────────────────────
// LUK回避レベル
// ────────────────────────────────────────────
type LukEvasionLevel = "ほぼほぼ" | "大体" | "たぶん" | null;

function calcLukEvasion(playerLuk: number, enemyLuk: number): LukEvasionLevel {
  if (enemyLuk <= 0) return null;
  if (playerLuk >= enemyLuk * 5) return "ほぼほぼ";
  if (playerLuk >= enemyLuk * 4) return "大体";
  if (playerLuk >= enemyLuk * 3) return "たぶん";
  return null;
}

// ────────────────────────────────────────────
// 無効化限界レベル逆算
// scaleStat(base, lv) = floor(base * ((lv-1)*0.1 + 1)) <= effective/1.75
// => lv <= (effective/(base*1.75) - 1) / 0.1 + 1
// 1000単位でスナップ
// ────────────────────────────────────────────
function calcMaxNullifyArenaLevel(
  base: MonsterBase,
  playerDef: number,
  playerMdef: number
): number | null {
  const isPhysical = base.attackType === "物理";
  const statBase = isPhysical ? base.atk : base.int;
  if (statBase === 0) return Infinity;

  const effective = isPhysical
    ? playerDef + playerMdef / 10
    : playerMdef + playerDef / 10;

  const maxLv = (effective / (statBase * 1.75) - 1) / 0.1 + 1;
  const snapped = Math.floor(maxLv / 1000) * 1000;
  return snapped < 1000 ? null : snapped;
}

// ────────────────────────────────────────────
// 行コンポーネント
// ────────────────────────────────────────────
type ArenaResult = {
  base: MonsterBase;
  area: string;
  scaled: ScaledMonster;
  isPhysical: boolean;
  enemyStat: number;
  nullifiedNow: boolean;
  maxNullifyLv: number | null;
  additionalDef: number;
  additionalMdef: number;
  hitsToSurvive: { worst: number; best: number } | null;
  lukEvasionLevel: LukEvasionLevel;
  scaledLuck: number;
};

function LukEvasionBadge({ level, enemyLuk }: { level: LukEvasionLevel; enemyLuk: number }) {
  if (level === "ほぼほぼ") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        ほぼほぼ
      </span>
    );
  }
  if (level === "大体") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
        大体
      </span>
    );
  }
  if (level === "たぶん") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600 border border-orange-200">
        たぶん
      </span>
    );
  }
  return (
    <span className="text-xs text-gray-400">
      {enemyLuk > 0 ? `×3: ${(enemyLuk * 3).toLocaleString("ja-JP")}` : "—"}
    </span>
  );
}

function NullifyLvBadge({ lv, onClick }: { lv: number | null; onClick?: (lv: number) => void }) {
  if (lv === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
        無効化不可
      </span>
    );
  }
  if (lv === Infinity) {
    return <span className="text-gray-400 text-sm">∞</span>;
  }
  return (
    <span
      className={`text-sm font-medium text-gray-700${onClick ? " cursor-pointer hover:underline hover:text-indigo-600" : ""}`}
      onClick={onClick ? () => onClick(lv) : undefined}
    >
      Lv {lv.toLocaleString("ja-JP")}
    </span>
  );
}

function formatHitCount(n: number): string {
  if (!isFinite(n)) return "∞";
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000).toLocaleString("ja-JP")}M`;
  if (n >= 100_000) return `${Math.floor(n / 10_000).toLocaleString("ja-JP")}万`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString("ja-JP");
}

function HitsToSurviveBadge({ hits, lukLevel }: { hits: { worst: number; best: number } | null; lukLevel: LukEvasionLevel }) {
  if (hits === null) {
    return <span className="text-gray-400">—</span>;
  }
  // 10万回以上は事実上死なないので簡潔に
  if (hits.worst >= 100_000) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        余裕
      </span>
    );
  }
  // 5回未満 & LUK回避が「大体」(×4)に満たない → 危険
  const isDangerous = hits.worst < 5 && lukLevel !== "ほぼほぼ" && lukLevel !== "大体";
  const worstStr = formatHitCount(hits.worst);
  const bestStr = formatHitCount(hits.best);
  if (isDangerous) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
        {worstStr === bestStr ? `${worstStr}回` : `${worstStr}~${bestStr}回`}
      </span>
    );
  }
  if (worstStr === bestStr) {
    return <span className="text-sm text-gray-700">{worstStr}回</span>;
  }
  return (
    <span className="text-sm text-gray-700">
      {worstStr}~{bestStr}回
    </span>
  );
}

function ArenaMonsterRow({ result, onLevelClick }: { result: ArenaResult; onLevelClick?: (lv: number) => void }) {
  const isDangerous =
    result.hitsToSurvive !== null &&
    result.hitsToSurvive.worst < 5 &&
    result.lukEvasionLevel !== "ほぼほぼ" &&
    result.lukEvasionLevel !== "大体";

  const rowBg = result.nullifiedNow
    ? "bg-green-50 border-green-200"
    : isDangerous
    ? "bg-red-100 border-red-300"
    : "bg-orange-50 border-orange-200";

  return (
    <tr className={`border-b ${rowBg} text-sm`}>
      <td className="px-2 py-1.5 font-medium text-gray-800 whitespace-nowrap">
        {result.base.name}
      </td>
      <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap text-xs">
        {result.area}
      </td>
      <td className="px-2 py-1.5 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${
            result.isPhysical
              ? "bg-orange-100 text-orange-700 border-orange-200"
              : "bg-blue-100 text-blue-700 border-blue-200"
          }`}
        >
          {result.isPhysical ? "物理" : "魔法"}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right font-medium text-gray-700 whitespace-nowrap">
        {result.enemyStat.toLocaleString("ja-JP")}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        {result.nullifiedNow ? (
          <span className="text-green-600 font-bold">✓</span>
        ) : (
          <span className="text-orange-500 font-bold">✗</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        <HitsToSurviveBadge hits={result.hitsToSurvive} lukLevel={result.lukEvasionLevel} />
      </td>
      <td className="px-2 py-1.5 text-right whitespace-nowrap">
        <NullifyLvBadge lv={result.maxNullifyLv} onClick={onLevelClick} />
      </td>
      <td className="px-2 py-1.5 text-right text-xs whitespace-nowrap">
        {result.isPhysical ? (
          <span className="text-orange-600">{result.additionalDef.toLocaleString("ja-JP")}</span>
        ) : (
          <span className="text-purple-600">{result.additionalMdef.toLocaleString("ja-JP")}</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        <LukEvasionBadge level={result.lukEvasionLevel} enemyLuk={result.scaledLuck} />
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────
export function ArenaCalculator() {
  const [myDef, setMyDef] = usePersistedState("arena:def", "");
  const [myMdef, setMyMdef] = usePersistedState("arena:mdef", "");
  const [myVit, setMyVit] = usePersistedState("arena:vit", "");
  const [myLuk, setMyLuk] = usePersistedState("arena:luk", "");
  const [syncWithDmg, setSyncWithDmg] = usePersistedState("arena:sync", false);
  const [arenaLevel, setArenaLevel] = usePersistedState(
    "arena:level",
    "10000"
  );
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const { presets, loadPreset } = useStatPresets();

  // syncON時はdmg:タブのlocalStorage値を直接読む
  const effectiveDef = syncWithDmg
    ? parseInt(
        JSON.parse(localStorage.getItem("owt:dmg:def") ?? '""') || "0"
      ) || 0
    : parseInt(myDef) || 0;
  const effectiveMdef = syncWithDmg
    ? parseInt(
        JSON.parse(localStorage.getItem("owt:dmg:mdef") ?? '""') || "0"
      ) || 0
    : parseInt(myMdef) || 0;
  const effectiveVit = syncWithDmg
    ? parseInt(
        JSON.parse(localStorage.getItem("owt:dmg:vit") ?? '""') || "0"
      ) || 0
    : parseInt(myVit) || 0;
  const effectiveLuk = syncWithDmg
    ? parseInt(
        JSON.parse(localStorage.getItem("owt:dmg:luck") ?? '""') || "0"
      ) || 0
    : parseInt(myLuk) || 0;

  const playerHp = effectiveVit > 0 ? effectiveVit * 18 + 100 : 0;

  const handleLoadPreset = (id: string) => {
    const preset = loadPreset(id);
    if (!preset) return;
    setMyDef(preset.def);
    setMyMdef(preset.mdef);
    setMyVit(preset.vit);
    setMyLuk(preset.luck);
    setSyncWithDmg(false);
    setSelectedPresetId(id);
  };

  const arenaResults = useMemo(() => {
    const lv =
      parseInt(arenaLevel.replace(/,/g, "").replace(/[^0-9]/g, "")) || 10000;
    return ARENA_MONSTERS.map(({ base, area }) => {
      const scaled = scaleMonster(base, lv);
      const isPhysical = base.attackType === "物理";
      const enemyStat = isPhysical ? scaled.scaledAtk : scaled.scaledInt;
      const nullifiedNow = canNullifyDamage(
        enemyStat,
        effectiveDef,
        effectiveMdef,
        isPhysical
      );
      const maxNullifyLv = calcMaxNullifyArenaLevel(
        base,
        effectiveDef,
        effectiveMdef
      );

      // 相互補正込みの追加必要DEF/MDEF
      const additional = calcAdditionalDefNeeded(
        enemyStat,
        effectiveDef,
        effectiveMdef,
        isPhysical
      );
      const additionalDef = additional.additionalDef;
      const additionalMdef = additional.additionalMdef;

      // 耐久回数計算
      let hitsToSurvive: { worst: number; best: number } | null = null;
      if (playerHp > 0) {
        const dmg = calcDamage(enemyStat, effectiveDef, effectiveMdef, isPhysical);
        const multiHit = calcMultiHitCount(scaled.scaledSpd, false);
        const dmgPerTurnMax = dmg.max * multiHit;
        const dmgPerTurnMin = dmg.min * multiHit;
        hitsToSurvive = {
          worst: Math.ceil(playerHp / dmgPerTurnMax),
          best: dmgPerTurnMin > 0 ? Math.floor(playerHp / dmgPerTurnMin) : Infinity,
        };
      }

      const scaledLuck = scaled.scaledLuck;
      const lukEvasionLevel = calcLukEvasion(effectiveLuk, scaledLuck);
      return {
        base,
        area,
        scaled,
        isPhysical,
        enemyStat,
        nullifiedNow,
        maxNullifyLv,
        additionalDef,
        additionalMdef,
        hitsToSurvive,
        lukEvasionLevel,
        scaledLuck,
      } satisfies ArenaResult;
    });
  }, [effectiveDef, effectiveMdef, effectiveVit, effectiveLuk, arenaLevel, playerHp]);

  const arenaLevelNum = useMemo(
    () =>
      parseInt(arenaLevel.replace(/,/g, "").replace(/[^0-9]/g, "")) || 10000,
    [arenaLevel]
  );
  const nullifiedCount = arenaResults.filter((r) => r.nullifiedNow).length;

  return (
    <div className="max-w-lg mx-auto space-y-6 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start">
      {/* ヘッダー */}
      <div className="text-center space-y-1 lg:col-span-2 lg:flex lg:items-baseline lg:gap-3 lg:justify-center lg:space-y-0">
        <h2 className="text-2xl font-bold text-gray-800">裏路地シミュレーター</h2>
        <p className="text-sm text-gray-500">
          各モンスターへの無効化ライン・限界レベルを一括表示
        </p>
      </div>

      {/* ───── 左カラム: 入力パネル ───── */}
      <div className="space-y-6 lg:space-y-2">
        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 lg:p-4 space-y-5 lg:space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-500 text-sm">自</span>
            </div>
            <h3 className="font-semibold text-gray-800">自分のステータス</h3>
          </div>

          {/* プリセット読み込み */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500">
              プリセット読み込み
            </label>
            <div className="flex gap-1.5">
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700"
              >
                <option value="">選択...</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleLoadPreset(selectedPresetId)}
                disabled={!selectedPresetId}
                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-100 text-indigo-600 font-medium disabled:opacity-40 hover:bg-indigo-200 transition-colors"
              >
                読み込み
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* DEF / M-DEF 入力 */}
          <div className="grid grid-cols-2 gap-4 lg:gap-2">
            {syncWithDmg ? (
              <>
                <div className="space-y-1.5 lg:space-y-1">
                  <label className="block text-sm lg:text-xs font-medium text-gray-400">
                    DEF
                  </label>
                  <div className="w-full px-4 py-3 lg:py-2 bg-gray-50 border border-gray-200 rounded-xl text-lg lg:text-base font-medium text-gray-400">
                    {effectiveDef > 0
                      ? effectiveDef.toLocaleString("ja-JP")
                      : "—"}
                  </div>
                </div>
                <div className="space-y-1.5 lg:space-y-1">
                  <label className="block text-sm lg:text-xs font-medium text-gray-400">
                    M-DEF
                  </label>
                  <div className="w-full px-4 py-3 lg:py-2 bg-gray-50 border border-gray-200 rounded-xl text-lg lg:text-base font-medium text-gray-400">
                    {effectiveMdef > 0
                      ? effectiveMdef.toLocaleString("ja-JP")
                      : "—"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <InputField label="DEF" value={myDef} onChange={setMyDef} />
                <InputField
                  label="M-DEF"
                  value={myMdef}
                  onChange={setMyMdef}
                />
              </>
            )}
          </div>

          {/* VIT / LUK 入力 */}
          <div className="grid grid-cols-2 gap-4 lg:gap-2">
            {syncWithDmg ? (
              <>
                <div className="space-y-1.5 lg:space-y-1">
                  <label className="block text-sm lg:text-xs font-medium text-gray-400">
                    VIT
                  </label>
                  <div className="w-full px-4 py-3 lg:py-2 bg-gray-50 border border-gray-200 rounded-xl text-lg lg:text-base font-medium text-gray-400">
                    {effectiveVit > 0 ? effectiveVit.toLocaleString("ja-JP") : "—"}
                  </div>
                </div>
                <div className="space-y-1.5 lg:space-y-1">
                  <label className="block text-sm lg:text-xs font-medium text-gray-400">
                    LUK（回避判定用）
                  </label>
                  <div className="w-full px-4 py-3 lg:py-2 bg-gray-50 border border-gray-200 rounded-xl text-lg lg:text-base font-medium text-gray-400">
                    {effectiveLuk > 0 ? effectiveLuk.toLocaleString("ja-JP") : "—"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <InputField label="VIT" value={myVit} onChange={setMyVit} />
                <InputField label="LUK（回避判定用）" value={myLuk} onChange={setMyLuk} />
              </>
            )}
          </div>

          {/* ダメ計と同期トグル */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">ダメ計と同期</span>
            <button
              onClick={() => setSyncWithDmg(!syncWithDmg)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                syncWithDmg ? "bg-indigo-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  syncWithDmg ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-xs font-medium ${
                syncWithDmg ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              {syncWithDmg ? "ON" : "OFF"}
            </span>
          </div>

          <div className="border-t border-gray-100" />

          {/* アリーナレベル */}
          <div className="space-y-1.5">
            <label className="block text-sm lg:text-xs font-medium text-gray-600">
              表示レベル
              <span className="ml-1 text-xs text-gray-400 font-normal">
                (1,000単位)
              </span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={(() => {
                const n = parseInt(arenaLevel, 10);
                return isNaN(n) ? "" : n.toLocaleString("ja-JP");
              })()}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setArenaLevel(raw);
              }}
              onBlur={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                const snapped = Math.max(
                  Math.round(parseInt(raw || "10000") / 1000) * 1000,
                  1000
                );
                setArenaLevel(String(snapped));
              }}
              placeholder="10,000"
              className="w-full px-4 py-3 lg:py-2 bg-white border border-gray-200 rounded-xl text-lg lg:text-base font-medium text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        {/* サマリー */}
        <div className="bg-white rounded-2xl shadow shadow-gray-200/50 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">無効化できているモンスター</span>
            <span
              className={`text-lg font-bold ${
                nullifiedCount === arenaResults.length
                  ? "text-green-600"
                  : nullifiedCount === 0
                  ? "text-red-500"
                  : "text-orange-500"
              }`}
            >
              {nullifiedCount} / {arenaResults.length}
            </span>
          </div>
          {playerHp > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">HP</span>
              <span className="text-lg font-bold text-gray-700">
                {playerHp.toLocaleString("ja-JP")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ───── 右カラム: 結果テーブル ───── */}
      <div className="bg-white rounded-2xl shadow shadow-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                <th className="px-2 py-2 text-left font-medium">モンスター</th>
                <th className="px-2 py-2 text-left font-medium">場所</th>
                <th className="px-2 py-2 text-left font-medium">種別</th>
                <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
                  Lv{arenaLevelNum.toLocaleString("ja-JP")}攻撃力
                </th>
                <th className="px-2 py-2 text-center font-medium">無効化</th>
                <th className="px-2 py-2 text-center font-medium whitespace-nowrap">
                  耐久回数
                </th>
                <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
                  限界Lv
                </th>
                <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
                  あと必要DEF/MDEF
                </th>
                <th className="px-2 py-2 text-center font-medium whitespace-nowrap">
                  LUK回避
                </th>
              </tr>
            </thead>
            <tbody>
              {arenaResults.map((result) => (
                <ArenaMonsterRow
                  key={result.base.name}
                  result={result}
                  onLevelClick={(lv) => setArenaLevel(String(lv))}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* 凡例 */}
        <div className="px-3 py-2 border-t border-gray-100 space-y-1.5">
          <div className="flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" />
              無効化達成
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-200 inline-block" />
              未達成
            </span>
            <span className="ml-auto">あと必要 = <span className="text-orange-600">DEF</span> / <span className="text-purple-600">M-DEF</span> の追加必要値</span>
          </div>
          <div className="text-xs text-gray-400 space-y-0.5">
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
              <span className="font-medium text-gray-500">LUK回避目安：</span>
              <span className="flex items-center gap-1">
                <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600 border border-orange-200">たぶん</span>
                敵LUK×3
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">大体</span>
                敵LUK×4
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">ほぼほぼ</span>
                敵LUK×5
              </span>
            </div>
            <p className="text-gray-400">※ LUK回避の計算式は非公式です。当たっても知らないよ！確定回避にはなりません。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
