import { useState, useCallback } from "react";
import type { SimConfig } from "../types/game";

const STORAGE_KEY = "owt:sim-presets";

export type SimPresetExtra = {
  crystalCube: string;
  analysisBook: string;
  analysisAnalysisBook: string;
};

export type SimPreset = {
  id: string;
  name: string;
  config: SimConfig;
  extra?: SimPresetExtra;
};

function loadFromStorage(): SimPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function persist(presets: SimPreset[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(presets)); } catch { /* ignore */ }
}

export function useSimPresets() {
  const [presets, setPresets] = useState<SimPreset[]>(loadFromStorage);

  const savePreset = useCallback((name: string, config: SimConfig, extra?: SimPresetExtra) => {
    setPresets((prev) => {
      const existingIdx = prev.findIndex((p) => p.name === name);
      let next: SimPreset[];
      if (existingIdx >= 0) {
        next = prev.map((p, i) => i === existingIdx ? { ...p, config, name, extra } : p);
      } else {
        next = [...prev, { id: crypto.randomUUID(), name, config, extra }];
      }
      persist(next);
      return next;
    });
  }, []);

  const loadPreset = useCallback((id: string): SimPreset | undefined => {
    return presets.find((p) => p.id === id);
  }, [presets]);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { presets, savePreset, loadPreset, deletePreset };
}
