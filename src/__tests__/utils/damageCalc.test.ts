import { describe, it, expect } from "vitest";
import {
  calcEffectiveDef,
  calcPhysicalDamage,
  calcPlayerMagicDamage,
  calcPetMagicDamage,
  calcMultiHitCount,
  calcHitsToKill,
  calcMinAtkToHit,
  calcMinIntToHitMadan,
  calcMinIntToHit,
  calcAtkForKill,
  calcHitRate,
  calcIntForKill,
} from "../../utils/damageCalc";

// ---------------------------------------------------------------------------
// calcEffectiveDef
// ---------------------------------------------------------------------------
describe("calcEffectiveDef", () => {
  it("physical: DEF + floor(M-DEF / 10)", () => {
    expect(calcEffectiveDef(100, 50, true)).toBe(100 + Math.floor(50 / 10)); // 105
  });

  it("magical: M-DEF + ceil(DEF / 10)", () => {
    expect(calcEffectiveDef(100, 50, false)).toBe(50 + Math.ceil(100 / 10)); // 60
  });

  it("physical with zero mdef", () => {
    expect(calcEffectiveDef(200, 0, true)).toBe(200);
  });

  it("magical with zero def", () => {
    expect(calcEffectiveDef(0, 200, false)).toBe(200);
  });

  it("both zero", () => {
    expect(calcEffectiveDef(0, 0, true)).toBe(0);
    expect(calcEffectiveDef(0, 0, false)).toBe(0);
  });

  it("floors fractional mdef/10 for physical", () => {
    // 77 / 10 = 7.7 → floor → 7
    expect(calcEffectiveDef(100, 77, true)).toBe(107);
  });

  it("ceils fractional def/10 for magical", () => {
    // 33 / 10 = 3.3 → ceil → 4
    expect(calcEffectiveDef(33, 100, false)).toBe(104);
  });
});

// ---------------------------------------------------------------------------
// calcPhysicalDamage
// ---------------------------------------------------------------------------
describe("calcPhysicalDamage", () => {
  it("returns correct damage range for normal hit", () => {
    // ATK=100, DEF=50, MDEF=30 → effectiveDef=50+3=53
    // base = max(100*1.75 - 53, 0)*4*1.0 = (175-53)*4 = 122*4 = 488
    const result = calcPhysicalDamage(100, 50, 30);
    expect(result.isNullified).toBe(false);
    expect(result.avg).toBe(Math.floor(488));
    expect(result.min).toBe(Math.floor(488 * 0.9));
    expect(result.max).toBe(Math.floor(488 * 1.1));
  });

  it("returns nullified damage when base <= 0", () => {
    // ATK=10, DEF=500, MDEF=0 → effectiveDef=500
    // base = max(10*1.75 - 500, 0)*4 = 0
    const result = calcPhysicalDamage(10, 500, 0);
    expect(result.isNullified).toBe(true);
    expect(result.min).toBe(1);
    expect(result.max).toBe(9);
    expect(result.avg).toBe(5);
    expect(result.critMin).toBe(1);
    expect(result.critMax).toBe(9);
    expect(result.critAvg).toBe(5);
  });

  it("applies element affinity multiplier", () => {
    // ATK=200, DEF=0, MDEF=0 → effectiveDef=0
    // base = 200*1.75*4*1.5 = 2100
    const result = calcPhysicalDamage(200, 0, 0, 1.5);
    expect(result.avg).toBe(Math.floor(2100));
    expect(result.isNullified).toBe(false);
  });

  it("element affinity defaults to 1.0", () => {
    const r1 = calcPhysicalDamage(200, 0, 0);
    const r2 = calcPhysicalDamage(200, 0, 0, 1.0);
    expect(r1).toEqual(r2);
  });

  it("crit is 2.5x of min/max/avg", () => {
    const result = calcPhysicalDamage(100, 0, 0);
    // base = 100*1.75*4 = 700
    expect(result.critMin).toBe(Math.floor(Math.floor(700 * 0.9) * 2.5));
    expect(result.critMax).toBe(Math.floor(Math.floor(700 * 1.1) * 2.5));
    expect(result.critAvg).toBe(Math.floor(Math.floor(700) * 2.5));
  });

  it("zero ATK against zero defense", () => {
    const result = calcPhysicalDamage(0, 0, 0);
    // base = 0*1.75*4 = 0 → nullified
    expect(result.isNullified).toBe(true);
  });

  it("exact threshold: ATK*1.75 == effectiveDef → base=0 → nullified", () => {
    // ATK=100, need effectiveDef = 175
    // DEF=175, MDEF=0 → effectiveDef=175
    const result = calcPhysicalDamage(100, 175, 0);
    // base = max(175 - 175, 0)*4 = 0
    expect(result.isNullified).toBe(true);
  });

  it("just above threshold: ATK*1.75 > effectiveDef by a fraction", () => {
    // ATK=101, DEF=175, MDEF=0 → effectiveDef=175
    // base = (101*1.75 - 175)*4 = (176.75 - 175)*4 = 1.75*4 = 7.0
    const result = calcPhysicalDamage(101, 175, 0);
    expect(result.isNullified).toBe(false);
    expect(result.avg).toBe(Math.floor(7));
  });
});

// ---------------------------------------------------------------------------
// calcPlayerMagicDamage
// ---------------------------------------------------------------------------
describe("calcPlayerMagicDamage", () => {
  it("calculates with INT, analysisBook, and magicMult", () => {
    // INT=200, book=50, mult=2.0, DEF=30, MDEF=100
    // effectiveDef(magic) = 100 + floor(30/10) = 103
    // rawAtk = 250, base = max(250*1.25*2.0 - 103, 0)*4 = (625-103)*4 = 2088
    const result = calcPlayerMagicDamage(200, 50, 2.0, 30, 100);
    expect(result.isNullified).toBe(false);
    expect(result.avg).toBe(Math.floor(2088));
  });

  it("nullified when (INT+book)*1.25*mult <= effectiveDef", () => {
    const result = calcPlayerMagicDamage(10, 0, 1.0, 0, 500);
    // effectiveDef = 500, rawAtk = 10, base = max(10*1.25*1 - 500, 0)*4 = 0
    expect(result.isNullified).toBe(true);
    expect(result.min).toBe(1);
    expect(result.max).toBe(9);
    expect(result.avg).toBe(5);
  });

  it("applies element affinity", () => {
    // INT=100, book=0, mult=1.0, DEF=0, MDEF=0
    // base = 100*1.25*1*4*2.0 = 1000
    const result = calcPlayerMagicDamage(100, 0, 1.0, 0, 0, 2.0);
    expect(result.avg).toBe(Math.floor(1000));
  });

  it("book adds to INT before multiplication", () => {
    // INT=0, book=100, mult=1.0, DEF=0, MDEF=0
    // base = (0+100)*1.25*1.0*4*1.0 = 500
    const result = calcPlayerMagicDamage(0, 100, 1.0, 0, 0);
    expect(result.avg).toBe(Math.floor(500));
    expect(result.isNullified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calcPetMagicDamage
// ---------------------------------------------------------------------------
describe("calcPetMagicDamage", () => {
  it("uses INT*1.75 with magical defense", () => {
    // INT=100, DEF=50, MDEF=80
    // effectiveDef(magic) = 80 + floor(50/10) = 85
    // base = max(100*1.75 - 85, 0)*4 = (175-85)*4 = 360
    const result = calcPetMagicDamage(100, 50, 80);
    expect(result.isNullified).toBe(false);
    expect(result.avg).toBe(Math.floor(360));
  });

  it("nullified when INT*1.75 <= effectiveDef", () => {
    const result = calcPetMagicDamage(10, 0, 500);
    expect(result.isNullified).toBe(true);
  });

  it("applies element affinity", () => {
    // INT=100, DEF=0, MDEF=0
    // base = 100*1.75*4*0.5 = 350
    const result = calcPetMagicDamage(100, 0, 0, 0.5);
    expect(result.avg).toBe(Math.floor(350));
  });
});

// ---------------------------------------------------------------------------
// calcMultiHitCount
// ---------------------------------------------------------------------------
describe("calcMultiHitCount", () => {
  it("player magic always returns 1", () => {
    expect(calcMultiHitCount(999999, true)).toBe(1);
    expect(calcMultiHitCount(0, true)).toBe(1);
    expect(calcMultiHitCount(100000, true)).toBe(1);
  });

  it("SPD < 3000 → 1 hit", () => {
    expect(calcMultiHitCount(0, false)).toBe(1);
    expect(calcMultiHitCount(2999, false)).toBe(1);
  });

  it("SPD = 3000 → 2 hits (boundary)", () => {
    expect(calcMultiHitCount(3000, false)).toBe(2);
  });

  it("SPD 3001-8999 → 2 hits", () => {
    expect(calcMultiHitCount(5000, false)).toBe(2);
    expect(calcMultiHitCount(8999, false)).toBe(2);
  });

  it("SPD = 9000 → 3 hits (boundary)", () => {
    expect(calcMultiHitCount(9000, false)).toBe(3);
  });

  it("SPD 9001-26999 → 3 hits", () => {
    expect(calcMultiHitCount(9001, false)).toBe(3);
    expect(calcMultiHitCount(26999, false)).toBe(3);
  });

  it("SPD = 27000 → 4 hits (boundary)", () => {
    expect(calcMultiHitCount(27000, false)).toBe(4);
  });

  it("SPD = 81000 → 5 hits (boundary)", () => {
    expect(calcMultiHitCount(81000, false)).toBe(5);
  });

  it("SPD = 243000 → 6 hits (boundary)", () => {
    expect(calcMultiHitCount(243000, false)).toBe(6);
  });

  it("SPD = 729000 → 7 hits (boundary)", () => {
    expect(calcMultiHitCount(729000, false)).toBe(7);
  });

  it("SPD = 2187000 → 8 hits (boundary)", () => {
    expect(calcMultiHitCount(2_187_000, false)).toBe(8);
  });

  it("SPD = 6561000 → 9 hits (boundary)", () => {
    expect(calcMultiHitCount(6_561_000, false)).toBe(9);
  });

  it("SPD = 19683000 → 10 hits (boundary)", () => {
    expect(calcMultiHitCount(19_683_000, false)).toBe(10);
  });

  it("SPD = 59049000 → 11 hits (boundary)", () => {
    expect(calcMultiHitCount(59_049_000, false)).toBe(11);
  });

  it("SPD = 177147000 → 12 hits (boundary)", () => {
    expect(calcMultiHitCount(177_147_000, false)).toBe(12);
  });

  it("SPD > 177147000 → continues beyond 12 (no cap)", () => {
    expect(calcMultiHitCount(531_441_000, false)).toBe(13); // 3000 × 3^11
    expect(calcMultiHitCount(1_594_323_000, false)).toBe(14); // 3000 × 3^12
  });
});

// ---------------------------------------------------------------------------
// calcHitsToKill
// ---------------------------------------------------------------------------
describe("calcHitsToKill", () => {
  it("exact division", () => {
    // 1000 HP, 100 dmg, 2 hits = 200 dmg/turn → ceil(1000/200) = 5
    expect(calcHitsToKill(1000, 100, 2)).toBe(5);
  });

  it("rounds up when not exact", () => {
    // 1001 HP, 100 dmg, 2 hits = 200 dmg/turn → ceil(1001/200) = 6
    expect(calcHitsToKill(1001, 100, 2)).toBe(6);
  });

  it("single hit kill", () => {
    expect(calcHitsToKill(100, 100, 1)).toBe(1);
  });

  it("0 damage per hit returns Infinity", () => {
    expect(calcHitsToKill(1000, 0, 1)).toBe(Infinity);
  });

  it("negative damage per hit returns Infinity", () => {
    expect(calcHitsToKill(1000, -5, 1)).toBe(Infinity);
  });

  it("1 HP enemy, 1 dmg → 1 turn", () => {
    expect(calcHitsToKill(1, 1, 1)).toBe(1);
  });

  it("multiHit increases effective damage per turn", () => {
    // 100 HP, 10 dmg, 5 hits → 50 dmg/turn → ceil(100/50) = 2
    expect(calcHitsToKill(100, 10, 5)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// calcMinAtkToHit
// ---------------------------------------------------------------------------
describe("calcMinAtkToHit", () => {
  it("basic case: ceil(effectiveDef / 1.75)", () => {
    // DEF=100, MDEF=50 → physical effectiveDef = 100 + 5 = 105
    // ceil(105 / 1.75) = ceil(60) = 60
    expect(calcMinAtkToHit(100, 50)).toBe(60);
  });

  it("zero defense → 0 ATK needed", () => {
    expect(calcMinAtkToHit(0, 0)).toBe(0);
  });

  it("rounds up fractional result", () => {
    // DEF=100, MDEF=0 → effectiveDef=100
    // 100 / 1.75 = 57.14... → ceil → 58
    expect(calcMinAtkToHit(100, 0)).toBe(Math.ceil(100 / 1.75));
  });

  it("mdef contributes 1/10 to physical effective defense", () => {
    // DEF=0, MDEF=100 → effectiveDef = 0 + 10 = 10
    // ceil(10 / 1.75) = ceil(5.71) = 6
    expect(calcMinAtkToHit(0, 100)).toBe(Math.ceil(10 / 1.75));
  });
});

// ---------------------------------------------------------------------------
// calcMinIntToHitMadan
// ---------------------------------------------------------------------------
describe("calcMinIntToHitMadan", () => {
  it("uses magical effective defense", () => {
    // DEF=50, MDEF=100 → magic effectiveDef = 100 + 5 = 105
    // ceil(105 / 1.75) = 60
    expect(calcMinIntToHitMadan(50, 100)).toBe(60);
  });

  it("zero defense → 0", () => {
    expect(calcMinIntToHitMadan(0, 0)).toBe(0);
  });

  it("def contributes 1/10 to magical effective defense", () => {
    // DEF=100, MDEF=0 → magic effectiveDef = 0 + 10 = 10
    expect(calcMinIntToHitMadan(100, 0)).toBe(Math.ceil(10 / 1.75));
  });
});

// ---------------------------------------------------------------------------
// calcMinIntToHit (player magic)
// ---------------------------------------------------------------------------
describe("calcMinIntToHit", () => {
  it("basic case with magicMult and analysisBook", () => {
    // DEF=30, MDEF=100 → effectiveDef = 100 + 3 = 103
    // ceil(103 / (1.25 * 2.0) - 50) = ceil(103/2.5 - 50) = ceil(41.2 - 50) = ceil(-8.8) = -8 → max(0) = 0
    expect(calcMinIntToHit(30, 100, 2.0, 50)).toBe(0);
  });

  it("no book, mult=1", () => {
    // DEF=0, MDEF=100 → effectiveDef = 100
    // ceil(100 / 1.25 - 0) = ceil(80) = 80
    expect(calcMinIntToHit(0, 100, 1.0, 0)).toBe(80);
  });

  it("book reduces required INT", () => {
    // DEF=0, MDEF=125 → effectiveDef = 125
    // ceil(125 / 1.25 - 50) = ceil(100 - 50) = 50
    expect(calcMinIntToHit(0, 125, 1.0, 50)).toBe(50);
  });

  it("result clamped to 0 when book exceeds requirement", () => {
    expect(calcMinIntToHit(0, 10, 1.0, 9999)).toBe(0);
  });

  it("higher magicMult reduces required INT", () => {
    // DEF=0, MDEF=100 → effectiveDef = 100
    // mult=2.0: ceil(100 / 2.5 - 0) = ceil(40) = 40
    // mult=4.0: ceil(100 / 5.0 - 0) = ceil(20) = 20
    expect(calcMinIntToHit(0, 100, 2.0, 0)).toBe(40);
    expect(calcMinIntToHit(0, 100, 4.0, 0)).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// calcAtkForKill
// ---------------------------------------------------------------------------
describe("calcAtkForKill", () => {
  it("calculates ATK needed to kill in N turns", () => {
    const atk = calcAtkForKill(1000, 50, 30, 1.0, 1, 1);
    // Verify the returned ATK actually kills in 1 turn
    const dmg = calcPhysicalDamage(atk, 50, 30, 1.0);
    expect(dmg.min).toBeGreaterThanOrEqual(1000);
  });

  it("multi-hit reduces required ATK", () => {
    const atk1hit = calcAtkForKill(1000, 0, 0, 1.0, 1, 1);
    const atk5hit = calcAtkForKill(1000, 0, 0, 1.0, 5, 1);
    expect(atk5hit).toBeLessThan(atk1hit);
  });

  it("more turns reduces required ATK", () => {
    const atk1turn = calcAtkForKill(1000, 0, 0, 1.0, 1, 1);
    const atk3turn = calcAtkForKill(1000, 0, 0, 1.0, 1, 3);
    expect(atk3turn).toBeLessThan(atk1turn);
  });

  it("higher element affinity reduces required ATK", () => {
    const atkNormal = calcAtkForKill(1000, 0, 0, 1.0, 1, 1);
    const atkSuper = calcAtkForKill(1000, 0, 0, 1.5, 1, 1);
    expect(atkSuper).toBeLessThan(atkNormal);
  });

  it("returns 0 when no ATK needed (very low HP)", () => {
    // 0 HP → requiredDmgPerTurn = 0 → requiredBase = 0 → ATK = ceil(effectiveDef/1.75) or 0
    const atk = calcAtkForKill(0, 0, 0, 1.0, 1, 1);
    expect(atk).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calcHitRate
// ---------------------------------------------------------------------------
describe("calcHitRate", () => {
  it("enemyLuck <= 0 → 100%", () => {
    expect(calcHitRate(50, 0)).toBe(100);
    expect(calcHitRate(50, -10)).toBe(100);
  });

  it("very low ratio → 1% (min clamp)", () => {
    expect(calcHitRate(0, 100)).toBe(1);
    expect(calcHitRate(10, 100)).toBe(1);
  });

  it("ratio = 0.5 → ~43% (Hill function, K=0.529)", () => {
    expect(calcHitRate(50, 100)).toBe(43);
  });

  it("ratio = K (0.529) → 50% (inflection point)", () => {
    expect(calcHitRate(529, 1000)).toBe(50);
  });

  it("ratio = 1.0 → ~96%", () => {
    expect(calcHitRate(100, 100)).toBe(96);
  });

  it("ratio >= 2.0 → 100% (max clamp)", () => {
    expect(calcHitRate(200, 100)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calcIntForKill
// ---------------------------------------------------------------------------
describe("calcIntForKill", () => {
  it("calculates INT needed to kill in N turns", () => {
    const int = calcIntForKill(1000, 30, 100, 1.0, 2.0, 50, 1);
    // Player magic has no multi-hit, so verify single-turn kill
    const dmg = calcPlayerMagicDamage(int, 50, 2.0, 30, 100, 1.0);
    expect(dmg.min).toBeGreaterThanOrEqual(1000);
  });

  it("higher magicMult reduces required INT", () => {
    const intLow = calcIntForKill(1000, 0, 0, 1.0, 1.0, 0, 1);
    const intHigh = calcIntForKill(1000, 0, 0, 1.0, 3.0, 0, 1);
    expect(intHigh).toBeLessThan(intLow);
  });

  it("analysisBook reduces required INT", () => {
    const intNoBook = calcIntForKill(1000, 0, 0, 1.0, 1.0, 0, 1);
    const intWithBook = calcIntForKill(1000, 0, 0, 1.0, 1.0, 100, 1);
    expect(intWithBook).toBeLessThan(intNoBook);
  });

  it("more turns reduce required INT", () => {
    const int1 = calcIntForKill(1000, 0, 0, 1.0, 1.0, 0, 1);
    const int5 = calcIntForKill(1000, 0, 0, 1.0, 1.0, 0, 5);
    expect(int5).toBeLessThan(int1);
  });

  it("result clamped to 0", () => {
    // Very low HP, high book
    const int = calcIntForKill(1, 0, 0, 1.0, 1.0, 9999, 1);
    expect(int).toBe(0);
  });
});
