import { useState, useCallback, useEffect } from "react";
import type { SimConfig } from "../types/game";

const SYNC_EVENT = "owt:sim-a-updated";
const STORAGE_KEY = "owt:sim-a";

export const DEFAULT_SIM_CONFIG: SimConfig = {
  charLevel: 100,
  reinCount: 0,
  tenseisCount: 0,
  charElement: "火",
  hasCosmoCube: false,
  johaneCount: 0,
  johanneAltarCount: 0,
  kinikiBookCount: 1000,
  sageItemCount: 1000,
  hasChoyoContract: true,
  allocVit: 0, allocSpd: 0, allocAtk: 0, allocInt: 0,
  allocDef: 0, allocMdef: 0, allocLuck: 0,
  equipWeapon: "", enhWeapon: 1100,
  equipHead:   "", enhHead:   1100,
  equipBody:   "", enhBody:   1100,
  equipHand:   "", enhHand:   1100,
  equipShield: "", enhShield: 1100,
  equipFoot:   "", enhFoot:   1100,
  acc1: "", acc1Level: 1,
  acc2: "", acc2Level: 1,
  acc3: "", acc3Level: 1,
  acc4: "", acc4Level: 1,
  petName:  "", petLevel:  181,
  pet2Name: "", pet2Level: 181,
  pet3Name: "", pet3Level: 181,
  proteinVit: 1000, proteinSpd: 1000, proteinAtk: 1000, proteinInt: 1000,
  proteinDef: 1000, proteinMdef: 1000, proteinLuck: 1000,
  pShakerCount: 1000,
  kinikiLiquidCount: 1000,
};

export type SimSetField = <K extends keyof SimConfig>(field: K, value: SimConfig[K]) => void;

function loadFromStorage(): SimConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return { ...DEFAULT_SIM_CONFIG, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULT_SIM_CONFIG;
}

function persistConfig(cfg: SimConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    // ignore quota errors
  }
}

/**
 * Shared state for sim-a config.
 * Multiple instances of this hook stay in sync via CustomEvent.
 */
export function useSharedSimConfig() {
  const [cfg, setCfg] = useState<SimConfig>(loadFromStorage);

  // Listen for changes from other component instances
  useEffect(() => {
    const handler = () => setCfg(loadFromStorage());
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  const setField = useCallback(<K extends keyof SimConfig>(field: K, value: SimConfig[K]) => {
    setCfg((prev) => {
      const next = { ...prev, [field]: value };
      persistConfig(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setCfg(DEFAULT_SIM_CONFIG);
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    } catch {
      // ignore
    }
  }, []);

  const replaceAll = useCallback((newState: SimConfig) => {
    setCfg(newState);
    persistConfig(newState);
  }, []);

  return [cfg, setField, reset, replaceAll] as const;
}
