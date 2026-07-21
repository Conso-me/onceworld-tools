import { useState, useCallback, useEffect } from "react";
import type { Element } from "../types/game";

const SYNC_EVENT = "owt:manual-stats-updated";
const STORAGE_KEY = "owt:manual-stats";

export type ManualStats = {
  atk: string;
  int: string;
  def: string;
  mdef: string;
  spd: string;
  vit: string;
  luck: string;
  element: Element;
};

export const DEFAULT_MANUAL_STATS: ManualStats = {
  atk: "",
  int: "",
  def: "",
  mdef: "",
  spd: "",
  vit: "",
  luck: "",
  element: "火",
};

/** DamageCalculator が以前使っていた個別キー（初回のみ移行用に読む） */
const LEGACY_KEYS: Record<keyof ManualStats, string> = {
  atk: "owt:dmg:atk",
  int: "owt:dmg:int",
  def: "owt:dmg:def",
  mdef: "owt:dmg:mdef",
  spd: "owt:dmg:spd",
  vit: "owt:dmg:vit",
  luck: "owt:dmg:luck",
  element: "owt:dmg:element",
};

function readLegacy(): ManualStats | null {
  let any = false;
  const out = { ...DEFAULT_MANUAL_STATS };
  for (const k of Object.keys(LEGACY_KEYS) as (keyof ManualStats)[]) {
    try {
      const raw = localStorage.getItem(LEGACY_KEYS[k]);
      if (raw !== null) {
        const v = JSON.parse(raw);
        if (typeof v === "string" && v !== "") {
          if (k === "element") out.element = v as Element;
          else out[k] = v;
          any = true;
        }
      }
    } catch {
      // ignore
    }
  }
  return any ? out : null;
}

function loadFromStorage(): ManualStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return { ...DEFAULT_MANUAL_STATS, ...JSON.parse(stored) };
    const legacy = readLegacy();
    if (legacy) return legacy;
  } catch {
    // ignore
  }
  return DEFAULT_MANUAL_STATS;
}

function persist(stats: ManualStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    // ignore quota errors
  }
}

/**
 * 手動入力ステータスの共有状態。複数画面のコンポーネント間で
 * CustomEvent により同じ状態を参照・更新する。
 */
export function useSharedManualStats() {
  const [stats, setStats] = useState<ManualStats>(loadFromStorage);

  useEffect(() => {
    const handler = () => setStats(loadFromStorage());
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  const setField = useCallback(<K extends keyof ManualStats>(field: K, value: ManualStats[K]) => {
    setStats((prev) => {
      const next = { ...prev, [field]: value };
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setStats(DEFAULT_MANUAL_STATS);
    persist(DEFAULT_MANUAL_STATS);
  }, []);

  const replaceAll = useCallback((next: ManualStats) => {
    setStats(next);
    persist(next);
  }, []);

  return [stats, setField, reset, replaceAll] as const;
}
