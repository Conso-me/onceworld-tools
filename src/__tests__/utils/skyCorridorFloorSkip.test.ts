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

// ---------------------------------------------------------------------------
// 10000F ボス階層の回避（目標 = 100000F など）
// ---------------------------------------------------------------------------
describe("enumerateFloorSkip - 10000Fボス階層回避", () => {
  it("S=100,A=1 (delta=300,K=333) は k=33 で 10000F に着地するため除外", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 1000,
      targetFloor: 100000,
      placeLimit: 10,
    });
    const bad = results.find((r) => r.startFloor === 100 && r.demonUsed === 1);
    expect(bad).toBeUndefined();
  });

  it("S=100,A=997 (delta=99900,K=1) は中間踏みなしで採用される", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 1000,
      targetFloor: 100000,
      placeLimit: 10,
    });
    const ok = results.find((r) => r.startFloor === 100 && r.demonUsed === 997);
    expect(ok).toBeDefined();
    expect(ok!.cycles).toBe(1);
    expect(ok!.cycleProgress).toBe(99900);
  });

  it("S=100,A=331 (delta=33300,K=3) は中間 33400,66700 が非ボスで採用", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 1000,
      targetFloor: 100000,
      placeLimit: 10,
    });
    const ok = results.find((r) => r.startFloor === 100 && r.demonUsed === 331);
    expect(ok).toBeDefined();
    expect(ok!.cycles).toBe(3);
  });

  it("S 自体が 10000F の倍数（target でない）は除外される", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 1000,
      targetFloor: 100000,
      placeLimit: 10,
    });
    expect(results.find((r) => r.startFloor === 10000)).toBeUndefined();
    expect(results.find((r) => r.startFloor === 50000)).toBeUndefined();
  });

  it("delta が 100 の倍数でない (B%100 !== 0) パターンは除外", () => {
    // N=100, p=1, B=99 → delta=199+100A、100の倍数でない
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 1000,
      targetFloor: 10000,
      placeLimit: 10,
    });
    expect(results.find((r) => r.placedDuringCycle === 1)).toBeUndefined();
  });

  it("target=10000F (1万Fボス) は終点なのでサイクル末端で踏むのは OK", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 97,
      targetFloor: 10000,
      placeLimit: 10,
    });
    const ok = results.find((r) => r.startFloor === 100 && r.demonUsed === 97);
    expect(ok).toBeDefined();
    expect(ok!.cycles).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 冒険者像も悪魔像と同じく自由列挙（倉庫から任意数を持参）
// ---------------------------------------------------------------------------
describe("enumerateFloorSkip - 冒険者像持参数の自由列挙", () => {
  it("N=100, M=9, target=10000: brought=100 のとき S=100, A=9, cycles=9, B=100 が見つかる", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 9,
      targetFloor: 10000,
      placeLimit: 10,
    });
    const sol = results.find((r) => r.startFloor === 100 && r.demonUsed === 9);
    expect(sol).toBeDefined();
    expect(sol!.effectiveAdventurer).toBe(100);
    expect(sol!.cycles).toBe(9);
    expect(sol!.placedDuringCycle).toBe(0); // サイクル中は床置きしない
  });

  it("brought=0 では初動付きガーディアンサイクル解は存在しない", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 0,
      targetFloor: 10000,
      placeLimit: 10,
    });
    // ガーディアン解 (noGuardian でない) で effectiveAdventurer=0 はない
    // (1F→S F の初動が成立しないため)
    expect(
      results.find((r) => !r.noGuardian && r.effectiveAdventurer === 0)
    ).toBeUndefined();
  });

  it("N=200, placeLimit=10: brought=100 (倉庫から100だけ持参) も列挙される", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 200,
      demonStatues: 97,
      targetFloor: 10000,
      placeLimit: 10,
    });
    // brought=100 の場合: B=100, A=97, delta=9900, K=1
    const sol = results.find(
      (r) => r.effectiveAdventurer === 100 && r.demonUsed === 97
    );
    expect(sol).toBeDefined();
    expect(sol!.cycles).toBe(1);
  });

  it("結果には brought ごとの effectiveAdventurer が記録される", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 100,
      targetFloor: 10000,
      placeLimit: 10,
    });
    for (const r of results) {
      expect(r.effectiveAdventurer % 100).toBe(0);
      expect(r.effectiveAdventurer).toBeGreaterThanOrEqual(0);
      expect(r.effectiveAdventurer).toBeLessThanOrEqual(100);
    }
  });
});

// ---------------------------------------------------------------------------
// スカイガーディアンを倒さない片側殲滅チェイン
// ---------------------------------------------------------------------------
describe("enumerateFloorSkip - ガーディアン討伐なしチェイン", () => {
  it("brought=100, target=10000: 99 回の片側殲滅で到達 (noGuardian=true)", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 0,
      targetFloor: 10000,
      placeLimit: 10,
    });
    const sol = results.find(
      (r) => r.noGuardian === true && r.effectiveAdventurer === 100
    );
    expect(sol).toBeDefined();
    expect(sol!.cycles).toBe(99);
    expect(sol!.cycleProgress).toBe(101); // 1 + 100
    expect(sol!.totalOperations).toBe(99);
    expect(sol!.demonUsed).toBe(0);
    expect(sol!.startFloor).toBe(1);
  });

  it("brought=100, target=2000: (2000-1)/101 が整数でないので候補に入らない", () => {
    // 1999 / 101 = 19.79... not integer
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 0,
      targetFloor: 2000,
      placeLimit: 10,
    });
    const sol = results.find(
      (r) => r.noGuardian === true && r.effectiveAdventurer === 100
    );
    expect(sol).toBeUndefined();
  });

  it("brought=0, target=10000: 9999 回の片側殲滅でも候補に入る (但し操作数大)", () => {
    const results = enumerateFloorSkip({
      adventurerStatues: 0,
      demonStatues: 0,
      targetFloor: 10000,
      placeLimit: 10,
    });
    const sol = results.find(
      (r) => r.noGuardian === true && r.effectiveAdventurer === 0
    );
    expect(sol).toBeDefined();
    expect(sol!.cycles).toBe(9999);
    expect(sol!.cycleProgress).toBe(1);
  });

  it("noGuardian チェインは中間 10000F 倍数を踏んでもよい (ボス回避不要)", () => {
    // brought=100, target=20100 → (20100-1)/101 = 199 cycles。
    // 中間で k=99 のとき 1+99*101=10000F を踏むがガーディアン依存しないので OK
    const results = enumerateFloorSkip({
      adventurerStatues: 100,
      demonStatues: 0,
      targetFloor: 20100,
      placeLimit: 10,
    });
    const sol = results.find(
      (r) => r.noGuardian === true && r.effectiveAdventurer === 100
    );
    expect(sol).toBeDefined();
    expect(sol!.cycles).toBe(199);
  });
});
