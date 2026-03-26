import { describe, it, expect } from "vitest";
import { scaleMonster } from "../../utils/monsterScaling";
import type { MonsterBase } from "../../types/game";

const baseMonster: MonsterBase = {
  name: "テストモンスター",
  level: 1,
  element: "火",
  attackType: "物理",
  vit: 10,
  spd: 20,
  atk: 30,
  int: 40,
  def: 50,
  mdef: 60,
  luck: 70,
  mov: 8,
  captureRate: 5,
  exp: 100,
  gold: 200,
};

describe("scaleMonster", () => {
  it("level 1: multiplier = (1-1)*0.1 + 1 = 1.0 (no scaling)", () => {
    const scaled = scaleMonster(baseMonster, 1);
    expect(scaled.scaledVit).toBe(10);
    expect(scaled.scaledSpd).toBe(20);
    expect(scaled.scaledAtk).toBe(30);
    expect(scaled.scaledInt).toBe(40);
    expect(scaled.scaledDef).toBe(50);
    expect(scaled.scaledMdef).toBe(60);
    expect(scaled.scaledLuck).toBe(70);
    expect(scaled.hp).toBe(10 * 18 + 100); // 280
    expect(scaled.level).toBe(1);
  });

  it("level 11: multiplier = (11-1)*0.1 + 1 = 2.0 (double)", () => {
    const scaled = scaleMonster(baseMonster, 11);
    expect(scaled.scaledVit).toBe(20);
    expect(scaled.scaledSpd).toBe(40);
    expect(scaled.scaledAtk).toBe(60);
    expect(scaled.scaledInt).toBe(80);
    expect(scaled.scaledDef).toBe(100);
    expect(scaled.scaledMdef).toBe(120);
    expect(scaled.scaledLuck).toBe(140);
    expect(scaled.hp).toBe(20 * 18 + 100); // 460
  });

  it("level 100: multiplier = (100-1)*0.1 + 1 = 10.9", () => {
    const scaled = scaleMonster(baseMonster, 100);
    // scaledStat = floor(baseStat * 10.9)
    expect(scaled.scaledVit).toBe(Math.floor(10 * 10.9)); // 109
    expect(scaled.scaledSpd).toBe(Math.floor(20 * 10.9)); // 218
    expect(scaled.scaledAtk).toBe(Math.floor(30 * 10.9)); // 327
    expect(scaled.scaledInt).toBe(Math.floor(40 * 10.9)); // 436
    expect(scaled.scaledDef).toBe(Math.floor(50 * 10.9)); // 545
    expect(scaled.scaledMdef).toBe(Math.floor(60 * 10.9)); // 654
    expect(scaled.scaledLuck).toBe(Math.floor(70 * 10.9)); // 763
    expect(scaled.hp).toBe(Math.floor(10 * 10.9) * 18 + 100); // 109*18+100 = 2062
  });

  it("HP formula: scaledVit * 18 + 100", () => {
    const scaled = scaleMonster(baseMonster, 1);
    expect(scaled.hp).toBe(scaled.scaledVit * 18 + 100);
  });

  it("preserves base monster properties", () => {
    const scaled = scaleMonster(baseMonster, 5);
    expect(scaled.name).toBe("テストモンスター");
    expect(scaled.element).toBe("火");
    expect(scaled.attackType).toBe("物理");
    expect(scaled.mov).toBe(8);
    expect(scaled.captureRate).toBe(5);
    expect(scaled.exp).toBe(100);
    expect(scaled.gold).toBe(200);
  });

  it("uses Math.floor for fractional stat values", () => {
    // level=2 → multiplier = 0.1+1 = 1.1
    // vit=10 → 10*1.1 = 11 (exact)
    // atk=30 → 30*1.1 = 33 (exact)
    // luck=70 → 70*1.1 = 77 (exact)
    const scaled = scaleMonster(baseMonster, 2);
    expect(scaled.scaledVit).toBe(11);
    expect(scaled.scaledAtk).toBe(33);
    expect(scaled.scaledLuck).toBe(77);
  });

  it("floor behavior with non-round multiplier", () => {
    // level=3 → multiplier = (3-1)*0.1 + 1 = 1.2
    // vit=10 → 10*1.2 = 12
    // spd=20 → 20*1.2 = 24
    const scaled = scaleMonster(baseMonster, 3);
    expect(scaled.scaledVit).toBe(Math.floor(10 * 1.2));
    expect(scaled.scaledSpd).toBe(Math.floor(20 * 1.2));
  });

  it("level 51: multiplier = 6.0", () => {
    const scaled = scaleMonster(baseMonster, 51);
    expect(scaled.scaledVit).toBe(60);
    expect(scaled.scaledAtk).toBe(180);
    expect(scaled.hp).toBe(60 * 18 + 100); // 1180
  });

  it("level with fractional floor: baseStat=7, level=4 → 7*1.3=9.1 → 9", () => {
    const monster: MonsterBase = {
      ...baseMonster,
      vit: 7,
    };
    const scaled = scaleMonster(monster, 4);
    // multiplier = (4-1)*0.1 + 1 = 1.3, 7*1.3 = 9.1 → floor → 9
    expect(scaled.scaledVit).toBe(9);
    expect(scaled.hp).toBe(9 * 18 + 100); // 262
  });

  it("zero base stats remain zero at any level", () => {
    const monster: MonsterBase = {
      ...baseMonster,
      vit: 0,
      atk: 0,
      int: 0,
    };
    const scaled = scaleMonster(monster, 100);
    expect(scaled.scaledVit).toBe(0);
    expect(scaled.scaledAtk).toBe(0);
    expect(scaled.scaledInt).toBe(0);
    expect(scaled.hp).toBe(0 * 18 + 100); // 100
  });
});
