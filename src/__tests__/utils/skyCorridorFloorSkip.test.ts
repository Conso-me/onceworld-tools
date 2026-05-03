import { describe, it, expect } from "vitest";
import {
  enumerateFloorSkip,
  findInitialPlans,
} from "../../utils/skyCorridorFloorSkip";

// ---------------------------------------------------------------------------
// findInitialPlans
// ---------------------------------------------------------------------------
describe("findInitialPlans", () => {
  it("N=100, S=100: 床置き2＋片側殲滅で1F→100F", () => {
    const plans = findInitialPlans(100, 100, 10);
    expect(plans).toHaveLength(1);
    const plan = plans[0];
    expect(plan.startFloor).toBe(100);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toMatchObject({
      fromFloor: 1,
      toFloor: 100,
      side: "left",
      placedBefore: 2,
      usedStatues: 98,
    });
  });

  it("N=100, S=200: 床置き3＋両側殲滅で1F→200F", () => {
    const plans = findInitialPlans(100, 200, 10);
    expect(plans).toHaveLength(1);
    const plan = plans[0];
    expect(plan.startFloor).toBe(200);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toMatchObject({
      fromFloor: 1,
      toFloor: 200,
      side: "both",
      placedBefore: 3,
    });
  });

  it("placeLimitが足りずS=100に届かない場合は空配列", () => {
    // N=100, S=100 到達には p=2 が必要（1+(100-2)=99）。placeLimit=1 では不可
    expect(findInitialPlans(100, 100, 1)).toHaveLength(0);
    // placeLimit=2 なら可
    expect(findInitialPlans(100, 100, 2)).toHaveLength(1);
    // placeLimit=0 だと p=0 のみ → 同じく不可
    expect(findInitialPlans(100, 100, 0)).toHaveLength(0);
  });

  it("不正なS（100の倍数でない）は空", () => {
    expect(findInitialPlans(100, 50, 10)).toEqual([]);
    expect(findInitialPlans(100, 0, 10)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// enumerateFloorSkip
// ---------------------------------------------------------------------------
describe("enumerateFloorSkip", () => {
  const baseInput = {
    adventurerStatues: 100,
    demonStatues: 0,
    targetFloor: 10000,
    placeLimit: 10,
  };

  it("N=100, M=97, target=10000: S=100, A=97, cycles=1 (1サイクルで9900F進む)", () => {
    const results = enumerateFloorSkip({ ...baseInput, demonStatues: 97 });
    const sol = results.find(
      (r) => r.startFloor === 100 && r.demonUsed === 97
    );
    expect(sol).toBeDefined();
    expect(sol!.cycles).toBe(1);
    expect(sol!.cycleProgress).toBe(9900);
    expect(sol!.effectiveAdventurer).toBe(100);
  });

  it("N=100, M=31, target=10000: S=100, A=31, cycles=3 (1サイクル3300F)", () => {
    const results = enumerateFloorSkip({ ...baseInput, demonStatues: 31 });
    const sol = results.find(
      (r) => r.startFloor === 100 && r.demonUsed === 31
    );
    expect(sol).toBeDefined();
    expect(sol!.cycles).toBe(3);
    expect(sol!.cycleProgress).toBe(3300);
  });

  it("N=100, M=7, target=10000: S=100, A=7, cycles=11 (1サイクル900F)", () => {
    const results = enumerateFloorSkip({ ...baseInput, demonStatues: 7 });
    const sol = results.find(
      (r) => r.startFloor === 100 && r.demonUsed === 7
    );
    expect(sol).toBeDefined();
    expect(sol!.cycles).toBe(11);
    expect(sol!.cycleProgress).toBe(900);
  });

  it("N=100, M=0, target=10000: S=200, A=0, cycles=49 (1サイクル200F)", () => {
    const results = enumerateFloorSkip({ ...baseInput, demonStatues: 0 });
    const sol = results.find(
      (r) => r.startFloor === 200 && r.demonUsed === 0
    );
    expect(sol).toBeDefined();
    expect(sol!.cycles).toBe(49);
    expect(sol!.cycleProgress).toBe(200);
  });

  it("100Fスタートで10000Fちょうどに到達する悪魔像数の集合が {1, 7, 9, 31, 97} を含む", () => {
    // 冒険者像100、床置き0でB=100、サイクル進行=200+100A
    // 9900 / (200+100A) が整数になるAを探す → A=1,7,9,31,97 など
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 1000,
      targetFloor: 10000,
      placeLimit: 10,
    });
    const startAt100 = results
      .filter((r) => r.startFloor === 100 && r.placedDuringCycle === 0)
      .map((r) => r.demonUsed);
    for (const a of [1, 7, 9, 31, 97]) {
      expect(startAt100).toContain(a);
    }
  });

  it("200Fスタートで10000Fちょうどに到達する悪魔像数の集合が {0, 5, 12, 47, 96} を含む", () => {
    // 9800 / (200+100A) が整数になるA → 0,5,12,47,96 など
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 1000,
      targetFloor: 10000,
      placeLimit: 10,
    });
    const startAt200 = results
      .filter((r) => r.startFloor === 200 && r.placedDuringCycle === 0)
      .map((r) => r.demonUsed);
    for (const a of [0, 5, 12, 47, 96]) {
      expect(startAt200).toContain(a);
    }
  });

  it("targetFloor が 100の倍数でない場合は空", () => {
    const results = enumerateFloorSkip({
      ...baseInput,
      targetFloor: 9999,
      demonStatues: 100,
    });
    expect(results).toEqual([]);
  });

  it("totalOperations 昇順でソートされる（最少操作が先頭）", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 1000,
      targetFloor: 10000,
      placeLimit: 10,
    });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].totalOperations).toBeGreaterThanOrEqual(
        results[i - 1].totalOperations
      );
    }
  });
});
