import { describe, it, expect } from "vitest";
import {
  calcExpMultiplier,
  calcScaledExp,
  calcExpPerRun,
  calcExpPerHour,
  calcTimeForExp,
} from "../../utils/expCalc";

// ---------------------------------------------------------------------------
// calcExpMultiplier
// ---------------------------------------------------------------------------
describe("calcExpMultiplier", () => {
  it("level 1: max(floor(1^1.1 * 0.2), 1) = max(0, 1) = 1", () => {
    expect(calcExpMultiplier(1)).toBe(1);
  });

  it("level 0: max(floor(0^1.1 * 0.2), 1) = max(0, 1) = 1", () => {
    expect(calcExpMultiplier(0)).toBe(1);
  });

  it("level 10: max(floor(10^1.1 * 0.2), 1)", () => {
    const expected = Math.max(Math.floor(Math.pow(10, 1.1) * 0.2), 1);
    expect(calcExpMultiplier(10)).toBe(expected);
  });

  it("level 50", () => {
    const expected = Math.max(Math.floor(Math.pow(50, 1.1) * 0.2), 1);
    expect(calcExpMultiplier(50)).toBe(expected);
  });

  it("level 100", () => {
    const expected = Math.max(Math.floor(Math.pow(100, 1.1) * 0.2), 1);
    expect(calcExpMultiplier(100)).toBe(expected);
  });

  it("always returns at least 1", () => {
    for (const level of [0, 1, 2, 3]) {
      expect(calcExpMultiplier(level)).toBeGreaterThanOrEqual(1);
    }
  });

  it("monotonically non-decreasing", () => {
    let prev = calcExpMultiplier(1);
    for (let level = 2; level <= 200; level++) {
      const curr = calcExpMultiplier(level);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });
});

// ---------------------------------------------------------------------------
// calcScaledExp
// ---------------------------------------------------------------------------
describe("calcScaledExp", () => {
  it("returns multiplier * baseExp", () => {
    const baseExp = 100;
    const level = 10;
    const expected = calcExpMultiplier(level) * baseExp;
    expect(calcScaledExp(baseExp, level)).toBe(expected);
  });

  it("level 1 with baseExp 100 → 1 * 100 = 100", () => {
    expect(calcScaledExp(100, 1)).toBe(100);
  });

  it("baseExp 0 → always 0", () => {
    expect(calcScaledExp(0, 50)).toBe(0);
  });

  it("scales with level", () => {
    const low = calcScaledExp(100, 1);
    const high = calcScaledExp(100, 100);
    expect(high).toBeGreaterThan(low);
  });
});

// ---------------------------------------------------------------------------
// calcExpPerRun
// ---------------------------------------------------------------------------
describe("calcExpPerRun", () => {
  it("sums scaled exp * count for each monster", () => {
    const monsters = [
      { name: "A", baseExp: 100, level: 1, count: 3 },
      { name: "B", baseExp: 200, level: 10, count: 2 },
    ];
    const expected =
      calcScaledExp(100, 1) * 3 + calcScaledExp(200, 10) * 2;
    expect(calcExpPerRun(monsters)).toBe(expected);
  });

  it("empty array → 0", () => {
    expect(calcExpPerRun([])).toBe(0);
  });

  it("single monster, count 1", () => {
    const monsters = [{ name: "A", baseExp: 50, level: 5, count: 1 }];
    expect(calcExpPerRun(monsters)).toBe(calcScaledExp(50, 5));
  });

  it("count 0 → no contribution", () => {
    const monsters = [{ name: "A", baseExp: 100, level: 10, count: 0 }];
    expect(calcExpPerRun(monsters)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calcExpPerHour
// ---------------------------------------------------------------------------
describe("calcExpPerHour", () => {
  it("basic calculation: expPerRun * (3600/seconds) * (1+bonus/100)", () => {
    // 1000 exp/run, 60 sec/run → 60 runs/hr → 60000/hr
    expect(calcExpPerHour(1000, 60)).toBe(Math.floor(1000 * 60));
  });

  it("0 seconds per run → 0", () => {
    expect(calcExpPerHour(1000, 0)).toBe(0);
  });

  it("negative seconds per run → 0", () => {
    expect(calcExpPerHour(1000, -1)).toBe(0);
  });

  it("applies EXP bonus percent", () => {
    // 1000 exp/run, 60 sec/run, 50% bonus
    // 1000 * 60 * 1.5 = 90000
    expect(calcExpPerHour(1000, 60, 50)).toBe(Math.floor(1000 * 60 * 1.5));
  });

  it("0% bonus is same as no bonus", () => {
    expect(calcExpPerHour(1000, 60, 0)).toBe(calcExpPerHour(1000, 60));
  });

  it("100% bonus doubles exp", () => {
    const base = calcExpPerHour(1000, 60, 0);
    const doubled = calcExpPerHour(1000, 60, 100);
    expect(doubled).toBe(Math.floor(base * 2));
  });

  it("result is floored", () => {
    // 100 exp/run, 7 sec/run → 100 * (3600/7) = 100 * 514.28... = 51428.57 → floor → 51428
    const result = calcExpPerHour(100, 7);
    expect(result).toBe(Math.floor(100 * (3600 / 7)));
  });
});

// ---------------------------------------------------------------------------
// calcTimeForExp
// ---------------------------------------------------------------------------
describe("calcTimeForExp", () => {
  it("0 exp/hr → infinity symbol", () => {
    expect(calcTimeForExp(1000, 0)).toBe("∞");
  });

  it("negative exp/hr → infinity symbol", () => {
    expect(calcTimeForExp(1000, -100)).toBe("∞");
  });

  it("exactly 1 hour", () => {
    expect(calcTimeForExp(1000, 1000)).toBe("1時間0分");
  });

  it("less than 1 hour: shows minutes only", () => {
    // 500 remaining, 1000/hr → 0.5 hours → 30 min
    expect(calcTimeForExp(500, 1000)).toBe("30分");
  });

  it("multiple hours with minutes", () => {
    // 2500 remaining, 1000/hr → 2.5 hours → 2時間30分
    expect(calcTimeForExp(2500, 1000)).toBe("2時間30分");
  });

  it("minutes are ceiled", () => {
    // 1100 remaining, 1000/hr → 1.1 hours
    // Due to floating point: (1.1 - 1) * 60 = 6.000000000000009 → ceil → 7
    expect(calcTimeForExp(1100, 1000)).toBe("1時間7分");
  });

  it("0 remaining exp", () => {
    // 0/1000 = 0 hours → 0分
    expect(calcTimeForExp(0, 1000)).toBe("0分");
  });
});
