import { describe, it, expect } from "vitest";
import { calcGoldPerRun, calcGoldPerHour } from "../../utils/goldCalc";
import { GOLD_DROP_RATE } from "../../utils/dropCalc";

// ---------------------------------------------------------------------------
// calcGoldPerRun
// ---------------------------------------------------------------------------
describe("calcGoldPerRun", () => {
  it("sums gold * count * 0.30 for each monster", () => {
    const monsters = [
      { name: "A", gold: 100, count: 3 },
      { name: "B", gold: 200, count: 2 },
    ];
    // (100*3 + 200*2) * 0.30 = (300+400)*0.30 = 700*0.30 = 210
    const expected = (100 * 3 + 200 * 2) * GOLD_DROP_RATE;
    expect(calcGoldPerRun(monsters)).toBeCloseTo(expected);
  });

  it("empty array → 0", () => {
    expect(calcGoldPerRun([])).toBe(0);
  });

  it("single monster", () => {
    const monsters = [{ name: "A", gold: 500, count: 1 }];
    expect(calcGoldPerRun(monsters)).toBeCloseTo(500 * 1 * GOLD_DROP_RATE);
  });

  it("count 0 → no gold", () => {
    const monsters = [{ name: "A", gold: 1000, count: 0 }];
    expect(calcGoldPerRun(monsters)).toBe(0);
  });

  it("gold 0 → no gold", () => {
    const monsters = [{ name: "A", gold: 0, count: 5 }];
    expect(calcGoldPerRun(monsters)).toBe(0);
  });

  it("uses GOLD_DROP_RATE = 0.30", () => {
    expect(GOLD_DROP_RATE).toBe(0.30);
  });

  it("multiple monsters accumulate", () => {
    const monsters = [
      { name: "A", gold: 100, count: 1 },
      { name: "B", gold: 100, count: 1 },
      { name: "C", gold: 100, count: 1 },
    ];
    expect(calcGoldPerRun(monsters)).toBeCloseTo(300 * GOLD_DROP_RATE);
  });
});

// ---------------------------------------------------------------------------
// calcGoldPerHour
// ---------------------------------------------------------------------------
describe("calcGoldPerHour", () => {
  it("basic calculation: goldPerRun * (3600/seconds) * (1+bonus/100)", () => {
    // 100 gold/run, 60 sec/run → 60 runs/hr → 6000 gold/hr
    expect(calcGoldPerHour(100, 60)).toBe(Math.floor(100 * 60));
  });

  it("0 seconds per run → 0", () => {
    expect(calcGoldPerHour(100, 0)).toBe(0);
  });

  it("negative seconds per run → 0", () => {
    expect(calcGoldPerHour(100, -1)).toBe(0);
  });

  it("applies gold bonus percent", () => {
    // 100 gold/run, 60 sec/run, 50% bonus
    // 100 * 60 * 1.5 = 9000
    expect(calcGoldPerHour(100, 60, 50)).toBe(Math.floor(100 * 60 * 1.5));
  });

  it("0% bonus is same as no bonus", () => {
    expect(calcGoldPerHour(100, 60, 0)).toBe(calcGoldPerHour(100, 60));
  });

  it("100% bonus doubles gold", () => {
    const base = calcGoldPerHour(100, 60, 0);
    const doubled = calcGoldPerHour(100, 60, 100);
    expect(doubled).toBe(Math.floor(base * 2));
  });

  it("result is floored", () => {
    // 100 gold/run, 7 sec/run → 100*(3600/7) = 51428.57... → floor → 51428
    const result = calcGoldPerHour(100, 7);
    expect(result).toBe(Math.floor(100 * (3600 / 7)));
  });

  it("large bonus percent", () => {
    // 100 gold/run, 60 sec/run, 300% bonus → 100*60*4 = 24000
    expect(calcGoldPerHour(100, 60, 300)).toBe(Math.floor(100 * 60 * 4));
  });
});
