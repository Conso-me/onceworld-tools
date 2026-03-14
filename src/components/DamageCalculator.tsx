import { useState, useMemo, useCallback } from "react";
import type { MonsterBase, Element } from "../types/game";
import { usePersistedState } from "../hooks/usePersistedState";
import { useStatPresets } from "../hooks/useStatPresets";
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
} from "../utils/damageCalc";
import {
  calcPhysicalDefenseRequirement,
  calcMagicalDefenseRequirement,
  calcDamage as calcDefDamage,
  canNullifyDamage,
} from "../utils/defenseCalc";
import { getElementAffinity, getMagicMultiplier } from "../data/elements";
import { InputField } from "./ui/InputField";
import { StatCard } from "./ui/StatCard";
import { ResultRow } from "./ui/ResultRow";
import { ProgressBar } from "./ui/ProgressBar";
import { MonsterSelector } from "./ui/MonsterSelector";

type PlayerAttackMode = "物理" | "魔弾" | "魔攻";

export function DamageCalculator() {
  // モンスター選択
  const [selectedMonster, setSelectedMonster] = useState<MonsterBase | null>(null);
  const [monsterLevel, setMonsterLevel] = useState<number>(1);

  // 自キャラ ステータス（localStorage永続化）
  const [myAtk, setMyAtk] = usePersistedState("dmg:atk", "");
  const [myInt, setMyInt] = usePersistedState("dmg:int", "");
  const [myDef, setMyDef] = usePersistedState("dmg:def", "");
  const [myMdef, setMyMdef] = usePersistedState("dmg:mdef", "");
  const [mySpd, setMySpd] = usePersistedState("dmg:spd", "");
  const [myElement, setMyElement] = usePersistedState<Element>("dmg:element", "火");
  const [myAttackMode, setMyAttackMode] = usePersistedState<PlayerAttackMode>("dmg:attackMode", "物理");
  const [analysisBook, setAnalysisBook] = usePersistedState("dmg:analysisBook", "");
  const [analysisAnalysisBook, setAnalysisAnalysisBook] = usePersistedState("dmg:analysisAnalysisBook", "");

  // 目標攻撃回数
  const [targetTurns, setTargetTurns] = usePersistedState("dmg:targetTurns", "1");

  const myAtkNum = parseInt(myAtk) || 0;
  const myIntNum = parseInt(myInt) || 0;
  const myDefNum = parseInt(myDef) || 0;
  const myMdefNum = parseInt(myMdef) || 0;
  const mySpdNum = parseInt(mySpd) || 0;
  const targetTurnsNum = parseInt(targetTurns) || 1;
  const analysisBookNum = parseInt(analysisBook) || 0;
  const analysisAnalysisBookNum = parseInt(analysisAnalysisBook) || 0;

  const magicBaseInt = analysisBookNum * (1 + analysisAnalysisBookNum * 0.1);

  // プリセット
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const { presets, savePreset, loadPreset, deletePreset } = useStatPresets();

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const name = presetName.trim();
    const existing = presets.find((p) => p.name === name);
    if (existing && !window.confirm(`"${name}" を上書きしますか？`)) return;
    savePreset(name, {
      atk: myAtk,
      int: myInt,
      def: myDef,
      mdef: myMdef,
      spd: mySpd,
      element: myElement,
      attackMode: myAttackMode,
      targetTurns,
      analysisBook,
      analysisAnalysisBook,
    });
  }, [presetName, presets, savePreset, myAtk, myInt, myDef, myMdef, mySpd, myElement, myAttackMode, targetTurns, analysisBook, analysisAnalysisBook]);

  const handleLoadPreset = useCallback(() => {
    const preset = loadPreset(selectedPresetId);
    if (!preset) return;
    setMyAtk(preset.atk);
    setMyInt(preset.int);
    setMyDef(preset.def);
    setMyMdef(preset.mdef);
    setMySpd(preset.spd);
    setMyElement(preset.element);
    setMyAttackMode(preset.attackMode);
    setTargetTurns(preset.targetTurns);
    setAnalysisBook(preset.analysisBook);
    setAnalysisAnalysisBook(preset.analysisAnalysisBook);
  }, [selectedPresetId, loadPreset, setMyAtk, setMyInt, setMyDef, setMyMdef, setMySpd, setMyElement, setMyAttackMode, setTargetTurns, setAnalysisBook, setAnalysisAnalysisBook]);

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

  // レベルスケーリングされた敵ステータス
  const scaled = useMemo(() => {
    if (!selectedMonster) return null;
    return scaleMonster(selectedMonster, monsterLevel);
  }, [selectedMonster, monsterLevel]);

  // 属性倍率
  const selfToEnemyAffinity = useMemo(() => {
    if (!selectedMonster) return 1;
    return getElementAffinity(myElement, selectedMonster.element);
  }, [myElement, selectedMonster]);

  const enemyToSelfAffinity = useMemo(() => {
    if (!selectedMonster) return 1;
    return getElementAffinity(selectedMonster.element, myElement);
  }, [myElement, selectedMonster]);

  // 魔法倍率
  const magicMult = useMemo(
    () => getMagicMultiplier(myElement),
    [myElement]
  );

  // ===== 与ダメージ計算 =====
  const offensiveResult = useMemo(() => {
    if (!scaled) return null;

    const multiHit = calcMultiHitCount(mySpdNum, myAttackMode === "魔攻");

    let dmg;
    if (myAttackMode === "物理") {
      dmg = calcPhysicalDamage(
        myAtkNum,
        scaled.scaledDef,
        scaled.scaledMdef,
        selfToEnemyAffinity
      );
    } else if (myAttackMode === "魔攻") {
      dmg = calcPlayerMagicDamage(
        myIntNum,
        magicBaseInt,
        magicMult,
        scaled.scaledDef,
        scaled.scaledMdef,
        selfToEnemyAffinity
      );
    } else {
      // 魔弾
      dmg = calcPetMagicDamage(
        myIntNum,
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
    } else if (myAttackMode === "魔攻") {
      minStat = calcMinIntToHit(
        scaled.scaledDef,
        scaled.scaledMdef,
        magicMult,
        magicBaseInt
      );
    } else {
      minStat = calcMinIntToHitMadan(scaled.scaledDef, scaled.scaledMdef);
    }

    // N回撃破用ステータス
    let targetStat: number;
    if (myAttackMode === "物理") {
      targetStat = calcAtkForKill(
        scaled.hp,
        scaled.scaledDef,
        scaled.scaledMdef,
        selfToEnemyAffinity,
        multiHit,
        targetTurnsNum
      );
    } else if (myAttackMode === "魔攻") {
      targetStat = calcIntForKill(
        scaled.hp,
        scaled.scaledDef,
        scaled.scaledMdef,
        selfToEnemyAffinity,
        magicMult,
        magicBaseInt,
        targetTurnsNum
      );
    } else {
      // 魔弾のN回撃破（物理式と同じ構造だがDEF/MDEFが逆）
      const effectiveDef = calcEffectiveDef(
        scaled.scaledDef,
        scaled.scaledMdef,
        false
      );
      const requiredDmgPerTurn = Math.ceil(scaled.hp / targetTurnsNum);
      const requiredBase =
        requiredDmgPerTurn / 4 / selfToEnemyAffinity / 0.9 / multiHit;
      targetStat = Math.max(
        Math.ceil((requiredBase + effectiveDef) / 1.75),
        0
      );
    }

    return { dmg, multiHit, hitsToKill, minStat, targetStat };
  }, [
    scaled,
    myAtkNum,
    myIntNum,
    mySpdNum,
    myAttackMode,
    selfToEnemyAffinity,
    magicMult,
    magicBaseInt,
    targetTurnsNum,
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
      myDefNum,
      myMdefNum,
      enemyIsPhysical,
      enemyToSelfAffinity
    );

    const nullified = canNullifyDamage(
      enemyStat,
      myDefNum,
      myMdefNum,
      enemyIsPhysical
    );

    const enemyMultiHit = calcMultiHitCount(
      scaled.scaledSpd,
      scaled.attackType === "魔攻"
    );

    return {
      defReq,
      currentDmg,
      nullified,
      enemyIsPhysical,
      enemyStat,
      enemyMultiHit,
    };
  }, [scaled, myDefNum, myMdefNum, enemyToSelfAffinity]);

  const hasMonster = !!scaled;
  const hasMyOffenseStats =
    (myAttackMode === "物理" ? myAtkNum > 0 : myIntNum > 0) && hasMonster;
  const hasMyDefenseStats = (myDefNum > 0 || myMdefNum > 0) && hasMonster;

  const elements: Element[] = ["火", "水", "木", "光", "闇"];
  const attackModes: { value: PlayerAttackMode; label: string }[] = [
    { value: "物理", label: "物理" },
    { value: "魔弾", label: "魔弾" },
    { value: "魔攻", label: "魔法" },
  ];

  const elementColors: Record<Element, string> = {
    火: "bg-red-100 text-red-600 border-red-200",
    水: "bg-blue-100 text-blue-600 border-blue-200",
    木: "bg-green-100 text-green-600 border-green-200",
    光: "bg-yellow-100 text-yellow-700 border-yellow-200",
    闇: "bg-purple-100 text-purple-600 border-purple-200",
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr_1fr] lg:gap-4 lg:items-start">
      {/* ヘッダー */}
      <div className="text-center space-y-1 lg:col-span-3 lg:flex lg:items-baseline lg:gap-3 lg:justify-center lg:space-y-0">
        <h2 className="text-2xl font-bold text-gray-800">ダメージ計算機</h2>
        <p className="text-sm text-gray-500">
          与ダメ・被ダメ・必要ステータスを一括計算
        </p>
      </div>

      {/* Column 1: 入力パネル */}
      <div className="space-y-6 lg:space-y-4">
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 lg:p-4 space-y-6 lg:space-y-3">
        <MonsterSelector
          onSelect={handleMonsterSelect}
          selectedMonster={selectedMonster}
        />

        {scaled && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            <div>HP: {scaled.hp.toLocaleString()}</div>
            <div>ATK: {scaled.scaledAtk.toLocaleString()}</div>
            <div>INT: {scaled.scaledInt.toLocaleString()}</div>
            <div>DEF: {scaled.scaledDef.toLocaleString()}</div>
            <div>M-DEF: {scaled.scaledMdef.toLocaleString()}</div>
            <div>SPD: {scaled.scaledSpd.toLocaleString()}</div>
            <div>LUCK: {scaled.scaledLuck.toLocaleString()}</div>
            <div>
              EXP:{" "}
              {(
                Math.max(
                  Math.floor(Math.pow(monsterLevel, 1.1) * 0.2),
                  1
                ) * scaled.exp
              ).toLocaleString()}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100" />

        {/* 自分のステータス */}
        <div className="space-y-4 lg:space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-500 text-sm">自</span>
            </div>
            <h3 className="font-semibold text-gray-800">自分のステータス</h3>
          </div>

          {/* プリセット */}
          <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
            <p className="text-xs font-medium text-gray-500">プリセット</p>
            <div className="flex gap-1.5">
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700"
              >
                <option value="">選択...</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={handleLoadPreset}
                disabled={!selectedPresetId}
                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-100 text-indigo-600 font-medium disabled:opacity-40 hover:bg-indigo-200 transition-colors"
              >
                読込
              </button>
              <button
                onClick={handleDeletePreset}
                disabled={!selectedPresetId}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-100 text-red-600 font-medium disabled:opacity-40 hover:bg-red-200 transition-colors"
              >
                削除
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="プリセット名..."
                className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700 placeholder-gray-300"
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="px-3 py-1.5 text-xs rounded-lg bg-green-100 text-green-600 font-medium disabled:opacity-40 hover:bg-green-200 transition-colors"
              >
                保存
              </button>
            </div>
          </div>

          {/* 属性・攻撃方法 */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600">
                攻撃属性
              </label>
              <div className="flex gap-1.5">
                {elements.map((el) => (
                  <button
                    key={el}
                    onClick={() => setMyElement(el)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      myElement === el
                        ? elementColors[el]
                        : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}
                  >
                    {el}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600">
                攻撃方法
              </label>
              <div className="flex gap-1.5">
                {attackModes.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setMyAttackMode(mode.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
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

          {/* ステータス入力 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-2">
            <InputField label="ATK" value={myAtk} onChange={setMyAtk} />
            <InputField label="INT" value={myInt} onChange={setMyInt} />
            <InputField label="DEF" value={myDef} onChange={setMyDef} />
            <InputField label="M-DEF" value={myMdef} onChange={setMyMdef} />
            <InputField label="SPD" value={mySpd} onChange={setMySpd} />
            <InputField
              label="目標回数"
              value={targetTurns}
              onChange={setTargetTurns}
              placeholder="1"
            />
          </div>

          {/* 魔法設定（魔攻モード時のみ） */}
          {myAttackMode === "魔攻" && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <InputField
                label="解析書INT"
                value={analysisBook}
                onChange={setAnalysisBook}
              />
              <InputField
                label="解析解析書数"
                value={analysisAnalysisBook}
                onChange={setAnalysisAnalysisBook}
              />
            </div>
          )}
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
          計算式を表示
        </summary>
        <div className="mt-3 p-4 bg-gray-50 rounded-2xl text-xs text-gray-500 space-y-1 font-mono">
          <p>物理/魔弾: (ATK or INT)×1.75 - (DEF+M-DEF/10 or M-DEF+DEF/10)) × 4 × 属性</p>
          <p>主人公魔法: (INT+解析書)×1.25×魔法倍率 - (M-DEF+DEF/10)) × 4 × 属性</p>
          <p className="pt-2 text-gray-400">※ 乱数: ×0.9〜1.1 / クリティカル: ×2.5</p>
          <p className="text-gray-400">※ 多段: SPD 3k→2, 10k→3, 30k→4, 100k→5</p>
          <p className="text-gray-400">※ 計算結果≤0 → 被ダメ1〜9</p>
        </div>
      </details>
      </div>{/* /Column 1 */}

      {/* ===== Column 2: 与ダメージ ===== */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 px-1">与ダメージ</h3>
        {hasMonster && offensiveResult ? (<>

          <StatCard
            title={`${myAttackMode === "物理" ? "物理" : "魔法"}攻撃 → ${scaled!.name} Lv${monsterLevel}`}
            accent="green"
          >
            <div className="space-y-2">
              {hasMyOffenseStats && (
                <>
                  <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-500">ダメージ</span>
                    {offensiveResult.dmg.isNullified ? (
                      <span className="text-sm text-gray-400">
                        1〜9（防御貫通不可）
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
                        クリティカル
                      </span>
                      <span className="text-lg font-bold text-yellow-600">
                        {offensiveResult.dmg.critMin.toLocaleString()} 〜{" "}
                        {offensiveResult.dmg.critMax.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-gray-500">多段回数</span>
                    <span className="font-bold text-gray-700">
                      {offensiveResult.multiHit}回
                    </span>
                  </div>
                  {!offensiveResult.dmg.isNullified && (
                    <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                      <span className="text-sm text-gray-500">
                        確殺回数
                      </span>
                      <span className="font-bold text-gray-700">
                        {offensiveResult.hitsToKill === Infinity
                          ? "∞"
                          : `${offensiveResult.hitsToKill}回`}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </StatCard>

          {/* 最低必要ステータス */}
          <StatCard title="最低必要ステータス" accent="purple">
            <div className="space-y-2">
              <ResultRow
                label={`最低${myAttackMode === "物理" ? "ATK" : "INT"}`}
                value={offensiveResult.minStat}
                current={
                  myAttackMode === "物理" ? myAtkNum : myIntNum
                }
                color="purple"
              />
              <ResultRow
                label={`${targetTurnsNum}回で撃破${myAttackMode === "物理" ? "ATK" : "INT"}`}
                value={offensiveResult.targetStat}
                current={
                  myAttackMode === "物理" ? myAtkNum : myIntNum
                }
                color="purple"
              />
            </div>
          </StatCard>
        </>) : (
          <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">モンスターを選択すると与ダメージが表示されます</p>
          </div>
        )}
      </div>{/* /Column 2 */}

      {/* ===== Column 3: 被ダメージ ===== */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 px-1">被ダメージ</h3>
        {hasMonster && defensiveResult ? (<>
          <StatCard
            title={`${defensiveResult.enemyIsPhysical ? "物理" : "魔法"}攻撃（${scaled!.attackType} / ${defensiveResult.enemyIsPhysical ? "ATK" : "INT"}: ${defensiveResult.enemyStat.toLocaleString()}）`}
            accent="orange"
          >
            <div className="space-y-2">
              {/* 被ダメ無効化ライン */}
              {hasMyDefenseStats && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>
                      {defensiveResult.enemyIsPhysical ? "DEF" : "M-DEF"}進捗
                    </span>
                    <span>
                      {(defensiveResult.enemyIsPhysical
                        ? myDefNum
                        : myMdefNum
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
                      defensiveResult.enemyIsPhysical ? myDefNum : myMdefNum
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
              <ResultRow
                label={`${defensiveResult.enemyIsPhysical ? "DEF" : "M-DEF"}のみで無効化`}
                value={
                  defensiveResult.enemyIsPhysical
                    ? defensiveResult.defReq.defOnly
                    : defensiveResult.defReq.mdefOnly
                }
                current={
                  hasMyDefenseStats
                    ? defensiveResult.enemyIsPhysical
                      ? myDefNum
                      : myMdefNum
                    : undefined
                }
                color="orange"
              />
              <ResultRow
                label={`${defensiveResult.enemyIsPhysical ? "M-DEF" : "DEF"}のみで無効化`}
                value={
                  defensiveResult.enemyIsPhysical
                    ? defensiveResult.defReq.mdefOnly
                    : defensiveResult.defReq.defOnly
                }
                current={
                  hasMyDefenseStats
                    ? defensiveResult.enemyIsPhysical
                      ? myMdefNum
                      : myDefNum
                    : undefined
                }
                color="orange"
              />
            </div>
          </StatCard>

          {/* 現在の被ダメージ */}
          {hasMyDefenseStats && (
            <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-5">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">現在の被ダメージ</span>
                {defensiveResult.nullified ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                      1〜9
                    </span>
                    <span className="text-xs text-green-600">無効化達成</span>
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
            </div>
          )}
        </>) : (
          <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">モンスターを選択すると被ダメージが表示されます</p>
          </div>
        )}
      </div>{/* /Column 3 */}
    </div>
  );
}
