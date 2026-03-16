import { useState, useEffect } from "react";
import type { MonsterBase } from "../types/game";
import { getAllMonsters, getCustomMonsters } from "../data/monsters";

const EVENT = "onceworld:monsters-updated";

export function useAllMonsters(): MonsterBase[] {
  const [monsters, setMonsters] = useState<MonsterBase[]>(() => getAllMonsters());
  useEffect(() => {
    const handler = () => setMonsters(getAllMonsters());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  return monsters;
}

export function useCustomMonsters(): MonsterBase[] {
  const [customs, setCustoms] = useState<MonsterBase[]>(() => getCustomMonsters());
  useEffect(() => {
    const handler = () => setCustoms(getCustomMonsters());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  return customs;
}
