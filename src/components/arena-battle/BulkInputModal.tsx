import { useState, useCallback } from "react";
import { parseTeamInput, type ParsedTeamResult } from "../../utils/parseTeamInput";
import type { TeamData, TeamId } from "./TeamInputPanel";

const PLACEHOLDER = `A
モンスター名, 500
モンスター名, 300
B
モンスター名, 200
C
モンスター名, 100`;

interface Props {
  onApply: (teams: Record<TeamId, TeamData>) => void;
  onClose: () => void;
}

export function BulkInputModal({ onApply, onClose }: Props) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParsedTeamResult | null>(null);

  const handleParse = useCallback(() => {
    if (!text.trim()) return;
    setResult(parseTeamInput(text));
  }, [text]);

  const handleApply = useCallback(() => {
    if (!result) return;

    const teams: Record<TeamId, TeamData> = { A: { slots: [] }, B: { slots: [] }, C: { slots: [] } };

    for (const tid of ["A", "B", "C"] as TeamId[]) {
      const parsed = result.teams[tid];
      if (parsed.length === 0) {
        teams[tid] = { slots: [{ monster: null, level: 1 }] };
      } else {
        teams[tid] = {
          slots: parsed.map((s) => ({ monster: s.monster, level: s.level })),
        };
      }
    }

    onApply(teams);
    onClose();
  }, [result, onApply, onClose]);

  // エラーなしのスロットが1つでもあれば適用可能
  const canApply = result !== null && (["A", "B", "C"] as TeamId[]).some(
    (tid) => result.teams[tid].some((s) => s.monster !== null)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">一括入力</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          placeholder={PLACEHOLDER}
          rows={10}
          className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-mono"
        />

        <div className="flex gap-2">
          <button
            onClick={handleParse}
            disabled={!text.trim()}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
              text.trim()
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            プレビュー
          </button>
          <button
            onClick={handleApply}
            disabled={!canApply}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
              canApply
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            適用
          </button>
        </div>

        {result && (
          <div className="space-y-2">
            {(["A", "B", "C"] as TeamId[]).map((tid) => {
              const slots = result.teams[tid];
              if (slots.length === 0) return null;
              return (
                <div key={tid} className="text-sm">
                  <span className="font-bold text-gray-700">チーム{tid}</span>
                  <ul className="ml-3 mt-0.5 space-y-0.5">
                    {slots.map((s, i) => (
                      <li key={i} className={s.error ? "text-red-500" : "text-gray-600"}>
                        {s.monster ? (
                          <span>
                            {s.monster.name} Lv.{s.level}
                          </span>
                        ) : (
                          <span>{s.error ?? `${s.rawName} Lv.${s.level}`}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {result.errors.length > 0 && (
              <div className="text-xs text-red-500 bg-red-50 rounded-lg p-2 space-y-0.5">
                {result.errors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
