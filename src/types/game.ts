export type Element = "火" | "水" | "木" | "光" | "闇";

// 魔弾 = ペット/敵の魔法攻撃（×1.75）、魔攻 = プレイヤー魔法（×1.25×魔法倍率）
export type AttackType = "物理" | "魔弾" | "魔攻";

export interface MonsterBase {
  name: string;
  level: number;
  element: Element;
  attackType: AttackType;
  vit: number;
  spd: number;
  atk: number;
  int: number;
  def: number;
  mdef: number;
  luck: number;
  mov: number;
  captureRate: number;
  exp: number;
  gold: number;
}

export interface ScaledMonster extends MonsterBase {
  scaledVit: number;
  scaledSpd: number;
  scaledAtk: number;
  scaledInt: number;
  scaledDef: number;
  scaledMdef: number;
  scaledLuck: number;
  hp: number;
}

// ─── Status Simulator ────────────────────────────────────────────────────────

export type EquipmentSlot = "武器" | "頭" | "服" | "手" | "盾" | "脚";

export interface EquipmentItem {
  name: string;
  slot: EquipmentSlot;
  vit: number;
  spd: number;
  atk: number;
  int: number;
  def: number;
  mdef: number;
  luck: number;
}

export type AccessoryEffectType =
  | "VIT" | "VIT%" | "SPD" | "SPD%" | "ATK" | "ATK%"
  | "INT" | "INT%" | "DEF" | "DEF%" | "M-DEF" | "M-DEF%"
  | "LUCK" | "LUCK%" | "MOV" | "HP回復" | "経験値" | "捕獲率" | "ドロップ率";

export interface AccessoryEffect {
  type: AccessoryEffectType;
  value: number;
  scalePercent: number;
}

export interface AccessoryItem {
  name: string;
  effects: AccessoryEffect[];
}

export type PetSkillType =
  | "VIT" | "VIT%" | "最終VIT%"
  | "SPD" | "SPD%" | "最終SPD%"
  | "ATK" | "ATK%" | "最終ATK%"
  | "INT" | "INT%" | "最終INT%"
  | "DEF" | "DEF%" | "最終DEF%"
  | "M-DEF" | "M-DEF%" | "最終M-DEF%"
  | "LUCK" | "LUCK%" | "最終LUCK%"
  | "MOV" | "HP回復" | "経験値" | "捕獲率" | "ドロップ率";

export interface PetSkill {
  level: 31 | 71 | 121 | 181;
  type: PetSkillType;
  value: number;
}

export interface PetEntry {
  name: string;
  skills: PetSkill[];
}

export interface CoreStats {
  vit: number;
  spd: number;
  atk: number;
  int: number;
  def: number;
  mdef: number;
  luck: number;
}

export interface StatBreakdown {
  alloc: CoreStats;
  equipment: CoreStats;
  protein: CoreStats;
  accFlat: CoreStats;
  petFlat: CoreStats;
  prePct: CoreStats;
  pctBonus: CoreStats;
  afterPct: CoreStats;
  finalPctBonus: CoreStats;
  final: CoreStats;
  hp: number;
}

export interface SimConfig extends Record<string, unknown> {
  charLevel: number;
  reinCount: 0 | 10 | 11 | 12;   // 天命輪廻回数
  // 振り分けポイント（使える総量）
  hasCosmoCube: boolean;      // コスモキューブ所持 (天命輪廻回数×10,000ポイント)
  johaneCount: number;        // ヨハネの羽ペン (利用可能ポイント×1%/個)
  // 振り分け上限（各ステータスへの上限、基底10,000）
  kinikiBookCount: number;    // 禁域の書物 (上限+80/個)
  sageItemCount: number;      // 賢者の落とし物 (上限+10/個)
  hasChoyoContract: boolean;  // 超越の契約書 (上限+900,000)
  // ステータス割り振り
  allocVit: number;
  allocSpd: number;
  allocAtk: number;
  allocInt: number;
  allocDef: number;
  allocMdef: number;
  allocLuck: number;
  // 装備
  equipWeapon: string;
  equipHead: string;
  equipBody: string;
  equipHand: string;
  equipShield: string;
  equipFoot: string;
  // アクセサリー
  acc1: string;
  acc2: string;
  // ペット
  petName: string;
  petLevel: 0 | 31 | 71 | 121 | 181;
  // プロテイン
  proteinVit: number;
  proteinSpd: number;
  proteinAtk: number;
  proteinInt: number;
  proteinDef: number;
  proteinMdef: number;
  proteinLuck: number;
  pShakerCount: number;       // Pシェーカー (プロテイン効果+1%/個)
  // HP補正
  kinikiLiquidCount: number;  // 禁域の液体 (HP+1%/個)
}
