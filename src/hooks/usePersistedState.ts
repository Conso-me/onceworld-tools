import { useState, useEffect, useCallback } from "react";

const STORAGE_PREFIX = "owt:";

export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const storageKey = STORAGE_PREFIX + key;

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return JSON.parse(stored);
    } catch {
      // ignore parse errors
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  }, [storageKey, value]);

  return [value, setValue];
}

/**
 * Batch multiple persisted values into a single localStorage key.
 * Useful for grouping related fields (e.g., all player stats).
 */
export function usePersistedGroup<T extends Record<string, unknown>>(
  key: string,
  defaults: T
): [T, <K extends keyof T>(field: K, value: T[K]) => void, () => void] {
  const storageKey = STORAGE_PREFIX + key;

  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return { ...defaults, ...JSON.parse(stored) };
    } catch {
      // ignore
    }
    return defaults;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [storageKey, state]);

  const setField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const reset = useCallback(() => {
    setState(defaults);
    localStorage.removeItem(storageKey);
  }, [storageKey, defaults]);

  return [state, setField, reset];
}
