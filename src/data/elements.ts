import type { Element } from "../types/game";
import elementsJson from "../../docs/data/elements.json";

const affinityMatrix = elementsJson.affinityMatrix as Record<
  Element,
  Record<Element, number>
>;
const magicBaseMultiplier = elementsJson.magicBaseMultiplier as Record<
  Element,
  number
>;

export function getElementAffinity(
  attackerElement: Element,
  defenderElement: Element
): number {
  return affinityMatrix[attackerElement]?.[defenderElement] ?? 1.0;
}

export function getMagicMultiplier(element: Element): number {
  return magicBaseMultiplier[element] ?? 1.0;
}
