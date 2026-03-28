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

// ── base64url (URL-safe、パディングなし) ──────────────────────────────────

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlToBytes(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "==".slice(0, (4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── deflate-raw 圧縮（ネイティブ CompressionStream） ─────────────────────

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(data as unknown as ArrayBuffer);
  writer.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(data as unknown as ArrayBuffer);
  writer.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

// ── エンコード / デコード ─────────────────────────────────────────────────

// URL内のプレフィックス: "z." = deflate圧縮済み、プレフィックスなし = 旧フォーマット（無圧縮）
const COMPRESSED_PREFIX = "z.";

export async function encodeShareState(state: DamageShareState): Promise<string> {
  try {
    const json = JSON.stringify(state);
    const raw = new TextEncoder().encode(json);
    const compressed = await deflate(raw);
    // 圧縮後が大きくなる場合は非圧縮フォールバック
    if (compressed.length >= raw.length) {
      return bytesToBase64Url(raw);
    }
    return COMPRESSED_PREFIX + bytesToBase64Url(compressed);
  } catch {
    // CompressionStream 非対応環境のフォールバック
    try {
      const raw = new TextEncoder().encode(JSON.stringify(state));
      return bytesToBase64Url(raw);
    } catch {
      return "";
    }
  }
}

export async function decodeShareState(encoded: string): Promise<DamageShareState | null> {
  try {
    let bytes: Uint8Array;
    if (encoded.startsWith(COMPRESSED_PREFIX)) {
      bytes = await inflate(base64UrlToBytes(encoded.slice(COMPRESSED_PREFIX.length)));
    } else {
      bytes = base64UrlToBytes(encoded);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (parsed?.v !== 1) return null;
    return parsed as DamageShareState;
  } catch {
    return null;
  }
}

export async function buildShareUrl(state: DamageShareState): Promise<string> {
  const encoded = await encodeShareState(state);
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
