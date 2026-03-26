import { describe, it, expect } from "vitest";
import {
  GOLD_DROP_RATE,
  calcEffectiveDropRate,
  calcDropsPerHour,
} from "../../utils/dropCalc";

// ---------------------------------------------------------------------------
// GOLD_DROP_RATE
// ---------------------------------------------------------------------------
describe("GOLD_DROP_RATE", () => {
  it("is 0.30", () => {
    expect(GOLD_DROP_RATE).toBe(0.30);
  });
});

// ---------------------------------------------------------------------------
// calcEffectiveDropRate
// ---------------------------------------------------------------------------
describe("calcEffectiveDropRate", () => {
  it("no bonus: returns base rate unchanged", () => {
    expect(calcEffectiveDropRate(10, 0)).toBe(10);
  });

  it("50% bonus: baseRate * 1.5", () => {
    expect(calcEffectiveDropRate(10, 50)).toBeCloseTo(15);
  });

  it("100% bonus: doubles base rate", () => {
    expect(calcEffectiveDropRate(10, 100)).toBeCloseTo(20);
  });

  it("capped at 100%", () => {
    // baseRate=80, bonus=50% → 80*1.5 = 120 → capped at 100
    expect(calcEffectiveDropRate(80, 50)).toBe(100);
  });

  it("exactly 100% stays at 100", () => {
    expect(calcEffectiveDropRate(100, 0)).toBe(100);
  });

  it("base rate 0 → always 0", () => {
    expect(calcEffectiveDropRate(0, 100)).toBe(0);
  });

  it("high bonus with low base rate", () => {
    // 1% base, 500% bonus → 1 * 6 = 6
    expect(calcEffectiveDropRate(1, 500)).toBeCloseTo(6);
  });

  it("cap works with extreme bonus", () => {
    // 50% base, 10000% bonus → 50 * 101 = 5050 → capped at 100
    expect(calcEffectiveDropRate(50, 10000)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calcDropsPerHour
// ---------------------------------------------------------------------------
describe("calcDropsPerHour", () => {
  it("basic calculation with single monster", () => {
    const monsters = [{ count: 5, dropRate: 10 }]; // 10% base drop rate
    const secondsPerRun = 60; // 60 runs/hr
    const bonus = 0;

    const result = calcDropsPerHour(monsters, secondsPerRun, bonus);
    // effectiveRate = 10/100 = 0.1
    // killsPerHour = 5 * 60 = 300
    // normal = 0.1 * 300 = 30
    // rare = 0.01 * 300 = 3
    // superRare = 0.001 * 300 = 0.3
    expect(result.normal).toBeCloseTo(30);
    expect(result.rare).toBeCloseTo(3);
    expect(result.superRare).toBeCloseTo(0.3);
  });

  it("0 seconds per run → all zeros", () => {
    const monsters = [{ count: 5, dropRate: 10 }];
    const result = calcDropsPerHour(monsters, 0, 0);
    expect(result.normal).toBe(0);
    expect(result.rare).toBe(0);
    expect(result.superRare).toBe(0);
  });

  it("negative seconds per run → all zeros", () => {
    const monsters = [{ count: 5, dropRate: 10 }];
    const result = calcDropsPerHour(monsters, -1, 0);
    expect(result.normal).toBe(0);
    expect(result.rare).toBe(0);
    expect(result.superRare).toBe(0);
  });

  it("empty monsters → all zeros", () => {
    const result = calcDropsPerHour([], 60, 0);
    expect(result.normal).toBe(0);
    expect(result.rare).toBe(0);
    expect(result.superRare).toBe(0);
  });

  it("drop bonus increases effective rate", () => {
    const monsters = [{ count: 1, dropRate: 10 }];
    const secondsPerRun = 3600; // 1 run/hr
    const noBonus = calcDropsPerHour(monsters, secondsPerRun, 0);
    const withBonus = calcDropsPerHour(monsters, secondsPerRun, 100);

    // 100% bonus doubles the rate
    expect(withBonus.normal).toBeCloseTo(noBonus.normal * 2);
    expect(withBonus.rare).toBeCloseTo(noBonus.rare * 2);
    expect(withBonus.superRare).toBeCloseTo(noBonus.superRare * 2);
  });

  it("multiple monsters accumulate", () => {
    const monsters = [
      { count: 3, dropRate: 20 },
      { count: 2, dropRate: 10 },
    ];
    const secondsPerRun = 3600; // 1 run/hr

    const result = calcDropsPerHour(monsters, secondsPerRun, 0);
    // Monster A: rate=0.20, kills=3, normal=0.6
    // Monster B: rate=0.10, kills=2, normal=0.2
    // total normal = 0.8
    expect(result.normal).toBeCloseTo(0.8);
    expect(result.rare).toBeCloseTo(0.08);
    expect(result.superRare).toBeCloseTo(0.008);
  });

  it("rare is normal/10, superRare is normal/100", () => {
    const monsters = [{ count: 10, dropRate: 50 }];
    const result = calcDropsPerHour(monsters, 3600, 0);
    expect(result.rare).toBeCloseTo(result.normal / 10);
    expect(result.superRare).toBeCloseTo(result.normal / 100);
  });

  it("count 0 → no drops from that monster", () => {
    const monsters = [{ count: 0, dropRate: 100 }];
    const result = calcDropsPerHour(monsters, 60, 0);
    expect(result.normal).toBe(0);
    expect(result.rare).toBe(0);
    expect(result.superRare).toBe(0);
  });

  it("drop rate capped at 100 even with high bonus", () => {
    const monsters = [{ count: 1, dropRate: 80 }];
    const secondsPerRun = 3600;

    // bonus=100% → 80*2 = 160 → capped at 100
    const result = calcDropsPerHour(monsters, secondsPerRun, 100);
    // effectiveRate = 100/100 = 1.0, kills=1
    expect(result.normal).toBeCloseTo(1.0);
  });
});
