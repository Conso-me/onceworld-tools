import type { SimConfig } from "../types/game";
import { DEFAULT_SIM_CONFIG } from "../hooks/useSharedSimConfig";

/** デフォルト値と同じフィールドを除いてサイズを削減 */
export function compactSimConfig(cfg: SimConfig): Partial<SimConfig> {
  const compact: Partial<SimConfig> = {};
  for (const key of Object.keys(DEFAULT_SIM_CONFIG) as (keyof SimConfig)[]) {
    if (cfg[key] !== DEFAULT_SIM_CONFIG[key]) {
      (compact as Record<string, unknown>)[key] = cfg[key];
    }
  }
  return compact;
}

/** デフォルト値を補完してフル SimConfig に戻す */
export function expandSimConfig(partial: Partial<SimConfig>): SimConfig {
  return { ...DEFAULT_SIM_CONFIG, ...partial };
}

export interface DamageShareState {
  v: 1;
  monsterName?: string;
  monsterLevel?: number;
  statMode: "manual" | "sim";
  atk?: string;
  int?: string;
  def?: string;
  mdef?: string;
  spd?: string;
  vit?: string;
  luck?: string;
  element?: string;
  attackMode?: string;
  analysisBook?: string;
  analysisAnalysisBook?: string;
  crystalCube?: string;
  crystalCubeMode?: "pre-def" | "final";
  sim?: Partial<SimConfig>;
  comparisonMonsters?: { name: string; level: number; location: string }[];
  comparisonActive?: boolean;
  comparisonTab?: "与ダメ" | "被ダメ";
  comparisonSpell?: string;
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(encoded: string): string {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeShareState(state: DamageShareState): string {
  try {
    return toBase64(JSON.stringify(state));
  } catch {
    return "";
  }
}

export function decodeShareState(encoded: string): DamageShareState | null {
  try {
    const json = fromBase64(encoded);
    const parsed = JSON.parse(json);
    if (parsed?.v !== 1) return null;
    return parsed as DamageShareState;
  } catch {
    return null;
  }
}

export function buildShareUrl(state: DamageShareState): string {
  const encoded = encodeShareState(state);
  if (!encoded) return window.location.href;
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?share=${encoded}#damage`;
}

export function getShareParam(): string | null {
  return new URLSearchParams(window.location.search).get("share");
}

export function clearShareParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("share");
  window.history.replaceState(null, "", url.toString());
}
