import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedState } from "../hooks/usePersistedState";
import { useSharedSimConfig } from "../hooks/useSharedSimConfig";
import { useSimPresets } from "../hooks/useSimPresets";
import { scaleMonster } from "../utils/monsterScaling";
import { formatHitCount } from "../utils/formatNumber";
import {
  canNullifyDamage,
  calcAdditionalDefNeeded,
  calcDamage,
} from "../utils/defenseCalc";
import {
  calcMultiHitCount,
  calcPhysicalDamage,
  calcPlayerMagicDamage,
  calcHitRate,
} from "../utils/damageCalc";
import { calcStatus } from "../utils/statusCalc";
import { getAllMonsters, getMonsterDisplayName } from "../data/monsters";
import { InputField } from "./ui/InputField";
import type { MonsterBase, ScaledMonster } from "../types/game";
import type { TFunction } from "i18next";

// ────────────────────────────────────────────
// フロア↔レベル変換
// ────────────────────────────────────────────
const floorToLevel = (floor: number) => 10000 + floor * 100;
const levelToFloor = (lv: number) => Math.floor((lv - 10000) / 100);

// ────────────────────────────────────────────
// モード型
// ────────────────────────────────────────────
type ViewMode = "endurance" | "attack";
type PlayerAttackMode = "physical" | "magic";

// ────────────────────────────────────────────
// 除外モンスター（深淵回廊専用）
// ────────────────────────────────────────────
const EXCLUDE_MONSTERS = new Set([
  "イグニス・シスター",
  "オルド・クラウセス",
  "BOX",
  "冥王ノクタール",
  "罪環の監視者モルモ",
  "ダークウィッチ",
  "冥炎のハデス",
  "スライムガール(物理)",
  "スライムガール(魔法)",
  "BIG BOX",
  "SBB",
  "RAINBOW BOX",
]);

// ────────────────────────────────────────────
// 耐久モード: ATK/INT上位8体を選定
// ────────────────────────────────────────────
function buildSkyCorridorMonsters(): { physical: MonsterBase[]; magic: MonsterBase[] } {
  const all = getAllMonsters().filter((m) => !EXCLUDE_MONSTERS.has(m.name));
  const physical = [...all.filter((m) => m.attackType === "物理")]
    .sort((a, b) => b.atk - a.atk)
    .slice(0, 8);
  const magic = [...all.filter((m) => m.attackType !== "物理")]
    .sort((a, b) => b.int - a.int)
    .slice(0, 8);
  return { physical, magic };
}

const SKY_MONSTERS = buildSkyCorridorMonsters();

// ────────────────────────────────────────────
// 火力モード: DEF/LUK上位8体・MDEF上位10体・魔法無効全体を選定
// ────────────────────────────────────────────
function buildFirepowerMonsters(): {
  physDef: MonsterBase[];
  physLuk: MonsterBase[];
  magMdef: MonsterBase[];
  magImmune: MonsterBase[];
} {
  const all = getAllMonsters().filter((m) => !EXCLUDE_MONSTERS.has(m.name));
  const physDef = [...all].sort((a, b) => b.def - a.def).slice(0, 8);
  const physLuk = [...all].sort((a, b) => b.luck - a.luck).slice(0, 8);
  const magMdef = [...all].sort((a, b) => b.mdef - a.mdef).slice(0, 10);
  const magImmune = all.filter((m) => !!m.magicImmune);
  return { physDef, physLuk, magMdef, magImmune };
}

const FIRE_MONSTERS = buildFirepowerMonsters();

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
// 無効化限界フロア逆算
// ────────────────────────────────────────────
function calcMaxNullifyFloor(
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
  const maxFloor = levelToFloor(Math.floor(maxLv / 100) * 100);
  return maxFloor < 1 ? null : maxFloor;
}

// ────────────────────────────────────────────
// バッジコンポーネント（耐久モード）
// ────────────────────────────────────────────
function LukEvasionBadge({ level, enemyLuk, t }: { level: LukEvasionLevel; enemyLuk: number; t: TFunction }) {
  if (level === "ほぼほぼ") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        {t("lukLevel.almost")}
      </span>
    );
  }
  if (level === "大体") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
        {t("lukLevel.mostly")}
      </span>
    );
  }
  if (level === "たぶん") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600 border border-orange-200">
        {t("lukLevel.maybe")}
      </span>
    );
  }
  return (
    <span className="text-xs text-gray-400">
      {enemyLuk > 0 ? `×3: ${(enemyLuk * 3).toLocaleString()}` : "—"}
    </span>
  );
}

function NullifyFloorBadge({
  floor,
  onClick,
  t,
}: {
  floor: number | null;
  onClick?: (floor: number) => void;
  t: TFunction;
}) {
  if (floor === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
        {t("cannotNullify")}
      </span>
    );
  }
  if (floor === Infinity) {
    return <span className="text-gray-400 text-sm">∞</span>;
  }
  return (
    <span
      className={`text-sm font-medium text-gray-700${onClick ? " cursor-pointer hover:underline hover:text-indigo-600" : ""}`}
      onClick={onClick ? () => onClick(floor) : undefined}
    >
      {floor.toLocaleString()}F
    </span>
  );
}

function HitsToSurviveBadge({
  hits,
  lukLevel,
  lang,
  t,
}: {
  hits: { worst: number; best: number } | null;
  lukLevel: LukEvasionLevel;
  lang: string;
  t: TFunction;
}) {
  if (hits === null) {
    return <span className="text-gray-400">—</span>;
  }
  if (hits.worst >= 100_000) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        {t("comfy")}
      </span>
    );
  }
  const isDangerous = hits.worst < 5 && lukLevel !== "ほぼほぼ" && lukLevel !== "大体";
  const times = t("common:times");
  const worstStr = formatHitCount(hits.worst, lang);
  if (isDangerous) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
        {worstStr}{times}~
      </span>
    );
  }
  return <span className="text-sm text-gray-700">{worstStr}{times}~</span>;
}

// ────────────────────────────────────────────
// 耐久モード結果型
// ────────────────────────────────────────────
type SkyResult = {
  base: MonsterBase;
  scaled: ScaledMonster;
  isPhysical: boolean;
  enemyStat: number;
  nullifiedNow: boolean;
  maxNullifyFloor: number | null;
  requiredDef: number;
  requiredMdef: number;
  hitsToSurvive: { worst: number; best: number } | null;
  lukEvasionLevel: LukEvasionLevel;
  scaledLuck: number;
  playerDamage: { min: number; max: number } | null;
  attackHitRate: number | null;
};

// ────────────────────────────────────────────
// 火力モード結果型
// ────────────────────────────────────────────
type FireResult = {
  base: MonsterBase;
  scaled: ScaledMonster;
  rankStat: number;
  scaledHp: number;
  playerDamageMin: number | null;
  canOneShot: boolean;
  hitRate: number | null;
  isMagicImmune: boolean;
  scaledLuck: number;
};

// ────────────────────────────────────────────
// 耐久モード: 行コンポーネント
// ────────────────────────────────────────────
function SkyMonsterRow({
  result,
  onFloorClick,
  t,
  lang,
}: {
  result: SkyResult;
  onFloorClick?: (floor: number) => void;
  t: TFunction;
  lang: string;
}) {
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
        {getMonsterDisplayName(result.base, lang)}
      </td>
      <td className="px-2 py-1.5 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${
            result.isPhysical
              ? "bg-orange-100 text-orange-700 border-orange-200"
              : "bg-blue-100 text-blue-700 border-blue-200"
          }`}
        >
          {result.isPhysical ? t("game:attackLabel.physical") : t("game:attackLabel.magic")}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right font-medium text-gray-700 whitespace-nowrap">
        {result.enemyStat.toLocaleString()}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        {result.nullifiedNow ? (
          <span className="text-green-600 font-bold">✓</span>
        ) : (
          <span className="text-orange-500 font-bold">✗</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        <HitsToSurviveBadge hits={result.hitsToSurvive} lukLevel={result.lukEvasionLevel} lang={lang} t={t} />
      </td>
      <td className="px-2 py-1.5 text-right whitespace-nowrap">
        <NullifyFloorBadge floor={result.maxNullifyFloor} onClick={onFloorClick} t={t} />
      </td>
      <td className="px-2 py-1.5 text-right text-xs whitespace-nowrap">
        {result.isPhysical ? (
          <span className={result.nullifiedNow ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
            {result.requiredDef.toLocaleString()}
          </span>
        ) : (
          <span className={result.nullifiedNow ? "text-green-600 font-medium" : "text-purple-600 font-medium"}>
            {result.requiredMdef.toLocaleString()}
          </span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        <LukEvasionBadge level={result.lukEvasionLevel} enemyLuk={result.scaledLuck} t={t} />
      </td>
      <td className="px-2 py-1.5 text-right text-xs whitespace-nowrap border-l-2 border-l-gray-300">
        {result.playerDamage ? (
          <span className="text-sm text-gray-700">
            {formatHitCount(result.playerDamage.min, lang)}~
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-right whitespace-nowrap">
        {result.attackHitRate !== null ? (
          <span
            className={`text-sm font-medium ${
              result.attackHitRate === 100
                ? "text-emerald-600"
                : result.attackHitRate < 50
                ? "text-red-500"
                : "text-gray-700"
            }`}
          >
            {result.attackHitRate}%
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────
// 耐久モード: テーブルヘッダー
// ────────────────────────────────────────────
function SkyTableHeader({ floor, t }: { floor: number; t: TFunction }) {
  return (
    <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
      <th className="px-2 py-2 text-left font-medium">{t("tableHeaders.monster")}</th>
      <th className="px-2 py-2 text-left font-medium">{t("tableHeaders.type")}</th>
      <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
        {t("tableHeaders.attackPower", { floor: floor.toLocaleString() })}
      </th>
      <th className="px-2 py-2 text-center font-medium">{t("tableHeaders.nullify")}</th>
      <th className="px-2 py-2 text-center font-medium whitespace-nowrap">
        {t("tableHeaders.endurance")}
      </th>
      <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
        {t("tableHeaders.maxFloor")}
      </th>
      <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
        {t("tableHeaders.additionalDef")}
      </th>
      <th className="px-2 py-2 text-center font-medium whitespace-nowrap">
        {t("tableHeaders.lukEvasion")}
      </th>
      <th className="px-2 py-2 text-right font-medium whitespace-nowrap border-l-2 border-l-gray-300">
        {t("tableHeaders.attackDmg")}
      </th>
      <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
        {t("tableHeaders.hitRate")}
      </th>
    </tr>
  );
}

// ────────────────────────────────────────────
// 耐久モード: テーブルセクション
// ────────────────────────────────────────────
function SkySection({
  title,
  results,
  floor,
  onFloorClick,
  t,
  lang,
}: {
  title: string;
  results: SkyResult[];
  floor: number;
  onFloorClick: (floor: number) => void;
  t: TFunction;
  lang: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow shadow-gray-200/50 overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <SkyTableHeader floor={floor} t={t} />
          </thead>
          <tbody>
            {results.map((result) => (
              <SkyMonsterRow
                key={result.base.name}
                result={result}
                onFloorClick={(f) => onFloorClick(f)}
                t={t}
                lang={lang}
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
            {t("nullifyAchieved")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-200 inline-block" />
            {t("notAchieved")}
          </span>
          <span className="ml-auto text-gray-400">
            物理:<span className="text-orange-600 ml-0.5">DEF</span>
            　魔法:<span className="text-purple-600 ml-0.5">M-DEF</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// 火力モード: 行コンポーネント
// ────────────────────────────────────────────
function FireMonsterRow({
  result,
  t,
  lang,
}: {
  result: FireResult;
  t: TFunction;
  lang: string;
}) {
  const rowBg = result.isMagicImmune
    ? "bg-gray-50 border-gray-200"
    : result.canOneShot
    ? "bg-green-50 border-green-200"
    : "bg-white border-gray-100";

  return (
    <tr className={`border-b ${rowBg} text-sm`}>
      <td className="px-2 py-1.5 font-medium text-gray-800 whitespace-nowrap">
        {getMonsterDisplayName(result.base, lang)}
        {result.isMagicImmune && (
          <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-xs font-bold bg-gray-200 text-gray-600">
            {t("magicImmune")}
          </span>
        )}
      </td>
      <td className="px-2 py-1.5 text-right text-sm font-medium text-gray-700 whitespace-nowrap">
        {result.rankStat.toLocaleString()}
      </td>
      <td className="px-2 py-1.5 text-right text-sm text-gray-600 whitespace-nowrap">
        {result.scaledHp.toLocaleString()}
      </td>
      <td className="px-2 py-1.5 text-right whitespace-nowrap">
        {result.isMagicImmune ? (
          <span className="text-gray-400 text-xs">—</span>
        ) : result.playerDamageMin !== null ? (
          <span className="text-sm text-gray-700">
            {formatHitCount(result.playerDamageMin, lang)}~
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center whitespace-nowrap">
        {result.isMagicImmune ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-600 border border-gray-300">
            {t("magicImmune")}
          </span>
        ) : result.canOneShot ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            {t("oneShot")}
          </span>
        ) : (
          <span className="text-orange-500 font-bold">✗</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-right whitespace-nowrap">
        {result.hitRate !== null ? (
          <span
            className={`text-sm font-medium ${
              result.hitRate === 100
                ? "text-emerald-600"
                : result.hitRate < 50
                ? "text-red-500"
                : "text-gray-700"
            }`}
          >
            {result.hitRate}%
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────
// 火力モード: テーブルヘッダー
// ────────────────────────────────────────────
function FireTableHeader({
  floor,
  rankHeader,
  t,
}: {
  floor: number;
  rankHeader: string;
  t: TFunction;
}) {
  return (
    <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
      <th className="px-2 py-2 text-left font-medium">{t("tableHeaders.monster")}</th>
      <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
        {rankHeader}({floor.toLocaleString()}F)
      </th>
      <th className="px-2 py-2 text-right font-medium whitespace-nowrap">HP</th>
      <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
        {t("tableHeaders.attackDmg")}
      </th>
      <th className="px-2 py-2 text-center font-medium whitespace-nowrap">
        {t("oneShot")}
      </th>
      <th className="px-2 py-2 text-right font-medium whitespace-nowrap">
        {t("tableHeaders.hitRate")}
      </th>
    </tr>
  );
}

// ────────────────────────────────────────────
// 火力モード: テーブルセクション
// ────────────────────────────────────────────
function FireSection({
  title,
  results,
  floor,
  rankHeader,
  t,
  lang,
}: {
  title: string;
  results: FireResult[];
  floor: number;
  rankHeader: string;
  t: TFunction;
  lang: string;
}) {
  if (results.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl shadow shadow-gray-200/50 overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <FireTableHeader floor={floor} rankHeader={rankHeader} t={t} />
          </thead>
          <tbody>
            {results.map((result) => (
              <FireMonsterRow key={result.base.name} result={result} t={t} lang={lang} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────
export function SkyCorridorCalculator() {
  const { t, i18n } = useTranslation("skyCorridor");

  // 表示モード
  const [viewMode, setViewMode] = usePersistedState<ViewMode>("skyCorridor:viewMode", "endurance");
  const [playerAttackMode, setPlayerAttackMode] = usePersistedState<PlayerAttackMode>("skyCorridor:attackMode", "physical");

  // ステータス入力（手動）
  const [myDef, setMyDef] = usePersistedState("skyCorridor:def", "");
  const [myMdef, setMyMdef] = usePersistedState("skyCorridor:mdef", "");
  const [myVit, setMyVit] = usePersistedState("skyCorridor:vit", "");
  const [myLuk, setMyLuk] = usePersistedState("skyCorridor:luk", "");
  const [myAtk, setMyAtk] = usePersistedState("skyCorridor:atk", "");
  const [myInt, setMyInt] = usePersistedState("skyCorridor:int", "");
  const [mySpd, setMySpd] = usePersistedState("skyCorridor:spd", "");
  const [syncWithDmg, setSyncWithDmg] = usePersistedState("skyCorridor:sync", false);
  const [syncMode, setSyncMode] = usePersistedState<"manual" | "sim">("skyCorridor:syncMode", "manual");

  // ダメ計からの同期用
  const [dmgDef] = usePersistedState("dmg:def", "");
  const [dmgMdef] = usePersistedState("dmg:mdef", "");
  const [dmgVit] = usePersistedState("dmg:vit", "");
  const [dmgLuck] = usePersistedState("dmg:luck", "");
  const [dmgAtk] = usePersistedState("dmg:atk", "");
  const [dmgInt] = usePersistedState("dmg:int", "");
  const [dmgSpd] = usePersistedState("dmg:spd", "");
  const [simCfg] = useSharedSimConfig();
  const simResult = useMemo(() => calcStatus(simCfg), [simCfg]);

  const [skyFloor, setSkyFloor] = usePersistedState("skyCorridor:floor", "1");
  const [selectedSimPresetId, setSelectedSimPresetId] = useState("");
  const { presets: simPresets, loadPreset: loadSimPreset } = useSimPresets();

  // 有効ステータス（同期 or 手動）
  const effectiveDef = syncWithDmg
    ? syncMode === "sim" ? simResult.final.def : parseInt(dmgDef) || 0
    : parseInt(myDef) || 0;
  const effectiveMdef = syncWithDmg
    ? syncMode === "sim" ? simResult.final.mdef : parseInt(dmgMdef) || 0
    : parseInt(myMdef) || 0;
  const effectiveVit = syncWithDmg
    ? syncMode === "sim" ? simResult.final.vit : parseInt(dmgVit) || 0
    : parseInt(myVit) || 0;
  const effectiveLuk = syncWithDmg
    ? syncMode === "sim" ? simResult.final.luck : parseInt(dmgLuck) || 0
    : parseInt(myLuk) || 0;
  const effectiveAtk = syncWithDmg
    ? syncMode === "sim" ? simResult.final.atk : parseInt(dmgAtk) || 0
    : parseInt(myAtk) || 0;
  const effectiveInt = syncWithDmg
    ? syncMode === "sim" ? simResult.final.int : parseInt(dmgInt) || 0
    : parseInt(myInt) || 0;
  const effectiveSpd = syncWithDmg
    ? syncMode === "sim" ? simResult.final.spd : parseInt(dmgSpd) || 0
    : parseInt(mySpd) || 0;

  const playerHp = effectiveVit > 0 ? effectiveVit * 18 + 100 : 0;

  const handleLoadSimPreset = (id: string) => {
    const simPreset = loadSimPreset(id);
    if (!simPreset) return;
    const result = calcStatus(simPreset.config);
    setMyDef(String(result.final.def));
    setMyMdef(String(result.final.mdef));
    setMyVit(String(result.final.vit));
    setMyLuk(String(result.final.luck));
    setSyncWithDmg(false);
    setSelectedSimPresetId(id);
  };

  const floorNum = useMemo(
    () => Math.max(1, parseInt(skyFloor.replace(/[^0-9]/g, "")) || 1),
    [skyFloor]
  );

  // ────────────────────────────────────────────
  // 耐久モード計算
  // ────────────────────────────────────────────
  function calcSkyResult(base: MonsterBase): SkyResult {
    const lv = floorToLevel(floorNum);
    const scaled = scaleMonster(base, lv);
    const isPhysical = base.attackType === "物理";
    const enemyStat = isPhysical ? scaled.scaledAtk : scaled.scaledInt;
    const nullifiedNow = canNullifyDamage(enemyStat, effectiveDef, effectiveMdef, isPhysical);
    const maxNullifyFloor = calcMaxNullifyFloor(base, effectiveDef, effectiveMdef);

    const additional = calcAdditionalDefNeeded(enemyStat, effectiveDef, effectiveMdef, isPhysical);
    const requiredDef = effectiveDef + additional.additionalDef;
    const requiredMdef = effectiveMdef + additional.additionalMdef;

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

    let playerDamage: { min: number; max: number } | null = null;
    if (effectiveAtk > 0) {
      const dmg = calcPhysicalDamage(effectiveAtk, scaled.scaledDef, scaled.scaledMdef);
      const multiHit = calcMultiHitCount(effectiveSpd, false);
      playerDamage = { min: dmg.min * multiHit, max: dmg.max * multiHit };
    }

    const attackHitRate = effectiveLuk > 0 ? calcHitRate(effectiveLuk, scaledLuck) : null;

    return {
      base,
      scaled,
      isPhysical,
      enemyStat,
      nullifiedNow,
      maxNullifyFloor,
      requiredDef,
      requiredMdef,
      hitsToSurvive,
      lukEvasionLevel,
      scaledLuck,
      playerDamage,
      attackHitRate,
    };
  }

  // ────────────────────────────────────────────
  // 火力モード計算
  // ────────────────────────────────────────────
  function calcFireResult(base: MonsterBase, rankStat: number): FireResult {
    const lv = floorToLevel(floorNum);
    const scaled = scaleMonster(base, lv);
    const scaledHp = scaled.scaledVit * 18 + 100;
    const scaledLuck = scaled.scaledLuck;
    const isMagicImmune = !!base.magicImmune;

    let playerDamageMin: number | null = null;
    let canOneShot = false;

    if (playerAttackMode === "physical" && effectiveAtk > 0) {
      const dmg = calcPhysicalDamage(effectiveAtk, scaled.scaledDef, scaled.scaledMdef);
      const multiHit = calcMultiHitCount(effectiveSpd, false);
      playerDamageMin = dmg.min * multiHit;
      canOneShot = playerDamageMin >= scaledHp;
    } else if (playerAttackMode === "magic" && effectiveInt > 0 && !isMagicImmune) {
      const dmg = calcPlayerMagicDamage(effectiveInt, 0, 1.0, scaled.scaledDef, scaled.scaledMdef);
      const multiHit = calcMultiHitCount(effectiveSpd, true);
      playerDamageMin = dmg.min * multiHit;
      canOneShot = playerDamageMin >= scaledHp;
    }

    const hitRate = effectiveLuk > 0 ? calcHitRate(effectiveLuk, scaledLuck) : null;

    return { base, scaled, rankStat, scaledHp, playerDamageMin, canOneShot, hitRate, isMagicImmune, scaledLuck };
  }

  // ────────────────────────────────────────────
  // 耐久モード結果 (memoized)
  // ────────────────────────────────────────────
  const physicalResults = useMemo(
    () => SKY_MONSTERS.physical.map(calcSkyResult),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveDef, effectiveMdef, effectiveVit, effectiveLuk, effectiveAtk, effectiveSpd, floorNum, playerHp]
  );

  const magicResults = useMemo(
    () => SKY_MONSTERS.magic.map(calcSkyResult),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveDef, effectiveMdef, effectiveVit, effectiveLuk, effectiveAtk, effectiveSpd, floorNum, playerHp]
  );

  const allResults = [...physicalResults, ...magicResults];
  const nullifiedCount = allResults.filter((r) => r.nullifiedNow).length;

  const overallMaxFloor = useMemo(() => {
    const floors = allResults.map((r) => r.maxNullifyFloor);
    if (floors.some((f) => f === null)) return null;
    const finite = floors.filter((f): f is number => f !== null && f !== Infinity);
    return finite.length === 0 ? Infinity : Math.min(...finite);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physicalResults, magicResults]);

  // ────────────────────────────────────────────
  // 火力モード結果 (memoized)
  // ────────────────────────────────────────────
  const firePhysDefResults = useMemo(
    () => FIRE_MONSTERS.physDef.map((m) => {
      const scaled = scaleMonster(m, floorToLevel(floorNum));
      return calcFireResult(m, scaled.scaledDef);
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveAtk, effectiveInt, effectiveLuk, effectiveSpd, floorNum, playerAttackMode]
  );

  const firePhysLukResults = useMemo(
    () => FIRE_MONSTERS.physLuk.map((m) => {
      const scaled = scaleMonster(m, floorToLevel(floorNum));
      return calcFireResult(m, scaled.scaledLuck);
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveAtk, effectiveInt, effectiveLuk, effectiveSpd, floorNum, playerAttackMode]
  );

  const fireMagMdefResults = useMemo(
    () => FIRE_MONSTERS.magMdef.map((m) => {
      const scaled = scaleMonster(m, floorToLevel(floorNum));
      return calcFireResult(m, scaled.scaledMdef);
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveAtk, effectiveInt, effectiveLuk, effectiveSpd, floorNum, playerAttackMode]
  );

  const fireMagImmuneResults = useMemo(
    () => FIRE_MONSTERS.magImmune.map((m) => {
      const scaled = scaleMonster(m, floorToLevel(floorNum));
      return calcFireResult(m, scaled.scaledMdef);
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveAtk, effectiveInt, effectiveLuk, effectiveSpd, floorNum, playerAttackMode]
  );

  const handleFloorClick = (floor: number) => setSkyFloor(String(floor));

  // ────────────────────────────────────────────
  // ステータス入力フィールド定義
  // ────────────────────────────────────────────
  const statFields = [
    { label: "VIT",                val: effectiveVit,  raw: myVit,  set: setMyVit  },
    { label: "SPD",                val: effectiveSpd,  raw: mySpd,  set: setMySpd  },
    { label: "ATK",                val: effectiveAtk,  raw: myAtk,  set: setMyAtk  },
    { label: "INT",                val: effectiveInt,  raw: myInt,  set: setMyInt  },
    { label: "DEF",                val: effectiveDef,  raw: myDef,  set: setMyDef  },
    { label: "M-DEF",              val: effectiveMdef, raw: myMdef, set: setMyMdef },
    { label: t("lukEvasionLabel"), val: effectiveLuk,  raw: myLuk,  set: setMyLuk  },
  ] as const;

  return (
    <div className="max-w-lg mx-auto space-y-6 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start">
      {/* ───── 左カラム: 入力パネル ───── */}
      <div className="space-y-6 lg:space-y-2">
        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 lg:p-4 space-y-5 lg:space-y-3">

          {/* モード切り替えタブ */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-medium">
            {(["endurance", "attack"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 px-3 py-2 transition-colors ${
                  viewMode === mode
                    ? "bg-indigo-500 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t(`modeTabs.${mode}`)}
              </button>
            ))}
          </div>

          {/* 火力モード: 攻撃タイプ選択 */}
          {viewMode === "attack" && (
            <div className="flex rounded-lg overflow-hidden border border-indigo-200 text-xs font-medium">
              {(["physical", "magic"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPlayerAttackMode(mode)}
                  className={`flex-1 px-3 py-1.5 transition-colors ${
                    playerAttackMode === mode
                      ? "bg-indigo-500 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {t(`playerAttackMode.${mode}`)}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-500 text-sm">{t("common:self")}</span>
            </div>
            <h3 className="font-semibold text-gray-800">{t("common:myStatus")}</h3>
          </div>

          {/* プリセット読み込み */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500">
              {t("presetLoad")}
            </label>
            <div className="flex gap-1.5">
              <select
                value={selectedSimPresetId}
                onChange={(e) => setSelectedSimPresetId(e.target.value)}
                className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700"
              >
                <option value="">{t("common:select")}</option>
                {simPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleLoadSimPreset(selectedSimPresetId)}
                disabled={!selectedSimPresetId}
                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-100 text-indigo-600 font-medium disabled:opacity-40 hover:bg-indigo-200 transition-colors"
              >
                {t("common:load")}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ステータス入力 */}
          <div className="grid grid-cols-2 gap-4 lg:gap-2">
            {statFields.map(({ label, val, raw, set }) =>
              syncWithDmg ? (
                <div key={label} className="space-y-1.5 lg:space-y-1">
                  <label className="block text-sm lg:text-xs font-medium text-gray-400">{label}</label>
                  <div className="w-full px-4 py-3 lg:py-2 bg-gray-50 border border-gray-200 rounded-xl text-lg lg:text-base font-medium text-gray-400">
                    {val > 0 ? val.toLocaleString() : "—"}
                  </div>
                </div>
              ) : (
                <InputField key={label} label={label} value={raw} onChange={set} />
              )
            )}
          </div>

          {/* ダメ計と同期トグル */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-600">{t("syncWithDmg")}</span>
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
            <span className={`text-xs font-medium ${syncWithDmg ? "text-indigo-600" : "text-gray-400"}`}>
              {syncWithDmg ? t("on") : t("off")}
            </span>
            {syncWithDmg && (
              <div className="flex rounded-lg overflow-hidden border border-indigo-200 text-xs">
                {(["manual", "sim"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSyncMode(mode)}
                    className={`px-2 py-1 font-medium transition-colors ${
                      syncMode === mode
                        ? "bg-indigo-500 text-white"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {mode === "manual" ? t("syncModeManual") : t("syncModeSim")}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* フロア入力 */}
          <div className="space-y-1.5">
            <label className="block text-sm lg:text-xs font-medium text-gray-600">
              {t("displayFloor")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={(() => {
                const n = parseInt(skyFloor, 10);
                return isNaN(n) ? "" : n.toLocaleString();
              })()}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setSkyFloor(raw);
              }}
              onBlur={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                const clamped = Math.max(1, parseInt(raw || "1") || 1);
                setSkyFloor(String(clamped));
              }}
              placeholder="1"
              className="w-full px-4 py-3 lg:py-2 bg-white border border-gray-200 rounded-xl text-lg lg:text-base font-medium text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        {/* サマリー（耐久モード時のみ） */}
        {viewMode === "endurance" && (
          <div className="bg-white rounded-2xl shadow shadow-gray-200/50 p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t("nullifiedMonsters")}</span>
              <span
                className={`text-lg font-bold ${
                  nullifiedCount === allResults.length
                    ? "text-green-600"
                    : nullifiedCount === 0
                    ? "text-red-500"
                    : "text-orange-500"
                }`}
              >
                {nullifiedCount} / {allResults.length}
              </span>
            </div>
            {playerHp > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">HP</span>
                <span className="text-lg font-bold text-gray-700">
                  {playerHp.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t("overallMaxFloor")}</span>
              <span
                className={`text-lg font-bold ${
                  overallMaxFloor === null
                    ? "text-red-500"
                    : overallMaxFloor === Infinity
                    ? "text-emerald-600"
                    : "text-indigo-600"
                }`}
              >
                {overallMaxFloor === null
                  ? t("cannotNullifyExists")
                  : overallMaxFloor === Infinity
                  ? "∞"
                  : `${overallMaxFloor.toLocaleString()}F`}
              </span>
            </div>
            <div className="text-xs text-gray-400 space-y-0.5 pt-1">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                <span className="font-medium text-gray-500">{t("lukEvasionGuide")}</span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600 border border-orange-200">{t("lukLevel.maybe")}</span>
                  {t("enemyLukMultiplier", { n: 3 })}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">{t("lukLevel.mostly")}</span>
                  {t("enemyLukMultiplier", { n: 4 })}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">{t("lukLevel.almost")}</span>
                  {t("enemyLukMultiplier", { n: 5 })}
                </span>
              </div>
              <p>{t("lukEvasionNote")}</p>
            </div>
          </div>
        )}
      </div>

      {/* ───── 右カラム: 結果テーブル ───── */}
      <div className="space-y-3">
        {viewMode === "endurance" ? (
          <>
            <SkySection
              title={t("sectionPhysical")}
              results={physicalResults}
              floor={floorNum}
              onFloorClick={handleFloorClick}
              t={t}
              lang={i18n.language}
            />
            <SkySection
              title={t("sectionMagic")}
              results={magicResults}
              floor={floorNum}
              onFloorClick={handleFloorClick}
              t={t}
              lang={i18n.language}
            />
          </>
        ) : playerAttackMode === "physical" ? (
          <>
            <FireSection
              title={t("sectionPhysDefTop")}
              results={firePhysDefResults}
              floor={floorNum}
              rankHeader={t("fireTableHeaders.def")}
              t={t}
              lang={i18n.language}
            />
            <FireSection
              title={t("sectionPhysLukTop")}
              results={firePhysLukResults}
              floor={floorNum}
              rankHeader={t("fireTableHeaders.luk")}
              t={t}
              lang={i18n.language}
            />
          </>
        ) : (
          <>
            <FireSection
              title={t("sectionMagMdefTop")}
              results={fireMagMdefResults}
              floor={floorNum}
              rankHeader={t("fireTableHeaders.mdef")}
              t={t}
              lang={i18n.language}
            />
            <FireSection
              title={t("sectionMagImmune")}
              results={fireMagImmuneResults}
              floor={floorNum}
              rankHeader={t("fireTableHeaders.mdef")}
              t={t}
              lang={i18n.language}
            />
          </>
        )}
      </div>
    </div>
  );
}
