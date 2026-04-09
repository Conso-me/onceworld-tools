import { useState, useCallback } from "react";
import type { PetDamageConfig } from "../types/game";

const STORAGE_KEY = "owt:pet-presets";

export type PetPreset = {
  id: string;
  name: string;
  config: PetDamageConfig;
};

function loadFromStorage(): PetPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function persist(presets: PetPreset[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(presets)); } catch { /* ignore */ }
}

export function usePetPresets() {
  const [presets, setPresets] = useState<PetPreset[]>(loadFromStorage);

  const savePreset = useCallback((name: string, config: PetDamageConfig) => {
    setPresets((prev) => {
      const existingIdx = prev.findIndex((p) => p.name === name);
      let next: PetPreset[];
      if (existingIdx >= 0) {
        next = prev.map((p, i) => i === existingIdx ? { ...p, config, name } : p);
      } else {
        next = [...prev, { id: crypto.randomUUID(), name, config }];
      }
      persist(next);
      return next;
    });
  }, []);

  const loadPreset = useCallback((id: string): PetPreset | undefined => {
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
