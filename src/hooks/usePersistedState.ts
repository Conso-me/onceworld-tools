import { useState, useEffect, useCallback } from "react";

const STORAGE_PREFIX = "owt:";

/**
 * Persisted state hook with cross-component synchronization.
 * Multiple instances using the same key stay in sync via CustomEvent.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const storageKey = STORAGE_PREFIX + key;
  const eventName = `owt:ps:${key}`;

  const [value, setValueRaw] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return JSON.parse(stored);
    } catch {
      // ignore parse errors
    }
    return defaultValue;
  });

  // Listen for changes from other component instances using the same key
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw !== null) setValueRaw(JSON.parse(raw));
      } catch {
        // ignore
      }
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [storageKey, eventName]);

  // Wrapped setter: persist to localStorage and notify other instances
  const setValue = useCallback(
    (update: T | ((prev: T) => T)) => {
      setValueRaw((prev) => {
        const next =
          typeof update === "function"
            ? (update as (prev: T) => T)(prev)
            : update;
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
          window.dispatchEvent(new CustomEvent(eventName));
        } catch {
          // ignore quota errors
        }
        return next;
      });
    },
    [storageKey, eventName]
  );

  return [value, setValue];
}

/**
 * Batch multiple persisted values into a single localStorage key.
 * Useful for grouping related fields (e.g., all player stats).
 */
export function usePersistedGroup<T extends Record<string, unknown>>(
  key: string,
  defaults: T
): [T, <K extends keyof T>(field: K, value: T[K]) => void, () => void, (newState: T) => void] {
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

  const replaceAll = useCallback((newState: T) => {
    setState(newState);
  }, []);

  return [state, setField, reset, replaceAll];
}
