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
