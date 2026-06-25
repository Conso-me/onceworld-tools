import { useState, useCallback, useEffect } from "react";
import { type AttackBuffs, DEFAULT_ATTACK_BUFFS } from "../utils/attackBuffs";

const SYNC_EVENT = "owt:attack-buffs-updated";
const STORAGE_KEY = "owt:attack-buffs";

/** DamageCalculator が以前使っていた個別キー（初回のみ移行用に読む） */
const LEGACY_KEYS: Record<keyof AttackBuffs, string> = {
  analysisBook: "owt:dmg:analysisBook",
  analysisAnalysisBook: "owt:dmg:analysisAnalysisBook",
  crystalCube: "owt:dmg:crystalCube",
  toughouCube: "owt:dmg:toughouCube",
  devilEye: "owt:dmg:devilEye",
};

function readLegacy(): AttackBuffs | null {
  let any = false;
  const out = { ...DEFAULT_ATTACK_BUFFS };
  for (const k of Object.keys(LEGACY_KEYS) as (keyof AttackBuffs)[]) {
    try {
      const raw = localStorage.getItem(LEGACY_KEYS[k]);
      if (raw !== null) {
        const v = JSON.parse(raw);
        if (typeof v === "string" && v !== "") {
          out[k] = v;
          any = true;
        }
      }
    } catch {
      // ignore
    }
  }
  return any ? out : null;
}

function loadFromStorage(): AttackBuffs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return { ...DEFAULT_ATTACK_BUFFS, ...JSON.parse(stored) };
    const legacy = readLegacy();
    if (legacy) return legacy;
  } catch {
    // ignore
  }
  return DEFAULT_ATTACK_BUFFS;
}

function persist(cfg: AttackBuffs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    // ignore quota errors
  }
}

/**
 * 攻撃バフの共有状態。装備設定（useSharedSimConfig）と同様に、
 * 複数コンポーネント間で CustomEvent により同期する。
 */
export function useSharedAttackBuffs() {
  const [cfg, setCfg] = useState<AttackBuffs>(loadFromStorage);

  useEffect(() => {
    const handler = () => setCfg(loadFromStorage());
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  const setField = useCallback(<K extends keyof AttackBuffs>(field: K, value: AttackBuffs[K]) => {
    setCfg((prev) => {
      const next = { ...prev, [field]: value };
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setCfg(DEFAULT_ATTACK_BUFFS);
    persist(DEFAULT_ATTACK_BUFFS);
  }, []);

  const replaceAll = useCallback((next: AttackBuffs) => {
    setCfg(next);
    persist(next);
  }, []);

  return [cfg, setField, reset, replaceAll] as const;
}
