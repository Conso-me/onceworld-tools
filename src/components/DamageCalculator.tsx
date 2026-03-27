import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { MonsterBase, Element } from "../types/game";
import { usePersistedState } from "../hooks/usePersistedState";
import { useSharedSimConfig } from "../hooks/useSharedSimConfig";
import { useStatPresets } from "../hooks/useStatPresets";
import { calcStatus } from "../utils/statusCalc";
import { SimConfigPanel } from "./SimConfigPanel";
import { scaleMonster } from "../utils/monsterScaling";
import {
  calcPhysicalDamage,
  calcPlayerMagicDamage,
  calcPetMagicDamage,
  calcMultiHitCount,
  calcHitsToKill,
  calcMinAtkToHit,
  calcMinIntToHit,
  calcMinIntToHitMadan,
  calcAtkForKill,
  calcIntForKill,
  calcEffectiveDef,
  calcHitRate,
} from "../utils/damageCalc";
import {
  calcPhysicalDefenseRequirement,
  calcMagicalDefenseRequirement,
  calcDamage as calcDefDamage,
  canNullifyDamage,
  calcAdditionalDefNeeded,
} from "../utils/defenseCalc";
import { getElementAffinity } from "../data/elements";
import { MAGIC_SPELLS } from "../data/magicSpells";
import { enemyPresetGroups, formatPresetLabel } from "../data/enemyPresets";
import { getMonsterByName } from "../data/monsters";
import { useCustomMonsters } from "../hooks/useAllMonsters";
import { InputField } from "./ui/InputField";
import { StatCard } from "./ui/StatCard";
import { ResultRow } from "./ui/ResultRow";
import { ProgressBar } from "./ui/ProgressBar";
import { MonsterSelector } from "./ui/MonsterSelector";
import { EnemyPresetModal } from "./ui/EnemyPresetModal";

type PlayerAttackMode = "物理" | "魔弾" | "魔攻";

export function DamageCalculator() {
  const { t } = useTranslation("damage");
  const customMonsters = useCustomMonsters();
  const allGroups = useMemo(() => {
    if (customMonsters.length === 0) return enemyPresetGroups;
    return [
      ...enemyPresetGroups,
      {
        mapLabel: t("common:custom"),
        label: t("common:custom"),
        presets: customMonsters.map((m) => ({
          monsterName: m.name,
          level: m.level,
          location: t("common:customRegistration"),
        })),
      },
    ];
  }, [customMonsters, t]);

  // モンスター選択
  const [selectedMonster, setSelectedMonster] = useState<MonsterBase | null>(null);
  const [monsterLevel, setMonsterLevel] = useState<number>(1);
  // 魔攻モード時の右パネル切り替え
  const [defPanelTab, setDefPanelTab] = useState<"被ダメ" | "最低INT">("被ダメ");
  // モバイルで「自分のステータス」を折り畳む
  const [myStatusOpen, setMyStatusOpen] = useState(true);

  // 自キャラ ステータス（localStorage永続化）
  const [myAtk, setMyAtk] = usePersistedState("dmg:atk", "");
  const [myInt, setMyInt] = usePersistedState("dmg:int", "");
  const [myDef, setMyDef] = usePersistedState("dmg:def", "");
  const [myMdef, setMyMdef] = usePersistedState("dmg:mdef", "");
  const [mySpd, setMySpd] = usePersistedState("dmg:spd", "");
  const [myVit, setMyVit] = usePersistedState("dmg:vit", "");
  const [myLuck, setMyLuck] = usePersistedState("dmg:luck", "");
  const [myElement, setMyElement] = usePersistedState<Element>("dmg:element", "火");
  const [myAttackMode, setMyAttackMode] = usePersistedState<PlayerAttackMode>("dmg:attackMode", "物理");
  const [analysisBook, setAnalysisBook] = usePersistedState("dmg:analysisBook", "");
  const [analysisAnalysisBook, setAnalysisAnalysisBook] = usePersistedState("dmg:analysisAnalysisBook", "");
  const [crystalCube, setCrystalCube] = usePersistedState("dmg:crystalCube", "");

  const myAtkNum = parseInt(myAtk) || 0;
  const myIntNum = parseInt(myInt) || 0;
  const myDefNum = parseInt(myDef) || 0;
  const myMdefNum = parseInt(myMdef) || 0;
  const mySpdNum = parseInt(mySpd) || 0;
  const myVitNum = parseInt(myVit) || 0;
  const myLuckNum = parseInt(myLuck) || 0;
  const playerHp = myVitNum > 0 ? myVitNum * 18 + 100 : 0;
  const analysisBookNum = parseInt(analysisBook) || 0;
  const analysisAnalysisBookNum = parseInt(analysisAnalysisBook) || 0;
  const crystalCubeNum = Math.min(parseInt(crystalCube) || 0, 1000);

  const magicBaseInt = analysisBookNum * (1 + analysisAnalysisBookNum * 0.1);
  const crystalCubeMult = 1 + crystalCubeNum * 0.01;

  // 装備設定モード
  const [statMode, setStatMode] = usePersistedState<"manual" | "sim">("dmg:statMode", "manual");
  const [simCfg, setSimField, resetSim, replaceAllSim] = useSharedSimConfig();
  const simResult = useMemo(() => calcStatus(simCfg), [simCfg]);

  // 実効ステータス（モードによって切り替え）
  const effAtk     = statMode === "sim" ? simResult.final.atk  : myAtkNum;
  const effInt     = statMode === "sim" ? simResult.final.int  : myIntNum;
  const effDef     = statMode === "sim" ? simResult.final.def  : myDefNum;
  const effMdef    = statMode === "sim" ? simResult.final.mdef : myMdefNum;
  const effSpd     = statMode === "sim" ? simResult.final.spd  : mySpdNum;
  const effLuck    = statMode === "sim" ? simResult.final.luck : myLuckNum;
  const effElement: Element = statMode === "sim" ? simCfg.charElement : myElement;
  const effPlayerHp = statMode === "sim" ? simResult.hp : playerHp;

  // プリセット
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const { presets, savePreset, loadPreset, deletePreset } = useStatPresets();

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const name = presetName.trim();
    const existing = presets.find((p) => p.name === name);
    if (existing && !window.confirm(t("common:overwriteConfirm", { name }))) return;
    savePreset(name, {
      atk: myAtk,
      int: myInt,
      def: myDef,
      mdef: myMdef,
      spd: mySpd,
      vit: myVit,
      luck: myLuck,
      element: myElement,
      attackMode: myAttackMode,
      analysisBook,
      analysisAnalysisBook,
      crystalCube,
    });
  }, [presetName, presets, savePreset, myAtk, myInt, myDef, myMdef, mySpd, myVit, myLuck, myElement, myAttackMode, analysisBook, analysisAnalysisBook, crystalCube, t]);

  const handleLoadPreset = useCallback(() => {
    const preset = loadPreset(selectedPresetId);
    if (!preset) return;
    setMyAtk(preset.atk);
    setMyInt(preset.int);
    setMyDef(preset.def);
    setMyMdef(preset.mdef);
    setMySpd(preset.spd);
    setMyVit(preset.vit || "");
    setMyLuck(preset.luck || "");
    setMyElement(preset.element);
    setMyAttackMode(preset.attackMode);
    setAnalysisBook(preset.analysisBook);
    setAnalysisAnalysisBook(preset.analysisAnalysisBook);
    setCrystalCube(preset.crystalCube ?? "");
  }, [selectedPresetId, loadPreset, setMyAtk, setMyInt, setMyDef, setMyMdef, setMySpd, setMyVit, setMyLuck, setMyElement, setMyAttackMode, setAnalysisBook, setAnalysisAnalysisBook, setCrystalCube]);

  const handleDeletePreset = useCallback(() => {
    deletePreset(selectedPresetId);
    setSelectedPresetId("");
  }, [selectedPresetId, deletePreset]);

  const handleMonsterSelect = useCallback(
    (monster: MonsterBase, level: number) => {
      setSelectedMonster(monster);
      setMonsterLevel(level);
    },
    []
  );

  // 敵プリセット
  const [injectedLevel, setInjectedLevel] = useState<number | undefined>(undefined);
  const [injectedMonsterName, setInjectedMonsterName] = useState<string | undefined>(undefined);
  const [enemyModalOpen, setEnemyModalOpen] = useState(false);
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string | null>(null);
  const [presetVersion, setPresetVersion] = useState(0);

  const handleEnemyPresetSelect = useCallback((groupIdx: number, presetIdx: number) => {
    const preset = allGroups[groupIdx]?.presets[presetIdx];
    if (!preset) return;

    setSelectedPresetLabel(formatPresetLabel(preset));
    setPresetVersion((v) => v + 1);
    setInjectedLevel(preset.level);

    if (preset.monsterName) {
      const monster = getMonsterByName(preset.monsterName);
      if (monster) {
        setInjectedMonsterName(preset.monsterName);
        handleMonsterSelect(monster, preset.level);
      } else {
        // モンスターDBにない場合はレベルのみ注入
        setInjectedMonsterName(preset.monsterName);
      }
    } else {
      // 名称不明: レベルのみ設定、モンスター種別は手動選択
      setInjectedMonsterName(undefined);
    }
  }, [allGroups, handleMonsterSelect]);

  // レベルスケーリングされた敵ステータス
  const scaled = useMemo(() => {
    if (!selectedMonster) return null;
    return scaleMonster(selectedMonster, monsterLevel);
  }, [selectedMonster, monsterLevel]);

  // 属性倍率
  const selfToEnemyAffinity = useMemo(() => {
    if (!selectedMonster) return 1;
    return getElementAffinity(effElement, selectedMonster.element);
  }, [effElement, selectedMonster]);

  const enemyToSelfAffinity = useMemo(() => {
    if (!selectedMonster) return 1;
    return getElementAffinity(selectedMonster.element, effElement);
  }, [effElement, selectedMonster]);

  // ===== 与ダメージ計算 =====
  const offensiveResult = useMemo(() => {
    if (!scaled) return null;

    const multiHit = calcMultiHitCount(effSpd, myAttackMode === "魔攻");

    if (myAttackMode === "魔攻") {
      // 全魔法の結果を計算
      const spellResults = MAGIC_SPELLS.map((spell) => {
        const effectiveMult = spell.multiplier * crystalCubeMult;
        const dmg = calcPlayerMagicDamage(
          effInt,
          magicBaseInt,
          effectiveMult,
          scaled.scaledDef,
          scaled.scaledMdef,
          selfToEnemyAffinity
        );
        const hitsToKill = calcHitsToKill(scaled.hp, dmg.isNullified ? 1 : dmg.min, spell.hits);
        const totalMin = dmg.isNullified ? spell.hits : dmg.min * spell.hits;
        const totalMax = dmg.isNullified ? 9 * spell.hits : dmg.max * spell.hits;
        const totalCritMin = dmg.isNullified ? spell.hits : dmg.critMin * spell.hits;
        const totalCritMax = dmg.isNullified ? 9 * spell.hits : dmg.critMax * spell.hits;
        const minStat = calcMinIntToHit(
          scaled.scaledDef,
          scaled.scaledMdef,
          effectiveMult,
          magicBaseInt
        );
        // N回確殺: hits>1の魔法はN回の使用でN*hits回ヒット
        const targetStats = [1, 2, 3].map((n) =>
          calcIntForKill(
            scaled.hp,
            scaled.scaledDef,
            scaled.scaledMdef,
            selfToEnemyAffinity,
            effectiveMult,
            magicBaseInt,
            n * spell.hits
          )
        );
        return { spell, dmg, totalMin, totalMax, totalCritMin, totalCritMax, hitsToKill, minStat, targetStats };
      });
      return { mode: "魔攻" as const, spellResults };
    }

    let dmg;
    if (myAttackMode === "物理") {
      dmg = calcPhysicalDamage(
        effAtk,
        scaled.scaledDef,
        scaled.scaledMdef,
        selfToEnemyAffinity
      );
    } else {
      // 魔弾
      dmg = calcPetMagicDamage(
        effInt,
        scaled.scaledDef,
        scaled.scaledMdef,
        selfToEnemyAffinity
      );
    }

    const hitsToKill = calcHitsToKill(scaled.hp, dmg.min, multiHit);

    // 最低必要ステータス
    let minStat: number;
    if (myAttackMode === "物理") {
      minStat = calcMinAtkToHit(scaled.scaledDef, scaled.scaledMdef);
    } else {
      minStat = calcMinIntToHitMadan(scaled.scaledDef, scaled.scaledMdef);
    }

    // N回確殺用ステータス（1〜3回分）
    const targetStats = [1, 2, 3].map((n) => {
      if (myAttackMode === "物理") {
        return calcAtkForKill(
          scaled.hp,
          scaled.scaledDef,
          scaled.scaledMdef,
          selfToEnemyAffinity,
          multiHit,
          n
        );
      } else {
        // 魔弾
        const effectiveDef = calcEffectiveDef(
          scaled.scaledDef,
          scaled.scaledMdef,
          false
        );
        const requiredDmgPerTurn = Math.ceil(scaled.hp / n);
        const requiredBase =
          requiredDmgPerTurn / 4 / selfToEnemyAffinity / 0.9 / multiHit;
        return Math.max(Math.ceil((requiredBase + effectiveDef) / 1.75), 0);
      }
    });

    const hitRate = myAttackMode === "物理"
      ? calcHitRate(effLuck, scaled.scaledLuck)
      : null;

    return { mode: myAttackMode as "物理" | "魔弾", dmg, multiHit, hitsToKill, minStat, targetStats, hitRate };
  }, [
    scaled,
    effAtk,
    effInt,
    effSpd,
    effLuck,
    myAttackMode,
    selfToEnemyAffinity,
    magicBaseInt,
  ]);

  // ===== 被ダメージ計算 =====
  const defensiveResult = useMemo(() => {
    if (!scaled) return null;

    const enemyIsPhysical = scaled.attackType === "物理";
    const enemyStat = enemyIsPhysical ? scaled.scaledAtk : scaled.scaledInt;
    if (enemyStat <= 0) return null;

    // 被ダメ無効化ライン
    const defReq = enemyIsPhysical
      ? calcPhysicalDefenseRequirement(enemyStat)
      : calcMagicalDefenseRequirement(enemyStat);

    // 現在の被ダメ
    const currentDmg = calcDefDamage(
      enemyStat,
      effDef,
      effMdef,
      enemyIsPhysical,
      enemyToSelfAffinity
    );

    const nullified = canNullifyDamage(
      enemyStat,
      effDef,
      effMdef,
      enemyIsPhysical
    );

    const enemyMultiHit = calcMultiHitCount(
      scaled.scaledSpd,
      scaled.attackType === "魔攻"
    );

    const hitsToTake = effPlayerHp > 0
      ? {
          worst: Math.ceil(effPlayerHp / Math.max(currentDmg.max * enemyMultiHit, 1)),
          best: Math.floor(effPlayerHp / Math.max(currentDmg.min * enemyMultiHit, 1)),
        }
      : null;

    const additionalNeeded = calcAdditionalDefNeeded(enemyStat, effDef, effMdef, enemyIsPhysical);

    return {
      defReq,
      currentDmg,
      nullified,
      enemyIsPhysical,
      enemyStat,
      enemyMultiHit,
      hitsToTake,
      additionalNeeded,
    };
  }, [scaled, effDef, effMdef, enemyToSelfAffinity, effPlayerHp]);

  const hasMonster = !!scaled;
  const hasMyOffenseStats =
    (myAttackMode === "物理" ? effAtk > 0 : effInt > 0) && hasMonster;
  const hasMyDefenseStats = (effDef > 0 || effMdef > 0) && hasMonster;

  const elements: Element[] = ["火", "水", "木", "光", "闇"];
  const attackModes: { value: PlayerAttackMode; label: string }[] = [
    { value: "物理", label: t("game:attackLabel.physical") },
    { value: "魔攻", label: t("game:attackLabel.magic") },
  ];

  const elementColors: Record<Element, string> = {
    火: "bg-red-100 text-red-600 border-red-200",
    水: "bg-blue-100 text-blue-600 border-blue-200",
    木: "bg-green-100 text-green-600 border-green-200",
    光: "bg-yellow-100 text-yellow-700 border-yellow-200",
    闇: "bg-purple-100 text-purple-600 border-purple-200",
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start">
      {/* Column 1: 入力パネル */}
      <div className="space-y-6 lg:space-y-2">
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 lg:p-4 space-y-6 lg:space-y-3">
        {/* 敵プリセット */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-500">{t("enemyPreset")}</label>
          <button
            onClick={() => setEnemyModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <span className={selectedPresetLabel ? "text-gray-800 truncate" : "text-gray-400"}>
              {selectedPresetLabel ?? t("common:selectPreset")}
            </span>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <EnemyPresetModal
            isOpen={enemyModalOpen}
            groups={allGroups}
            onClose={() => setEnemyModalOpen(false)}
            onSelect={handleEnemyPresetSelect}
          />
        </div>

        <MonsterSelector
          onSelect={handleMonsterSelect}
          onMonsterPick={() => setSelectedPresetLabel(null)}
          selectedMonster={selectedMonster}
          externalLevel={injectedLevel}
          externalMonsterName={injectedMonsterName}
          presetVersion={presetVersion}
        />

        <div className="border-t border-gray-100" />

        {/* 自分のステータス */}
        <div className="space-y-4 lg:space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-500 text-sm">{t("common:self")}</span>
            </div>
            <h3 className="font-semibold text-gray-800">{t("common:myStatus")}</h3>
            <div className="ml-auto flex items-center gap-1.5">
              {statMode === "manual" && (
                <button
                  onClick={() => setPresetModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <span>
                    {selectedPresetId
                      ? presets.find((p) => p.id === selectedPresetId)?.name ?? t("common:preset")
                      : t("common:preset")}
                  </span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setMyStatusOpen((v) => !v)}
                className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label={myStatusOpen ? "折り畳む" : "展開する"}
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${myStatusOpen ? "" : "rotate-180"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* 折り畳みコンテンツ（モバイルのみ）*/}
          <div className={myStatusOpen ? "" : "hidden lg:block"}>

          {/* 手動入力 / 装備設定 トグル */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            {(["manual", "sim"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatMode(mode)}
                className={`flex-1 py-2 lg:py-1.5 font-medium transition-colors ${
                  statMode === mode
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {mode === "manual" ? t("statModeManual") : t("statModeSim")}
              </button>
            ))}
          </div>

          {/* 属性・攻撃方法 */}
          <div className="space-y-3">
            {statMode === "manual" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-600">
                  {t("heroElement")}
                </label>
                <div className="flex gap-1.5">
                  {elements.map((el) => (
                    <button
                      key={el}
                      onClick={() => setMyElement(el)}
                      className={`flex-1 py-2.5 lg:py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        myElement === el
                          ? elementColors[el]
                          : "bg-gray-50 text-gray-400 border-gray-200"
                      }`}
                    >
                      {t(`game:element.${el}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600">
                {t("attackMethod")}
              </label>
              <div className="flex gap-1.5">
                {attackModes.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setMyAttackMode(mode.value)}
                    className={`flex-1 py-2.5 lg:py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      myAttackMode === mode.value
                        ? "bg-indigo-100 text-indigo-600 border-indigo-200"
                        : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 装備設定モード: SimConfigPanel */}
          {statMode === "sim" && (
            <SimConfigPanel
              cfg={simCfg}
              setField={setSimField}
              reset={resetSim}
              replaceAll={replaceAllSim}
            />
          )}

          {/* ステータス入力（手動モードのみ） */}
          {statMode === "manual" && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-2">
              <InputField label="ATK" value={myAtk} onChange={setMyAtk} />
              <InputField label="INT" value={myInt} onChange={setMyInt} />
              <InputField label="LUK" value={myLuck} onChange={setMyLuck} />
              <InputField label="DEF" value={myDef} onChange={setMyDef} />
              <InputField label="M-DEF" value={myMdef} onChange={setMyMdef} />
              <InputField label="VIT" value={myVit} onChange={setMyVit} />
              <InputField label="SPD" value={mySpd} onChange={setMySpd} />
            </div>
          )}

          {/* 魔法設定（魔攻モード時のみ） */}
          {myAttackMode === "魔攻" && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <InputField
                label={t("analysisBook")}
                value={analysisBook}
                onChange={setAnalysisBook}
                max={1000}
              />
              <InputField
                label={t("analysisAnalysisBook")}
                value={analysisAnalysisBook}
                onChange={setAnalysisAnalysisBook}
                max={1000}
              />
              {/* 魔晶立方体: 実装確認中のため一時非表示
              <InputField
                label={t("crystalCube")}
                value={crystalCube}
                onChange={setCrystalCube}
                max={1000}
              />
              */}
            </div>
          )}

          </div>{/* /折り畳みコンテンツ */}
        </div>
      </div>

      {/* 計算式 */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 transition-colors list-none flex items-center gap-1">
          <svg
            className="w-4 h-4 transition-transform group-open:rotate-90"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          {t("showFormula")}
        </summary>
        <div className="mt-3 p-4 bg-gray-50 rounded-2xl text-xs text-gray-500 space-y-1 font-mono">
          <p>{t("formulaPhysical")}</p>
          <p>{t("formulaMagic")}</p>
          <p className="pt-2 text-gray-400">{t("formulaNote1")}</p>
          <p className="text-gray-400">{t("formulaNote2")}</p>
          <p className="text-gray-400">{t("formulaNote3")}</p>
        </div>
      </details>
      </div>{/* /Column 1 */}

      {/* ===== 右エリア: 敵ステータス + 与ダメ/被ダメ ===== */}
      <div className="space-y-4 lg:space-y-2">

      {/* 敵ステータス */}
      {scaled && (
        <div className="bg-white rounded-2xl shadow shadow-gray-200/50 p-4">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="font-bold text-base text-gray-800">{scaled.name}</span>
            <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-medium">Lv{monsterLevel.toLocaleString()}</span>
            <span className={`text-sm px-2 py-0.5 rounded-lg border font-medium ${elementColors[scaled.element]}`}>{t(`game:element.${scaled.element}`)}</span>
            <span className="text-sm bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-medium">{t(`game:attackType.${scaled.attackType}`)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">HP</span>
              <span className="text-sm font-semibold text-gray-700">{scaled.hp.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">ATK</span>
              <span className="text-sm font-semibold text-gray-700">{scaled.scaledAtk.toLocaleString()}</span>
              <span className="text-xs text-gray-400">({scaled.atk})</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">INT</span>
              <span className="text-sm font-semibold text-gray-700">{scaled.scaledInt.toLocaleString()}</span>
              <span className="text-xs text-gray-400">({scaled.int})</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">DEF</span>
              <span className="text-sm font-semibold text-gray-700">{scaled.scaledDef.toLocaleString()}</span>
              <span className="text-xs text-gray-400">({scaled.def})</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">M-DEF</span>
              <span className="text-sm font-semibold text-gray-700">{scaled.scaledMdef.toLocaleString()}</span>
              <span className="text-xs text-gray-400">({scaled.mdef})</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">SPD</span>
              <span className="text-sm font-semibold text-gray-700">{scaled.scaledSpd.toLocaleString()}</span>
              <span className="text-xs text-gray-400">({scaled.spd})</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">LUCK</span>
              <span className="text-sm font-semibold text-gray-700">{scaled.scaledLuck.toLocaleString()}</span>
              <span className="text-xs text-gray-400">({scaled.luck})</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">EXP</span>
              <span className="text-sm font-semibold text-gray-700">
                {(Math.max(Math.floor(Math.pow(monsterLevel, 1.1) * 0.2), 1) * scaled.exp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 与ダメ・被ダメ 2カラム */}
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-2 gap-4">

      {/* 与ダメージ */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-700 px-1">{t("offensiveDamage")}</h3>

        {hasMonster && offensiveResult ? (<>

          {offensiveResult.mode === "魔攻" ? (
            /* ===== 魔攻モード: 全魔法テーブル ===== */
            <>
              <StatCard
                title={t("magicAttack") + " → " + scaled!.name + " Lv" + monsterLevel}
                accent="green"
              >
                {/* 属性アフィニティ表示 */}
                <div className="flex items-center gap-1.5 text-xs mb-2 pb-2 border-b border-gray-100">
                  <span className={`px-1.5 py-0.5 rounded border font-medium ${elementColors[effElement]}`}>{t(`game:element.${effElement}`)}</span>
                  <span className="text-gray-400">→</span>
                  <span className={`px-1.5 py-0.5 rounded border font-medium ${elementColors[scaled!.element]}`}>{t(`game:element.${scaled!.element}`)}</span>
                  <span className={`font-semibold ${selfToEnemyAffinity > 1 ? "text-green-600" : selfToEnemyAffinity < 1 ? "text-red-500" : "text-gray-500"}`}>
                    {selfToEnemyAffinity > 1 ? `${t("weakness")} ×1.2` : selfToEnemyAffinity < 1 ? `${t("resistance")} ×0.8` : `${t("normal")} ×1.0`}
                  </span>
                </div>
                {hasMyOffenseStats ? (
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-y-1.5 gap-x-1">
                    {offensiveResult.spellResults.map(({ spell, dmg, totalMin, totalMax, totalCritMin, totalCritMax, hitsToKill }) => (
                      <div key={spell.name} className="col-span-7 grid grid-cols-subgrid bg-white/60 rounded-lg py-1.5">
                        <div className="col-span-7 flex items-center gap-1 mb-1 px-2">
                          <span className={`text-xs px-1 py-0.5 rounded border font-medium ${elementColors[spell.element]}`}>{t(`game:element.${spell.element}`)}</span>
                          <span className="text-sm font-medium text-gray-700">{spell.name}</span>
                          <span className="text-xs text-gray-400">
                            ×{spell.multiplier}{spell.hits > 1 ? ` / ${spell.hits}${t("hits")}` : ""}
                          </span>
                          {!dmg.isNullified && (
                            <span className={`ml-auto text-sm font-bold px-2 py-0.5 rounded-full ${
                              hitsToKill === 1 ? "bg-green-100 text-green-700" :
                              hitsToKill <= 3 ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {hitsToKill === Infinity ? "∞" : `${hitsToKill}${t("common:times")}`}
                            </span>
                          )}
                        </div>
                        {dmg.isNullified ? (
                          <span className="col-span-7 text-xs text-gray-400 px-2">{t("cannotPenetrate")}</span>
                        ) : (
                          <>
                            <span className="pl-2 text-sm font-bold text-green-600 tabular-nums text-right self-center">{totalMin.toLocaleString()}</span>
                            <span className="text-sm text-green-600 text-center self-center">〜</span>
                            <span className="text-sm font-bold text-green-600 tabular-nums text-right self-center">{totalMax.toLocaleString()}</span>
                            <span className="px-1 text-xs text-yellow-600 text-center self-center">{t("critShort")}</span>
                            <span className="text-xs text-yellow-600 tabular-nums text-right self-center">{totalCritMin.toLocaleString()}</span>
                            <span className="text-xs text-yellow-600 text-center self-center">〜</span>
                            <span className="pr-2 text-xs text-yellow-600 tabular-nums text-right self-center">{totalCritMax.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">{t("enterIntForDamage")}</p>
                )}
              </StatCard>
            </>
          ) : (
            /* ===== 物理 / 魔弾モード ===== */
            <>
              <StatCard
                title={`${offensiveResult.mode === "物理" ? t("physicalAttack") : t("magicBulletAttack")} → ${scaled!.name} Lv${monsterLevel}`}
                accent="green"
              >
                <div className="space-y-2">
                  {hasMyOffenseStats && (
                    <>
                      <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                        <span className="text-sm text-gray-500">{t("damage")}</span>
                        {offensiveResult.dmg.isNullified ? (
                          <span className="text-sm text-gray-400">
                            {t("nullified")}
                          </span>
                        ) : (
                          <span className="text-lg font-bold text-green-600">
                            {offensiveResult.dmg.min.toLocaleString()} 〜{" "}
                            {offensiveResult.dmg.max.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {!offensiveResult.dmg.isNullified && (
                        <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                          <span className="text-sm text-gray-500">
                            {t("critical")}
                          </span>
                          <span className="text-lg font-bold text-yellow-600">
                            {offensiveResult.dmg.critMin.toLocaleString()} 〜{" "}
                            {offensiveResult.dmg.critMax.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                        <span className="text-sm text-gray-500">{t("multiHit")}</span>
                        <span className="font-bold text-gray-700">
                          {offensiveResult.multiHit}{t("common:times")}
                        </span>
                      </div>
                      {!offensiveResult.dmg.isNullified && (
                        <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                          <span className="text-sm text-gray-500">
                            {t("hitsToKill")}
                          </span>
                          <span className="font-bold text-gray-700">
                            {offensiveResult.hitsToKill === Infinity
                              ? "∞"
                              : `${offensiveResult.hitsToKill}${t("common:times")}`}
                          </span>
                        </div>
                      )}
                      {offensiveResult.hitRate !== null && effLuck > 0 && (
                        <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                          <span className="text-sm text-gray-500">{t("hitRate")}</span>
                          <span className={`font-bold ${offensiveResult.hitRate >= 80 ? "text-green-600" : offensiveResult.hitRate < 20 ? "text-red-500" : "text-yellow-600"}`}>
                            {offensiveResult.hitRate}%
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </StatCard>

              {/* 最低必要ステータス */}
              <StatCard title={t("minRequiredStats")} accent="purple">
                <div className="space-y-2">
                  <ResultRow
                    label={t("minStat", { stat: offensiveResult.mode === "物理" ? "ATK" : "INT" })}
                    value={offensiveResult.minStat}
                    current={offensiveResult.mode === "物理" ? effAtk : effInt}
                    color="purple"
                  />
                  {offensiveResult.targetStats.map((stat, i) => (
                    <ResultRow
                      key={i}
                      label={t("nHitsKill", { n: i + 1, stat: offensiveResult.mode === "物理" ? "ATK" : "INT" })}
                      value={stat}
                      current={offensiveResult.mode === "物理" ? effAtk : effInt}
                      color="purple"
                    />
                  ))}
                </div>
              </StatCard>
            </>
          )}
        </>) : (
          <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">{t("selectMonsterOffense")}</p>
          </div>
        )}
      </div>{/* /与ダメージ */}

      {/* 被ダメージ / 最低必要INT（魔攻時切り替え） */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          {myAttackMode === "魔攻" ? (
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(["被ダメ", "最低INT"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDefPanelTab(tab)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    defPanelTab === tab
                      ? "bg-white text-gray-700 shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab === "被ダメ" ? t("defensiveDamageShort") : t("minINTTab")}
                </button>
              ))}
            </div>
          ) : (
            <h3 className="font-semibold text-gray-700">{t("defensiveDamage")}</h3>
          )}
        </div>

        {/* 最低必要INT パネル（魔攻 + 最低INTタブ時） */}
        {myAttackMode === "魔攻" && defPanelTab === "最低INT" && hasMonster && offensiveResult && offensiveResult.mode === "魔攻" && (
          <StatCard title={t("minINTBySpell")} accent="purple">
            <div className="space-y-1.5">
              {offensiveResult.spellResults.map(({ spell, minStat, targetStats }) => (
                <div key={spell.name} className="py-1.5 px-2 bg-white/60 rounded-lg">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-xs px-1 py-0.5 rounded border font-medium ${elementColors[spell.element]}`}>{t(`game:element.${spell.element}`)}</span>
                    <span className="text-xs font-medium text-gray-700">{spell.name}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    {[{ label: t("minLabel"), val: minStat }, { label: t("nKillLabel", { n: 1 }), val: targetStats[0] }, { label: t("nKillLabel", { n: 2 }), val: targetStats[1] }, { label: t("nKillLabel", { n: 3 }), val: targetStats[2] }].map(({ label, val }) => (
                      <div key={label} className="text-center">
                        <div className="text-gray-400">{label}</div>
                        <div className={`font-bold ${val <= effInt ? "text-green-600" : "text-purple-600"}`}>
                          {val.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </StatCard>
        )}

        {/* 被ダメパネル（非魔攻 or 被ダメタブ時） */}
        {(myAttackMode !== "魔攻" || defPanelTab === "被ダメ") && hasMonster && defensiveResult ? (<>
          <StatCard
            title={t("defensePanel.title", { type: defensiveResult.enemyIsPhysical ? t("game:attackLabel.physical") : t("game:attackLabel.magic"), attackType: t(`game:attackType.${scaled!.attackType}`), stat: defensiveResult.enemyIsPhysical ? "ATK" : "INT", value: defensiveResult.enemyStat.toLocaleString() })}
            accent="orange"
          >
            <div className="space-y-2">
              {/* 被ダメ無効化ライン */}
              {hasMyDefenseStats && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>
                      {t("defensePanel.progress", { stat: defensiveResult.enemyIsPhysical ? "DEF" : "M-DEF" })}
                    </span>
                    <span>
                      {(defensiveResult.enemyIsPhysical
                        ? effDef
                        : effMdef
                      ).toLocaleString()}{" "}
                      /{" "}
                      {(defensiveResult.enemyIsPhysical
                        ? defensiveResult.defReq.defOnly
                        : defensiveResult.defReq.mdefOnly
                      ).toLocaleString()}
                    </span>
                  </div>
                  <ProgressBar
                    current={
                      defensiveResult.enemyIsPhysical ? effDef : effMdef
                    }
                    target={
                      defensiveResult.enemyIsPhysical
                        ? defensiveResult.defReq.defOnly
                        : defensiveResult.defReq.mdefOnly
                    }
                    color="orange"
                  />
                </div>
              )}
              {(() => {
                const isPhys = defensiveResult.enemyIsPhysical;
                const rows = [
                  {
                    label: t("defensePanel.nullifyByOnly", { stat: isPhys ? "DEF" : "M-DEF" }),
                    value: isPhys ? defensiveResult.defReq.defOnly : defensiveResult.defReq.mdefOnly,
                    current: hasMyDefenseStats ? (isPhys ? effDef : effMdef) : undefined,
                    hintStat: isPhys ? "M-DEF" : "DEF",
                    hintAmount: isPhys
                      ? `+${defensiveResult.additionalNeeded.additionalMdef.toLocaleString()}`
                      : `+${defensiveResult.additionalNeeded.additionalDef.toLocaleString()}`,
                  },
                  {
                    label: t("defensePanel.nullifyByOnly", { stat: isPhys ? "M-DEF" : "DEF" }),
                    value: isPhys ? defensiveResult.defReq.mdefOnly : defensiveResult.defReq.defOnly,
                    current: hasMyDefenseStats ? (isPhys ? effMdef : effDef) : undefined,
                    hintStat: isPhys ? "DEF" : "M-DEF",
                    hintAmount: isPhys
                      ? `+${defensiveResult.additionalNeeded.additionalDef.toLocaleString()}`
                      : `+${defensiveResult.additionalNeeded.additionalMdef.toLocaleString()}`,
                  },
                ];
                const showHints = hasMyDefenseStats && !defensiveResult.nullified;
                return (
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-0.5">
                    {rows.map(({ label, value, current }) => {
                      const remaining = current !== undefined ? value - current : undefined;
                      const achieved = remaining !== undefined && remaining <= 0;
                      return (
                        <div key={label} className="col-span-4 grid grid-cols-subgrid items-center bg-white/60 rounded-lg py-2 px-3">
                          <span className="text-sm text-gray-500">{label}</span>
                          <span className="text-lg font-bold text-orange-600 text-right tabular-nums">
                            {value.toLocaleString()}
                          </span>
                          {remaining !== undefined ? (
                            <>
                              <span className={`text-xs text-right ${achieved ? "text-green-600" : "text-gray-400"}`}>
                                {achieved ? "" : t("common:remainingLabel")}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full text-right tabular-nums ${achieved ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                                {achieved ? t("common:achieved") : t("common:remaining", { value: remaining.toLocaleString() })}
                              </span>
                            </>
                          ) : <><span /><span /></>}
                        </div>
                      );
                    })}
                    {showHints && (
                      <div className="col-span-4 grid grid-cols-[auto_auto_auto_auto] gap-x-1 gap-y-0 text-xs text-blue-400 pl-3 justify-start">
                        {rows.map(({ hintStat, hintAmount }) => [
                          <span key={`${hintStat}-s`} className="text-right">{hintStat}</span>,
                          <span key={`${hintStat}-m`} className="text-right">{t("defensePanel.supplementWith", { stat: hintStat })}</span>,
                          <span key={`${hintStat}-n`} className="text-right">{hintStat}</span>,
                          <span key={`${hintStat}-v`} className="text-right tabular-nums">{hintAmount}</span>,
                        ])}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </StatCard>

          {/* 現在の被ダメージ */}
          {hasMyDefenseStats && (
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t("defensePanel.currentDamage")}</span>
                {defensiveResult.nullified ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                      1〜9
                    </span>
                    <span className="text-xs text-green-600">{t("defensePanel.nullifyAchieved")}</span>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-500">
                      {defensiveResult.currentDmg.min.toLocaleString()} 〜{" "}
                      {defensiveResult.currentDmg.max.toLocaleString()}
                    </span>
                    {defensiveResult.enemyMultiHit > 1 && (
                      <span className="text-xs text-gray-400 ml-1">
                        ×{defensiveResult.enemyMultiHit}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {effPlayerHp > 0 && (
                <div className="flex items-center justify-between py-1 px-3">
                  <span className="text-xs text-gray-400">{t("defensePanel.selfHp")}</span>
                  <span className="text-xs text-gray-500 tabular-nums">{effPlayerHp.toLocaleString()}</span>
                </div>
              )}
              {defensiveResult.hitsToTake && (() => {
                const { worst, best } = defensiveResult.hitsToTake!;
                const isDanger = worst <= 1;
                const isInstantDeath = best === 0;
                return (
                  <div className={`flex items-center justify-between py-2 px-3 rounded-lg border ${isDanger ? "bg-red-100 border-red-400 animate-pulse" : "bg-white/60 border-gray-100"}`}>
                    <div className={`flex items-center gap-2 ${isDanger ? "text-red-700" : "text-gray-600"}`}>
                      <span className="text-sm font-medium">{isDanger && "💀 "}{t("defensePanel.survivableHits")}</span>
                      {isInstantDeath && <span className="text-xs font-bold text-red-600">{t("defensePanel.oneHitKill")}</span>}
                    </div>
                    <span className={`font-bold ${isDanger ? "text-red-600 text-base" : "text-blue-600"}`}>
                      {worst}〜{best}{t("common:times")}{isDanger && " ⚠️"}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </>) : (
          (myAttackMode !== "魔攻" || defPanelTab === "被ダメ") && (
            <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-400">{t("selectMonsterDefense")}</p>
            </div>
          )
        )}
      </div>{/* /被ダメージ・最低INT */}

      </div>{/* /与ダメ・被ダメ 2カラム */}
      </div>{/* /右エリア */}

      {/* プリセットモーダル */}
      {presetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPresetModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-5 w-80 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{t("presetModal.title")}</h3>
              <button
                onClick={() => setPresetModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 読込・削除 */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">{t("presetModal.loadDelete")}</p>
              <div className="flex gap-1.5">
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700"
                >
                  <option value="">{t("common:select")}</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => { handleLoadPreset(); setPresetModalOpen(false); }}
                  disabled={!selectedPresetId}
                  className="px-3 py-1.5 text-xs rounded-lg bg-indigo-100 text-indigo-600 font-medium disabled:opacity-40 hover:bg-indigo-200 transition-colors"
                >
                  {t("common:load")}
                </button>
                <button
                  onClick={handleDeletePreset}
                  disabled={!selectedPresetId}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-100 text-red-600 font-medium disabled:opacity-40 hover:bg-red-200 transition-colors"
                >
                  {t("common:delete")}
                </button>
              </div>
            </div>

            {/* 保存 */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">{t("presetModal.save")}</p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder={t("common:presetNamePlaceholder")}
                  className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700 placeholder-gray-300"
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className="px-3 py-1.5 text-xs rounded-lg bg-green-100 text-green-600 font-medium disabled:opacity-40 hover:bg-green-200 transition-colors"
                >
                  {t("common:save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
