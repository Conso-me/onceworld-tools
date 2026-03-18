import { useState } from "react";
import type { MonsterBase, Element } from "../../types/game";
import { MonsterSlot } from "./MonsterSlot";
import { BulkInputModal } from "./BulkInputModal";
import { ScreenshotOcrModal } from "./ScreenshotOcrModal";
import { EncyclopediaRegistrationModal } from "./EncyclopediaRegistrationModal";

export interface SlotData {
  monster: MonsterBase | null;
  level: number;
  detectedElement?: Element; // OCRで検出した属性（モンスター選択時の初期フィルタ用）
}

export interface TeamData {
  slots: SlotData[];
}

export type TeamId = "A" | "B" | "C";

const teamConfig: Record<TeamId, { label: string; color: string; bgColor: string }> = {
  A: { label: "チームA", color: "text-red-600", bgColor: "bg-red-50 border-red-200" },
  B: { label: "チームB", color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200" },
  C: { label: "チームC", color: "text-green-600", bgColor: "bg-green-50 border-green-200" },
};

const MAX_SLOTS = 4;

interface Props {
  teams: Record<TeamId, TeamData>;
  onTeamsChange: (teams: Record<TeamId, TeamData>) => void;
  onSimulate: () => void;
  isSimulating: boolean;
}

export function TeamInputPanel({
  teams,
  onTeamsChange,
  onSimulate,
  isSimulating,
}: Props) {
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [encyclopediaModalOpen, setEncyclopediaModalOpen] = useState(false);

  const updateSlot = (
    teamId: TeamId,
    slotIndex: number,
    update: Partial<SlotData>
  ) => {
    const newTeams = { ...teams };
    const newSlots = [...newTeams[teamId].slots];
    newSlots[slotIndex] = { ...newSlots[slotIndex], ...update };
    newTeams[teamId] = { ...newTeams[teamId], slots: newSlots };
    onTeamsChange(newTeams);
  };

  const addSlot = (teamId: TeamId) => {
    if (teams[teamId].slots.length >= MAX_SLOTS) return;
    const newTeams = { ...teams };
    newTeams[teamId] = {
      ...newTeams[teamId],
      slots: [...newTeams[teamId].slots, { monster: null, level: 1 }],
    };
    onTeamsChange(newTeams);
  };

  const removeSlot = (teamId: TeamId, slotIndex: number) => {
    const newTeams = { ...teams };
    const newSlots = [...newTeams[teamId].slots];
    newSlots.splice(slotIndex, 1);
    // 最低1スロットは維持
    if (newSlots.length === 0) newSlots.push({ monster: null, level: 1 });
    newTeams[teamId] = { ...newTeams[teamId], slots: newSlots };
    onTeamsChange(newTeams);
  };

  // シミュレーション可能かチェック（各チームに最低1体のモンスターが必要）
  const canSimulate = (["A", "B", "C"] as TeamId[]).every((tid) =>
    teams[tid].slots.some((s) => s.monster !== null)
  );

  return (
    <div className="space-y-6 lg:space-y-2 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 p-6 lg:p-4 space-y-4 lg:space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg lg:text-base font-bold text-gray-900">
            チーム編成
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEncyclopediaModalOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="テンプレート登録"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 16.82A7.462 7.462 0 0 1 15 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0 0 18 15.06V3.81a.75.75 0 0 0-.537-.72A9.006 9.006 0 0 0 15 2.8a9.005 9.005 0 0 0-4.25 1.065v12.955ZM9.25 4.865A9.005 9.005 0 0 0 5 3.8a9.006 9.006 0 0 0-2.463.28A.75.75 0 0 0 2 4.81v11.25a.75.75 0 0 0 .954.72A7.462 7.462 0 0 1 5 16.5a7.46 7.46 0 0 1 4.25 1.32V4.865Z" />
              </svg>
            </button>
            <button
              onClick={() => setBulkModalOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="一括入力"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M15.988 3.012A2.25 2.25 0 0 1 18 5.25v6.5A2.25 2.25 0 0 1 15.75 14H13.5v-3.379a3 3 0 0 0-.879-2.121l-3.12-3.121a3 3 0 0 0-1.402-.791 2.252 2.252 0 0 1 1.913-1.576l5.977-.002ZM9.5 5.25v.006l.001-.006ZM2.25 7.5A2.25 2.25 0 0 0 0 9.75v5A2.25 2.25 0 0 0 2.25 17h6.5A2.25 2.25 0 0 0 11 14.75V10.5H8.25a2.25 2.25 0 0 1-2.25-2.25V5.5H2.25Z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setOcrModalOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="スクリーンショットOCR"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {(["A", "B", "C"] as TeamId[]).map((teamId) => {
          const cfg = teamConfig[teamId];
          const team = teams[teamId];

          return (
            <div
              key={teamId}
              className={`rounded-xl border p-3 space-y-2 ${cfg.bgColor}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${cfg.color}`}>
                  {cfg.label}
                </span>
                {team.slots.length < MAX_SLOTS && (
                  <button
                    onClick={() => addSlot(teamId)}
                    className="text-xs px-2 py-0.5 rounded-md bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900 transition-colors border border-gray-200"
                  >
                    + 追加
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {team.slots.map((slot, idx) => (
                  <MonsterSlot
                    key={idx}
                    monster={slot.monster}
                    level={slot.level}
                    detectedElement={slot.detectedElement}
                    onSelectMonster={(m) =>
                      updateSlot(teamId, idx, { monster: m, detectedElement: undefined })
                    }
                    onLevelChange={(lv) =>
                      updateSlot(teamId, idx, { level: lv })
                    }
                    onRemove={() => removeSlot(teamId, idx)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <button
          onClick={onSimulate}
          disabled={!canSimulate || isSimulating}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
            canSimulate && !isSimulating
              ? "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isSimulating ? "シミュレーション中..." : "シミュレーション実行"}
        </button>

        {!canSimulate && (
          <p className="text-xs text-gray-400 text-center">
            各チームに最低1体のモンスターを設定してください
          </p>
        )}
      </div>

      {bulkModalOpen && (
        <BulkInputModal
          onApply={onTeamsChange}
          onClose={() => setBulkModalOpen(false)}
        />
      )}

      {ocrModalOpen && (
        <ScreenshotOcrModal
          onApply={onTeamsChange}
          onClose={() => setOcrModalOpen(false)}
        />
      )}

      {encyclopediaModalOpen && (
        <EncyclopediaRegistrationModal
          onClose={() => setEncyclopediaModalOpen(false)}
        />
      )}
    </div>
  );
}
