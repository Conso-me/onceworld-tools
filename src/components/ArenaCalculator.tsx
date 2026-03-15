import { useMemo, useState } from "react";
import { usePersistedState } from "../hooks/usePersistedState";
import { useStatPresets } from "../hooks/useStatPresets";
import { scaleMonster } from "../utils/monsterScaling";
import {
  canNullifyDamage,
  calcPhysicalDefenseRequirement,
  calcMagicalDefenseRequirement,
} from "../utils/defenseCalc";
import type { DefenseRequirement } from "../utils/defenseCalc";
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
  return snapped < 10000 ? null : snapped;
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
  defReq: DefenseRequirement;
};

function NullifyLvBadge({ lv }: { lv: number | null }) {
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
    <span className="text-sm font-medium text-gray-700">
      Lv {lv.toLocaleString("ja-JP")}
    </span>
  );
}

function ArenaMonsterRow({ result }: { result: ArenaResult }) {
  const rowBg = result.nullifiedNow
    ? "bg-green-50 border-green-200"
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
      <td className="px-2 py-1.5 text-right whitespace-nowrap">
        <NullifyLvBadge lv={result.maxNullifyLv} />
      </td>
      <td className="px-2 py-1.5 text-right text-xs text-gray-500 whitespace-nowrap">
        {result.isPhysical
          ? result.defReq.defOnly.toLocaleString("ja-JP")
          : result.defReq.mdefOnly.toLocaleString("ja-JP")}
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

  const handleLoadPreset = (id: string) => {
    const preset = loadPreset(id);
    if (!preset) return;
    setMyDef(preset.def);
    setMyMdef(preset.mdef);
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
      const defReq = isPhysical
        ? calcPhysicalDefenseRequirement(enemyStat)
        : calcMagicalDefenseRequirement(enemyStat);
      return {
        base,
        area,
        scaled,
        isPhysical,
        enemyStat,
        nullifiedNow,
        maxNullifyLv,
        defReq,
      } satisfies ArenaResult;
    });
  }, [effectiveDef, effectiveMdef, arenaLevel]);

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
              type="number"
              min={1000}
              step={1000}
              value={arenaLevel}
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
              placeholder="10000"
              className="w-full px-4 py-3 lg:py-2 bg-white border border-gray-200 rounded-xl text-lg lg:text-base font-medium text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        {/* サマリー */}
        <div className="bg-white rounded-2xl shadow shadow-gray-200/50 p-4">
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
                <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
                  限界Lv
                </th>
                <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
                  無効化必要DEF
                </th>
              </tr>
            </thead>
            <tbody>
              {arenaResults.map((result) => (
                <ArenaMonsterRow
                  key={result.base.name}
                  result={result}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* 凡例 */}
        <div className="px-3 py-2 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" />
            無効化達成
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-200 inline-block" />
            未達成
          </span>
          <span className="ml-auto">無効化必要DEF = 物理はDEF、魔法はM-DEFのみで換算</span>
        </div>
      </div>
    </div>
  );
}
