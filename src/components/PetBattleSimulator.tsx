import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedState, usePersistedGroup } from "../hooks/usePersistedState";
import { calcPetStats, DEFAULT_PET_DAMAGE_CONFIG } from "../utils/petStatCalc";
import { calcPetBattleResult } from "../utils/petBattleCalc";
import type { PetDamageConfig } from "../types/game";
import { useAllMonsters } from "../hooks/useAllMonsters";
import { PetConfigPanel } from "./damage/PetConfigPanel";
import { BattleResultPanel } from "./petbattle/BattleResultPanel";

export function PetBattleSimulator() {
  const { t } = useTranslation("petbattle");

  type PetCfgTuple = [
    PetDamageConfig,
    <K extends keyof PetDamageConfig>(field: K, value: PetDamageConfig[K]) => void,
    () => void,
    (s: PetDamageConfig) => void,
  ];

  const [cfgA, setFieldA, resetA, replaceAllA] = usePersistedGroup<PetDamageConfig & Record<string, unknown>>(
    "petbattle:a",
    DEFAULT_PET_DAMAGE_CONFIG as PetDamageConfig & Record<string, unknown>,
  ) as unknown as PetCfgTuple;
  const [cfgB, setFieldB, resetB, replaceAllB] = usePersistedGroup<PetDamageConfig & Record<string, unknown>>(
    "petbattle:b",
    DEFAULT_PET_DAMAGE_CONFIG as PetDamageConfig & Record<string, unknown>,
  ) as unknown as PetCfgTuple;
  const [activeConfig, setActiveConfig] = usePersistedState<"A" | "B">("petbattle:active", "A");
  const [startingDist, setStartingDist] = usePersistedState<number>("petbattle:startingDist", 100);

  const allMonsters = useAllMonsters();

  const monsterA = useMemo(
    () => (cfgA.petMonsterName ? allMonsters.find((m) => m.name === cfgA.petMonsterName) ?? null : null),
    [cfgA.petMonsterName, allMonsters],
  );
  const monsterB = useMemo(
    () => (cfgB.petMonsterName ? allMonsters.find((m) => m.name === cfgB.petMonsterName) ?? null : null),
    [cfgB.petMonsterName, allMonsters],
  );

  const resultA = useMemo(() => (monsterA ? calcPetStats(cfgA, monsterA) : null), [cfgA, monsterA]);
  const resultB = useMemo(() => (monsterB ? calcPetStats(cfgB, monsterB) : null), [cfgB, monsterB]);

  const battle = useMemo(
    () => (resultA && resultB ? calcPetBattleResult(resultA, resultB, startingDist) : null),
    [resultA, resultB, startingDist],
  );

  const activeCfg = activeConfig === "A" ? cfgA : cfgB;
  const activeSetField = activeConfig === "A" ? setFieldA : setFieldB;
  const activeReset = activeConfig === "A" ? resetA : resetB;
  const activeReplaceAll = activeConfig === "A" ? replaceAllA : replaceAllB;
  const activeResult = activeConfig === "A" ? resultA : resultB;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start">
      {/* 左パネル（入力） */}
      <div className="space-y-3">
        {/* A/B 設定タブ */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {(["A", "B"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setActiveConfig(id)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                activeConfig === id
                  ? id === "A"
                    ? "bg-blue-500 text-white"
                    : "bg-orange-400 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {id === "A" ? t("configA") : t("configB")}
            </button>
          ))}
        </div>

        <PetConfigPanel
          config={activeCfg}
          setField={activeSetField}
          reset={activeReset}
          petResult={activeResult}
          replaceConfig={activeReplaceAll}
          showPetStats
        />
      </div>

      {/* 右パネル（結果） */}
      <div className="mt-4 lg:mt-0">
        <BattleResultPanel
          resultA={resultA}
          resultB={resultB}
          battle={battle}
          petInfoA={{ monsterName: cfgA.petMonsterName, level: cfgA.petLevel, sengiCount: cfgA.sengiCount }}
          petInfoB={{ monsterName: cfgB.petMonsterName, level: cfgB.petLevel, sengiCount: cfgB.sengiCount }}
          startingDist={startingDist}
          onStartingDistChange={setStartingDist}
        />
      </div>
    </div>
  );
}
