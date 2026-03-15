import { useState, useCallback } from "react";
import type { Element } from "../types/game";

const STORAGE_KEY = "owt:stat-presets";

type PlayerAttackMode = "物理" | "魔弾" | "魔攻";

export type StatPreset = {
  id: string;
  name: string;
  atk: string;
  int: string;
  def: string;
  mdef: string;
  spd: string;
  element: Element;
  attackMode: PlayerAttackMode;
  analysisBook: string;
  analysisAnalysisBook: string;
};

function loadFromStorage(): StatPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return [];
}

function persist(presets: StatPreset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore quota errors
  }
}

export function useStatPresets() {
  const [presets, setPresets] = useState<StatPreset[]>(loadFromStorage);

  const savePreset = useCallback(
    (name: string, stats: Omit<StatPreset, "id" | "name">) => {
      setPresets((prev) => {
        const existingIdx = prev.findIndex((p) => p.name === name);
        let next: StatPreset[];
        if (existingIdx >= 0) {
          next = prev.map((p, i) =>
            i === existingIdx ? { ...p, ...stats, name } : p
          );
        } else {
          next = [...prev, { ...stats, id: crypto.randomUUID(), name }];
        }
        persist(next);
        return next;
      });
    },
    []
  );

  const loadPreset = useCallback(
    (id: string): StatPreset | undefined => {
      return presets.find((p) => p.id === id);
    },
    [presets]
  );

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { presets, savePreset, loadPreset, deletePreset };
}
