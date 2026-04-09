import { describe, it, expect } from "vitest";
import {
  calcPetMaxLevel,
  calcPetLevelBonus,
  calcPetStat,
  getPetAttackMode,
  calcPetStats,
} from "../../utils/petStatCalc";
import type { PetDamageConfig } from "../../types/game";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockMonster = {
  name: "テスト", level: 0, element: "火" as const, attackType: "物理" as const,
  vit: 10, spd: 8, atk: 12, int: 5, def: 7, mdef: 6, luck: 3,
  mov: 10, captureRate: 3, exp: 100, gold: 50,
};

function makeConfig(overrides: Partial<PetDamageConfig> = {}): PetDamageConfig {
  return {
    petMonsterName: "テスト",
    petLevel: 1,
    sengiCount: 0,
    hadesHelmetCount: 0,
    mushroomFire: 0,
    mushroomWater: 0,
    mushroomWood: 0,
    mushroomLight: 0,
    mushroomDark: 0,
    hasMushroomHouse: false,
    powderVit: 0,
    powderSpd: 0,
    powderAtk: 0,
    powderInt: 0,
    powderDef: 0,
    powderMdef: 0,
    powderLuck: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calcPetMaxLevel
// ---------------------------------------------------------------------------
describe("calcPetMaxLevel", () => {
  it("hadesHelmetCount=0 → 200", () => {
    expect(calcPetMaxLevel(0)).toBe(200);
  });

  it("hadesHelmetCount=500 → 700", () => {
    expect(calcPetMaxLevel(500)).toBe(700);
  });

  it("hadesHelmetCount=1000 → 1200", () => {
    expect(calcPetMaxLevel(1000)).toBe(1200);
  });

  it("hadesHelmetCount=1500 → capped at 1200", () => {
    expect(calcPetMaxLevel(1500)).toBe(1200);
  });
});

// ---------------------------------------------------------------------------
// calcPetLevelBonus
// ---------------------------------------------------------------------------
describe("calcPetLevelBonus", () => {
  it("level=1 → 0", () => {
    expect(calcPetLevelBonus(1)).toBeCloseTo(0, 10);
  });

  it("level=100 → 9.9", () => {
    expect(calcPetLevelBonus(100)).toBeCloseTo(9.9, 10);
  });

  it("level=200 → 19.9", () => {
    expect(calcPetLevelBonus(200)).toBeCloseTo(19.9, 10);
  });

  it("level=201 → 21.0 (dual formula activates above 200)", () => {
    // (201-1)*0.1 + (201-200) = 20.0 + 1.0 = 21.0
    expect(calcPetLevelBonus(201)).toBeCloseTo(21.0, 10);
  });

  it("level=1200 → 1119.9", () => {
    // (1200-1)*0.1 + (1200-200) = 119.9 + 1000 = 1119.9
    expect(calcPetLevelBonus(1200)).toBeCloseTo(1119.9, 10);
  });
});

// ---------------------------------------------------------------------------
// calcPetStat
// ---------------------------------------------------------------------------
describe("calcPetStat", () => {
  it("base=10, powder=0, sengi=0, level=1 → 10", () => {
    // levelBonus=0, floor(10 * (1 + 1*(0+0))) = floor(10) = 10
    expect(calcPetStat(10, 0, 0, 1)).toBe(10);
  });

  it("base=10, powder=5, sengi=0, level=1 → 15", () => {
    // levelBonus=0, floor(15 * (1 + 1*(0+0))) = floor(15) = 15
    expect(calcPetStat(10, 5, 0, 1)).toBe(15);
  });

  it("base=10, powder=0, sengi=0, level=200 → 209", () => {
    // levelBonus=19.9, floor(10 * (1 + 1*(0+19.9))) = floor(10 * 20.9) = 209
    expect(calcPetStat(10, 0, 0, 200)).toBe(209);
  });

  it("base=10, powder=100, sengi=0, level=200 → 2299", () => {
    // levelBonus=19.9, floor(110 * 20.9) = floor(2299) = 2299
    expect(calcPetStat(10, 100, 0, 200)).toBe(2299);
  });

  it("base=10, powder=0, sengi=1, level=200 → 468", () => {
    // levelBonus=19.9, floor(10 * (1 + 2*(3+19.9))) = floor(10 * 46.8) = 468
    expect(calcPetStat(10, 0, 1, 200)).toBe(468);
  });

  it("base=10, powder=0, sengi=30, level=200 → 34079", () => {
    // levelBonus=19.9, floor(10 * (1 + 31*(90+19.9))) = floor(10 * 3407.9) = 34079
    expect(calcPetStat(10, 0, 30, 200)).toBe(34079);
  });

  it("base=10, powder=0, sengi=0, level=201 → 220 (dual formula)", () => {
    // levelBonus=21.0, floor(10 * (1 + 1*(0+21.0))) = floor(10 * 22.0) = 220
    expect(calcPetStat(10, 0, 0, 201)).toBe(220);
  });
});

// ---------------------------------------------------------------------------
// getPetAttackMode
// ---------------------------------------------------------------------------
describe("getPetAttackMode", () => {
  it('"物理" → "物理"', () => {
    expect(getPetAttackMode("物理")).toBe("物理");
  });

  it('"魔弾" → "魔弾"', () => {
    expect(getPetAttackMode("魔弾")).toBe("魔弾");
  });

  it('"魔攻" → "魔弾" (non-物理 maps to 魔弾)', () => {
    expect(getPetAttackMode("魔攻")).toBe("魔弾");
  });
});

// ---------------------------------------------------------------------------
// calcPetStats (integration)
// ---------------------------------------------------------------------------
describe("calcPetStats", () => {
  it("basic: level=1, no powder, no sengi, no mushroom → raw base stats", () => {
    // calcPetStat(base, 0, 0, 1) = floor(base * 1) = base
    const result = calcPetStats(makeConfig(), mockMonster);
    expect(result.final.vit).toBe(10);
    expect(result.final.spd).toBe(8);
    expect(result.final.atk).toBe(12);
    expect(result.final.int).toBe(5);
    expect(result.final.def).toBe(7);
    expect(result.final.mdef).toBe(6);
    expect(result.final.luck).toBe(3);
  });

  it("HP = finalVIT * 18 + 100", () => {
    const result = calcPetStats(makeConfig(), mockMonster);
    // finalVIT=10, HP = 10*18+100 = 280
    expect(result.hp).toBe(280);
  });

  it("element and attackMode are derived from monster", () => {
    const result = calcPetStats(makeConfig(), mockMonster);
    expect(result.element).toBe("火");
    expect(result.attackMode).toBe("物理");
  });

  it("maxLevel is returned and equals calcPetMaxLevel(hadesHelmetCount)", () => {
    const result = calcPetStats(makeConfig({ hadesHelmetCount: 500 }), mockMonster);
    expect(result.maxLevel).toBe(700);
  });

  it("petLevel is clamped to maxLevel", () => {
    // maxLevel=200 (hadesHelmet=0), petLevel=9999 → clamped to 200
    const clamped = calcPetStats(makeConfig({ petLevel: 9999, hadesHelmetCount: 0 }), mockMonster);
    const atMax   = calcPetStats(makeConfig({ petLevel: 200,  hadesHelmetCount: 0 }), mockMonster);
    expect(clamped.final.vit).toBe(atMax.final.vit);
    expect(clamped.final.atk).toBe(atMax.final.atk);
  });

  it("mushroom bonus applies to the highest stat only (atk=12 is highest)", () => {
    // mushroomFire=100 → mushroomBonus=100, applied to atk only
    const result = calcPetStats(makeConfig({ mushroomFire: 100 }), mockMonster);
    // base atk=12 at level=1 → calcPetStat=12, then +100 = 112
    expect(result.final.atk).toBe(112);
    // other stats unchanged from their calcPetStat values
    expect(result.final.vit).toBe(10);
    expect(result.final.spd).toBe(8);
    expect(result.final.int).toBe(5);
  });

  it("mushroom with キノコハウス applies ×100 multiplier", () => {
    // mushroomFire=5, hasMushroomHouse=true → bonus = 5*100 = 500
    const result = calcPetStats(
      makeConfig({ mushroomFire: 5, hasMushroomHouse: true }),
      mockMonster,
    );
    // atk=12 is highest → atk = 12 + 500 = 512
    expect(result.final.atk).toBe(512);
    // vit unchanged
    expect(result.final.vit).toBe(10);
  });

  it("mushroom does not apply when monster element does not match", () => {
    // mushroomWater=100, monster element=火 → bonus for 水 not used → bonus=0
    const result = calcPetStats(makeConfig({ mushroomWater: 100 }), mockMonster);
    expect(result.final.atk).toBe(12);
  });

  it("tie-breaking: when two base stats are equal, earlier in priority (VIT>SPD>ATK…) gets mushroom", () => {
    // Make vit=spd=atk=10 so vit wins the tie-break
    const tiedMonster = { ...mockMonster, element: "火" as const, vit: 10, spd: 10, atk: 10 };
    const result = calcPetStats(makeConfig({ mushroomFire: 50 }), tiedMonster);
    // vit should receive mushroom, spd and atk should not
    expect(result.final.vit).toBe(10 + 50);
    expect(result.final.spd).toBe(10);
    expect(result.final.atk).toBe(10);
  });

  it("powder increases base before mushroom highest-stat comparison", () => {
    // base: atk=12 (highest without powder)
    // add powderVit=5 → vit effective=15 → vit now highest → mushroom goes to vit
    const result = calcPetStats(
      makeConfig({ powderVit: 5, mushroomFire: 20 }),
      mockMonster,
    );
    // vit base=10, powder=5 → calcPetStat(10,5,0,1)=15, then +20 = 35
    expect(result.final.vit).toBe(35);
    // atk stays at calcPetStat(12,0,0,1)=12
    expect(result.final.atk).toBe(12);
  });

  it("HP reflects powdered VIT when vit has powder", () => {
    const result = calcPetStats(makeConfig({ powderVit: 5 }), mockMonster);
    // finalVIT = calcPetStat(10, 5, 0, 1) = 15
    expect(result.hp).toBe(15 * 18 + 100); // 370
  });

  it("sengi multiplier boosts all stats", () => {
    const result = calcPetStats(makeConfig({ petLevel: 200, sengiCount: 1 }), mockMonster);
    // atk: calcPetStat(12, 0, 1, 200) = floor(12 * (1 + 2*(3+19.9))) = floor(12 * 46.8) = floor(561.6) = 561
    expect(result.final.atk).toBe(Math.floor(12 * 46.8));
    // vit: calcPetStat(10, 0, 1, 200) = floor(10 * 46.8) = 468
    expect(result.final.vit).toBe(468);
  });

  it("magic attackType maps to 魔弾 attackMode", () => {
    const magicMonster = { ...mockMonster, attackType: "魔攻" as const };
    const result = calcPetStats(makeConfig(), magicMonster);
    expect(result.attackMode).toBe("魔弾");
  });
});
