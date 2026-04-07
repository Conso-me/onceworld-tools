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
  series?: string | null;
  material?: string;
  vit: number;
  spd: number;
  atk: number;
  int: number;
  def: number;
  mdef: number;
  luck: number;
  order?: number;
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
  maxLevel: number;
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
  setBonus: boolean;
  setBonusSeries: string | null;
}

export interface SimConfig extends Record<string, unknown> {
  charLevel: number;
  reinCount: number;              // 天命輪廻回数（上限なし）
  tenseisCount: number;           // 転生回数（0-10）
  charElement: Element;           // 属性（ダメ計プリセット用）
  // 振り分けポイント（使える総量）
  hasCosmoCube: boolean;
  johaneCount: number;
  johanneAltarCount: number;
  // ステータス割り振り
  allocVit: number;
  allocSpd: number;
  allocAtk: number;
  allocInt: number;
  allocDef: number;
  allocMdef: number;
  allocLuck: number;
  // 装備 + 強化値（0=未強化, 1100=最大。強化不可アイテムは計算時に無視）
  equipWeapon: string;  enhWeapon: number;
  equipHead: string;    enhHead: number;
  equipBody: string;    enhBody: number;
  equipHand: string;    enhHand: number;
  equipShield: string;  enhShield: number;
  equipFoot: string;    enhFoot: number;
  // アクセサリー（4枠 + 各レベル）
  acc1: string; acc1Level: number;
  acc2: string; acc2Level: number;
  acc3: string; acc3Level: number;
  acc4: string; acc4Level: number;
  // ペット（3枠）
  petName: string;  petLevel: 0 | 31 | 71 | 121 | 181;
  pet2Name: string; pet2Level: 0 | 31 | 71 | 121 | 181;
  pet3Name: string; pet3Level: 0 | 31 | 71 | 121 | 181;
  // プロテイン
  proteinVit: number;
  proteinSpd: number;
  proteinAtk: number;
  proteinInt: number;
  proteinDef: number;
  proteinMdef: number;
  proteinLuck: number;
  pShakerCount: number;
  // HP補正
  kinikiLiquidCount: number;
}
