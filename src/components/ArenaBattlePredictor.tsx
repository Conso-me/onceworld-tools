import { useState, useCallback } from "react";
import { usePersistedState } from "../hooks/usePersistedState";
import {
  runBattleSimulation,
  type BattleConfig,
  type BattleResult,
  type TeamId,
} from "../utils/arenaBattleSim";
import {
  TeamInputPanel,
  type TeamData,
  type TeamId as InputTeamId,
} from "./arena-battle/TeamInputPanel";
import { BattleResultsPanel } from "./arena-battle/BattleResultsPanel";

const defaultTeam = (): TeamData => ({
  slots: [
    { monster: null, level: 1 },
    { monster: null, level: 1 },
    { monster: null, level: 1 },
    { monster: null, level: 1 },
  ],
});

const defaultTeams = (): Record<InputTeamId, TeamData> => ({
  A: defaultTeam(),
  B: defaultTeam(),
  C: defaultTeam(),
});

export function ArenaBattlePredictor() {
  const [teams, setTeams] = usePersistedState<Record<InputTeamId, TeamData>>(
    "bp:teams",
    defaultTeams()
  );
  const [result, setResult] = useState<BattleResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = useCallback(() => {
    // BattleConfigに変換（モンスター未設定スロットを除外）
    const teamIds: TeamId[] = ["A", "B", "C"];
    const battleTeams = {} as BattleConfig["teams"];

    for (const tid of teamIds) {
      battleTeams[tid] = teams[tid].slots
        .filter((s) => s.monster !== null)
        .map((s) => ({ monster: s.monster!, level: s.level }));
    }

    // 全チームに最低1体いるかチェック
    if (teamIds.some((tid) => battleTeams[tid].length === 0)) return;

    setIsSimulating(true);

    // UIブロッキングを避けるためrAFで遅延実行
    requestAnimationFrame(() => {
      const simResult = runBattleSimulation({
        teams: battleTeams,
        iterations: 1000,
      });
      setResult(simResult);
      setIsSimulating(false);
    });
  }, [teams]);

  return (
    <div
      className="max-w-lg mx-auto space-y-6
                    lg:max-w-none lg:space-y-0
                    lg:grid lg:grid-cols-[minmax(340px,400px)_1fr]
                    lg:gap-2 lg:items-start"
    >
      {/* Left: Team Input */}
      <TeamInputPanel
        teams={teams}
        onTeamsChange={setTeams}
        onSimulate={handleSimulate}
        isSimulating={isSimulating}
      />

      {/* Right: Results */}
      <BattleResultsPanel result={result} />
    </div>
  );
}
