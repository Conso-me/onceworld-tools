import type { Element } from "../types/game";

export type MagicSpell = {
  name: string;
  element: Element;
  multiplier: number;
  hits: number;
  spCost: number;
};

export const MAGIC_SPELLS: MagicSpell[] = [
  { name: "炎帝轟火", element: "火", multiplier: 1.0, hits: 4, spCost: 5 },
  { name: "氷槍陣",   element: "水", multiplier: 1.0, hits: 1, spCost: 5 },
  { name: "大地葬送", element: "木", multiplier: 1.3, hits: 1, spCost: 9 },
  { name: "雷鳴一閃", element: "光", multiplier: 2.0, hits: 1, spCost: 7 },
  { name: "冥刃降臨", element: "闇", multiplier: 1.4, hits: 1, spCost: 11 },
  { name: "時流停滞", element: "光", multiplier: 1.015, hits: 1, spCost: 7 },
];
