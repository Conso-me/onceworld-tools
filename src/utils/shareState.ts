import type { SimConfig } from "../types/game";
import { DEFAULT_SIM_CONFIG } from "../hooks/useSharedSimConfig";
import equipmentData from "../../docs/data/equipment.json";
import accessoriesData from "../../docs/data/accessories.json";
import petSkillsData from "../../docs/data/pet-skills.json";
import monstersData from "../../docs/data/monsters.json";

// ── サイト内部ID（配列インデックス = 安定ID、末尾追加のみ） ──────────────

function buildLookup(items: { name: string }[]) {
  const nameToId = new Map<string, number>();
  const idToName: string[] = [];
  items.forEach((item, i) => {
    nameToId.set(item.name, i);
    idToName[i] = item.name;
  });
  return { nameToId, idToName };
}

const equipLookup   = buildLookup(equipmentData  as { name: string }[]);
const accLookup     = buildLookup(accessoriesData as { name: string }[]);
const petLookup     = buildLookup(petSkillsData   as { name: string }[]);
const monsterLookup = buildLookup(monstersData    as { name: string }[]);

const EQUIP_FIELDS = ["equipWeapon","equipHead","equipBody","equipHand","equipShield","equipFoot"] as const;
const ACC_FIELDS   = ["acc1","acc2","acc3","acc4"] as const;
const PET_FIELDS   = ["petName","pet2Name","pet3Name"] as const;

type SimRecord = Record<string, unknown>;

/** JSON直前: 名前 → ID に変換 */
function namesToIds(state: DamageShareState): unknown {
  const result: SimRecord = { ...state };

  if (typeof result.monsterName === "string") {
    const id = monsterLookup.nameToId.get(result.monsterName);
    if (id !== undefined) result.monsterName = id;
  }

  if (Array.isArray(result.comparisonMonsters)) {
    result.comparisonMonsters = (result.comparisonMonsters as { name: string; level: number; location: string }[])
      .map((e) => {
        const id = monsterLookup.nameToId.get(e.name);
        return { ...e, name: id !== undefined ? id : e.name };
      });
  }

  if (result.sim && typeof result.sim === "object") {
    const sim: SimRecord = { ...result.sim as SimRecord };
    for (const f of EQUIP_FIELDS) {
      const name = sim[f];
      if (typeof name === "string" && name) {
        const id = equipLookup.nameToId.get(name);
        if (id !== undefined) sim[f] = id;
      }
    }
    for (const f of ACC_FIELDS) {
      const name = sim[f];
      if (typeof name === "string" && name) {
        const id = accLookup.nameToId.get(name);
        if (id !== undefined) sim[f] = id;
      }
    }
    for (const f of PET_FIELDS) {
      const name = sim[f];
      if (typeof name === "string" && name) {
        const id = petLookup.nameToId.get(name);
        if (id !== undefined) sim[f] = id;
      }
    }
    result.sim = sim;
  }
  return result;
}

/** JSON直後: ID → 名前 に変換 */
function idsToNames(data: SimRecord): DamageShareState {
  const result: SimRecord = { ...data };

  if (typeof result.monsterName === "number") {
    result.monsterName = monsterLookup.idToName[result.monsterName] ?? "";
  }

  if (Array.isArray(result.comparisonMonsters)) {
    result.comparisonMonsters = (result.comparisonMonsters as { name: string | number; level: number; location: string }[])
      .map((e) => ({
        ...e,
        name: typeof e.name === "number" ? (monsterLookup.idToName[e.name] ?? "") : e.name,
      }));
  }

  if (result.sim && typeof result.sim === "object") {
    const sim: SimRecord = { ...result.sim as SimRecord };
    for (const f of EQUIP_FIELDS) {
      if (typeof sim[f] === "number") sim[f] = equipLookup.idToName[sim[f] as number] ?? "";
    }
    for (const f of ACC_FIELDS) {
      if (typeof sim[f] === "number") sim[f] = accLookup.idToName[sim[f] as number] ?? "";
    }
    for (const f of PET_FIELDS) {
      if (typeof sim[f] === "number") sim[f] = petLookup.idToName[sim[f] as number] ?? "";
    }
    result.sim = sim;
  }
  return result as unknown as DamageShareState;
}

// ── SimConfig デフォルト値除去 ────────────────────────────────────────────

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

// ── 共有状態の型 ──────────────────────────────────────────────────────────

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
    const json = JSON.stringify(namesToIds(state));
    const raw = new TextEncoder().encode(json);
    const compressed = await deflate(raw);
    if (compressed.length >= raw.length) {
      return bytesToBase64Url(raw);
    }
    return COMPRESSED_PREFIX + bytesToBase64Url(compressed);
  } catch {
    try {
      const raw = new TextEncoder().encode(JSON.stringify(namesToIds(state)));
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
    return idsToNames(parsed as SimRecord);
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
