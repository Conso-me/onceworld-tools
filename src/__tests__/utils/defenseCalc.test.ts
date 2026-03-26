import { describe, it, expect } from "vitest";
import {
  calcPhysicalDefenseRequirement,
  calcMagicalDefenseRequirement,
  calcDamage,
  canNullifyDamage,
  calcAdditionalDefNeeded,
  calcDefenseRequirements,
} from "../../utils/defenseCalc";

// ---------------------------------------------------------------------------
// calcPhysicalDefenseRequirement
// ---------------------------------------------------------------------------
describe("calcPhysicalDefenseRequirement", () => {
  it("calculates defOnly = ceil(ATK * 1.75)", () => {
    const req = calcPhysicalDefenseRequirement(100);
    expect(req.defOnly).toBe(Math.ceil(100 * 1.75)); // 175
  });

  it("calculates mdefOnly = ceil(ATK * 17.5)", () => {
    const req = calcPhysicalDefenseRequirement(100);
    expect(req.mdefOnly).toBe(Math.ceil(100 * 17.5)); // 1750
  });

  it("ATK = 0 → both are 0", () => {
    const req = calcPhysicalDefenseRequirement(0);
    expect(req.defOnly).toBe(0);
    expect(req.mdefOnly).toBe(0);
  });

  it("rounds up fractional thresholds", () => {
    // ATK=57 → threshold=99.75 → defOnly=ceil(99.75)=100
    const req = calcPhysicalDefenseRequirement(57);
    expect(req.defOnly).toBe(Math.ceil(57 * 1.75)); // 100
    expect(req.mdefOnly).toBe(Math.ceil(57 * 17.5)); // 998
  });

  it("large ATK value", () => {
    const req = calcPhysicalDefenseRequirement(10000);
    expect(req.defOnly).toBe(17500);
    expect(req.mdefOnly).toBe(175000);
  });
});

// ---------------------------------------------------------------------------
// calcMagicalDefenseRequirement
// ---------------------------------------------------------------------------
describe("calcMagicalDefenseRequirement", () => {
  it("calculates defOnly = ceil(INT * 17.5) (DEF contributes 1/10)", () => {
    const req = calcMagicalDefenseRequirement(100);
    expect(req.defOnly).toBe(Math.ceil(100 * 17.5)); // 1750
  });

  it("calculates mdefOnly = ceil(INT * 1.75)", () => {
    const req = calcMagicalDefenseRequirement(100);
    expect(req.mdefOnly).toBe(Math.ceil(100 * 1.75)); // 175
  });

  it("INT = 0 → both are 0", () => {
    const req = calcMagicalDefenseRequirement(0);
    expect(req.defOnly).toBe(0);
    expect(req.mdefOnly).toBe(0);
  });

  it("rounds up fractional thresholds", () => {
    const req = calcMagicalDefenseRequirement(57);
    expect(req.defOnly).toBe(Math.ceil(57 * 17.5));
    expect(req.mdefOnly).toBe(Math.ceil(57 * 1.75));
  });
});

// ---------------------------------------------------------------------------
// calcDamage
// ---------------------------------------------------------------------------
describe("calcDamage", () => {
  it("physical damage: reduction = DEF + MDEF/10", () => {
    // ATK=200, DEF=100, MDEF=50 → reduction = 100 + 50/10 = 105
    // base = (200*1.75 - 105)*4*1.0 = (350-105)*4 = 245*4 = 980
    const result = calcDamage(200, 100, 50, true);
    expect(result.min).toBe(Math.floor(980 * 0.9));
    expect(result.max).toBe(Math.ceil(980 * 1.1));
    expect(result.average).toBe(Math.round(980));
  });

  it("magical damage: reduction = MDEF + DEF/10", () => {
    // INT=200, DEF=50, MDEF=100 → reduction = 100 + 50/10 = 105
    // base = (200*1.75 - 105)*4*1.0 = 980
    const result = calcDamage(200, 50, 100, false);
    expect(result.min).toBe(Math.floor(980 * 0.9));
    expect(result.max).toBe(Math.ceil(980 * 1.1));
    expect(result.average).toBe(Math.round(980));
  });

  it("nullified when base <= 0", () => {
    // ATK=10, DEF=500, MDEF=0 → reduction=500, base=(17.5-500)*4 < 0
    const result = calcDamage(10, 500, 0, true);
    expect(result.min).toBe(1);
    expect(result.max).toBe(9);
    expect(result.average).toBe(5);
  });

  it("element multiplier increases damage", () => {
    // ATK=100, DEF=0, MDEF=0 → base = 100*1.75*4*1.5 = 1050
    const result = calcDamage(100, 0, 0, true, 1.5);
    expect(result.average).toBe(Math.round(1050));
  });

  it("element multiplier defaults to 1.0", () => {
    const r1 = calcDamage(100, 0, 0, true);
    const r2 = calcDamage(100, 0, 0, true, 1.0);
    expect(r1).toEqual(r2);
  });

  it("element multiplier 0.5 halves damage", () => {
    // ATK=100, DEF=0, MDEF=0 → base = 100*1.75*4*0.5 = 350
    const result = calcDamage(100, 0, 0, true, 0.5);
    expect(result.average).toBe(Math.round(350));
  });

  it("zero attacker stat → nullified", () => {
    const result = calcDamage(0, 0, 0, true);
    expect(result.min).toBe(1);
    expect(result.max).toBe(9);
    expect(result.average).toBe(5);
  });

  it("max uses ceil for positive damage (unlike damageCalc which uses floor)", () => {
    // ATK=100, DEF=0, MDEF=0 → base=700
    // max = ceil(700*1.1) = ceil(770) = 770
    const result = calcDamage(100, 0, 0, true);
    expect(result.max).toBe(Math.ceil(700 * 1.1));
  });
});

// ---------------------------------------------------------------------------
// canNullifyDamage
// ---------------------------------------------------------------------------
describe("canNullifyDamage", () => {
  it("physical: DEF + MDEF/10 >= ATK*1.75 → true", () => {
    // ATK=100 → threshold=175, DEF=175, MDEF=0 → 175 >= 175
    expect(canNullifyDamage(100, 175, 0, true)).toBe(true);
  });

  it("physical: DEF + MDEF/10 < ATK*1.75 → false", () => {
    expect(canNullifyDamage(100, 174, 0, true)).toBe(false);
  });

  it("physical: MDEF can contribute to nullification", () => {
    // ATK=100 → threshold=175, DEF=165, MDEF=100 → 165 + 10 = 175 >= 175
    expect(canNullifyDamage(100, 165, 100, true)).toBe(true);
  });

  it("magical: MDEF + DEF/10 >= INT*1.75 → true", () => {
    // INT=100 → threshold=175, MDEF=175, DEF=0
    expect(canNullifyDamage(100, 0, 175, false)).toBe(true);
  });

  it("magical: MDEF + DEF/10 < INT*1.75 → false", () => {
    expect(canNullifyDamage(100, 0, 174, false)).toBe(false);
  });

  it("zero attacker stat → always nullified", () => {
    expect(canNullifyDamage(0, 0, 0, true)).toBe(true);
    expect(canNullifyDamage(0, 0, 0, false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calcAdditionalDefNeeded
// ---------------------------------------------------------------------------
describe("calcAdditionalDefNeeded", () => {
  it("physical: already nullified → both 0", () => {
    const result = calcAdditionalDefNeeded(100, 200, 0, true);
    expect(result.additionalDef).toBe(0);
    expect(result.additionalMdef).toBe(0);
  });

  it("physical: needs more DEF", () => {
    // ATK=100 → threshold=175, DEF=100, MDEF=0 → need 75 more DEF
    const result = calcAdditionalDefNeeded(100, 100, 0, true);
    expect(result.additionalDef).toBe(Math.max(0, Math.ceil(175 - 100 - 0)));
    expect(result.additionalDef).toBe(75);
  });

  it("physical: needs more MDEF", () => {
    // ATK=100 → threshold=175, DEF=100, MDEF=0
    // additionalMdef = ceil((175-100)*10 - 0) = 750
    const result = calcAdditionalDefNeeded(100, 100, 0, true);
    expect(result.additionalMdef).toBe(750);
  });

  it("magical: needs more MDEF", () => {
    // INT=100 → threshold=175, DEF=0, MDEF=100
    // additionalMdef = ceil(175 - 100 - 0) = 75
    const result = calcAdditionalDefNeeded(100, 0, 100, false);
    expect(result.additionalMdef).toBe(75);
  });

  it("magical: needs more DEF", () => {
    // INT=100 → threshold=175, DEF=0, MDEF=100
    // additionalDef = ceil((175-100)*10 - 0) = 750
    const result = calcAdditionalDefNeeded(100, 0, 100, false);
    expect(result.additionalDef).toBe(750);
  });

  it("existing defense partially reduces the need", () => {
    // ATK=100 → threshold=175, DEF=50, MDEF=200
    // physical: 50 + 200/10 = 70 < 175
    // additionalDef = ceil(175 - 50 - 200/10) = ceil(175 - 50 - 20) = 105
    const result = calcAdditionalDefNeeded(100, 50, 200, true);
    expect(result.additionalDef).toBe(105);
  });
});

// ---------------------------------------------------------------------------
// calcDefenseRequirements
// ---------------------------------------------------------------------------
describe("calcDefenseRequirements", () => {
  it("combines physical and magical requirements", () => {
    const result = calcDefenseRequirements(100, 200);

    expect(result.physical.defOnly).toBe(Math.ceil(100 * 1.75));
    expect(result.physical.mdefOnly).toBe(Math.ceil(100 * 17.5));
    expect(result.magical.defOnly).toBe(Math.ceil(200 * 17.5));
    expect(result.magical.mdefOnly).toBe(Math.ceil(200 * 1.75));
  });

  it("both zero", () => {
    const result = calcDefenseRequirements(0, 0);
    expect(result.physical.defOnly).toBe(0);
    expect(result.physical.mdefOnly).toBe(0);
    expect(result.magical.defOnly).toBe(0);
    expect(result.magical.mdefOnly).toBe(0);
  });
});
