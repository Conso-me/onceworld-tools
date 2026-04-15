import { describe, it, expect } from "vitest";
import {
  calcAttackOutcome,
  calcInitiative,
  predictWinner,
  calcPetBattleResult,
} from "../../utils/petBattleCalc";
import type { PetStatResult, Element } from "../../types/game";

function makePet(overrides: {
  vit?: number;
  spd?: number;
  atk?: number;
  int?: number;
  def?: number;
  mdef?: number;
  luck?: number;
  hp?: number;
  element?: Element;
  attackMode?: "物理" | "魔法" | "魔弾";
} = {}): PetStatResult {
  const final = {
    vit: overrides.vit ?? 100,
    spd: overrides.spd ?? 1000,
    atk: overrides.atk ?? 500,
    int: overrides.int ?? 500,
    def: overrides.def ?? 100,
    mdef: overrides.mdef ?? 100,
    luck: overrides.luck ?? 100,
  };
  return {
    final,
    hp: overrides.hp ?? final.vit * 18 + 100,
    element: overrides.element ?? "火",
    attackMode: overrides.attackMode ?? "物理",
    maxLevel: 1200,
  };
}

describe("calcInitiative", () => {
  it("SPDが高い方が先攻", () => {
    expect(calcInitiative(2000, 100, 1000, 100)).toBe("A");
    expect(calcInitiative(1000, 100, 2000, 100)).toBe("B");
  });

  it("SPD同値ならLUCKで決まる", () => {
    expect(calcInitiative(1000, 200, 1000, 100)).toBe("A");
    expect(calcInitiative(1000, 100, 1000, 200)).toBe("B");
  });

  it("SPDもLUCKも同値ならtie", () => {
    expect(calcInitiative(1000, 100, 1000, 100)).toBe("tie");
  });
});

describe("calcAttackOutcome", () => {
  it("物理ペットの攻撃はATKベース", () => {
    const attacker = makePet({ atk: 100, spd: 5000, luck: 100, attackMode: "物理" });
    const defender = makePet({ def: 20, mdef: 10, luck: 100, vit: 200 });
    const out = calcAttackOutcome(attacker, defender);
    // effectiveDef = 20 + floor(10/10) = 21
    // base = (100*1.75 - 21) * 4 * 1.0 = 616
    expect(out.isPhysical).toBe(true);
    expect(out.attackType).toBe("物理");
    expect(out.damage.avg).toBe(616);
    expect(out.damage.min).toBe(Math.floor(616 * 0.9));
    expect(out.damage.max).toBe(Math.floor(616 * 1.1));
    expect(out.effectiveDef).toBe(21);
  });

  it("魔弾ペットの攻撃はINTベース+魔弾有効防御", () => {
    const attacker = makePet({ int: 100, spd: 5000, luck: 100, attackMode: "魔弾" });
    const defender = makePet({ def: 10, mdef: 20, luck: 100 });
    const out = calcAttackOutcome(attacker, defender);
    // effectiveDef = mdef + ceil(def/10) = 20 + 1 = 21
    expect(out.isPhysical).toBe(false);
    expect(out.attackType).toBe("魔弾");
    expect(out.effectiveDef).toBe(21);
    // base = 100*1.75 - 21 = 154, *4 = 616
    expect(out.damage.avg).toBe(616);
  });

  it("属性相性(弱点×1.2)が反映される", () => {
    const attacker = makePet({ atk: 100, element: "火" });
    const defenderWeak = makePet({ element: "木", def: 20, mdef: 10 });
    const defenderNeutral = makePet({ element: "火", def: 20, mdef: 10 });
    const outWeak = calcAttackOutcome(attacker, defenderWeak);
    const outNeutral = calcAttackOutcome(attacker, defenderNeutral);
    expect(outWeak.elementAffinity).toBe(1.2);
    expect(outNeutral.elementAffinity).toBe(1.0);
    expect(outWeak.damage.avg).toBeGreaterThan(outNeutral.damage.avg);
  });

  it("属性相性(耐性×0.8)が反映される", () => {
    const attacker = makePet({ atk: 100, element: "火" });
    const defender = makePet({ element: "水", def: 20, mdef: 10 });
    const out = calcAttackOutcome(attacker, defender);
    expect(out.elementAffinity).toBe(0.8);
  });

  it("多段回数がSPDから決まる", () => {
    const defender = makePet();
    expect(calcAttackOutcome(makePet({ spd: 2000 }), defender).multiHit).toBe(1);
    expect(calcAttackOutcome(makePet({ spd: 3000 }), defender).multiHit).toBe(2);
    expect(calcAttackOutcome(makePet({ spd: 10000 }), defender).multiHit).toBe(3);
    expect(calcAttackOutcome(makePet({ spd: 30000 }), defender).multiHit).toBe(4);
    expect(calcAttackOutcome(makePet({ spd: 100000 }), defender).multiHit).toBe(5);
  });

  it("命中率がLUK比から計算される", () => {
    const attacker = makePet({ luck: 50 });
    const defender = makePet({ luck: 200 }); // ratio 0.25 → 1%
    expect(calcAttackOutcome(attacker, defender).hitRate).toBe(1);

    const attacker2 = makePet({ luck: 200 });
    const defender2 = makePet({ luck: 200 }); // ratio 1.0 → 100%
    expect(calcAttackOutcome(attacker2, defender2).hitRate).toBe(100);
  });

  it("ダメージが通らない場合 isNullified=true で min:1,max:9", () => {
    const attacker = makePet({ atk: 1 });
    const defender = makePet({ def: 10000, mdef: 10000 });
    const out = calcAttackOutcome(attacker, defender);
    expect(out.isNullified).toBe(true);
    expect(out.damage.min).toBe(1);
    expect(out.damage.max).toBe(9);
  });

  it("hitsToKill.worst は perTurn.min ベース", () => {
    const attacker = makePet({ atk: 100, spd: 5000, luck: 100, attackMode: "物理" });
    const defender = makePet({ def: 20, mdef: 10, luck: 100, vit: 200 });
    const out = calcAttackOutcome(attacker, defender);
    const expectedWorst = Math.ceil(defender.hp / (out.damage.min * out.multiHit));
    expect(out.hitsToKill.worst).toBe(expectedWorst);
  });

  it("perTurn は多段込みのダメージ", () => {
    const attacker = makePet({ atk: 100, spd: 10000, luck: 100, attackMode: "物理" });
    const defender = makePet({ def: 20, mdef: 10, luck: 100 });
    const out = calcAttackOutcome(attacker, defender);
    expect(out.perTurn.min).toBe(out.damage.min * 3);
    expect(out.perTurn.max).toBe(out.damage.max * 3);
    expect(out.perTurn.avg).toBe(out.damage.avg * 3);
  });
});

describe("predictWinner", () => {
  function mockOutcome(worst: number): ReturnType<typeof calcAttackOutcome> {
    return {
      damage: { min: 1, max: 1, avg: 1, critMin: 0, critMax: 0, critAvg: 0, isNullified: false, hasCrit: true },
      multiHit: 1,
      perTurn: { min: 1, max: 1, avg: 1 },
      hitRate: 100,
      elementAffinity: 1.0,
      attackType: "物理",
      isPhysical: true,
      effectiveDef: 0,
      isNullified: false,
      hitsToKill: { best: worst, worst },
      expectedTurnsWithMiss: worst,
    };
  }

  it("先攻Aが後攻Bより早く倒す → A勝利", () => {
    const pred = predictWinner(mockOutcome(3), mockOutcome(5), "A");
    expect(pred.winner).toBe("A");
    expect(pred.turnsToWin).toBe(3);
  });

  it("後攻Bが先攻Aより早く倒す → B勝利", () => {
    const pred = predictWinner(mockOutcome(5), mockOutcome(2), "A");
    expect(pred.winner).toBe("B");
    expect(pred.turnsToWin).toBe(2);
  });

  it("同ターン決着+先攻A → A勝利", () => {
    const pred = predictWinner(mockOutcome(3), mockOutcome(3), "A");
    expect(pred.winner).toBe("A");
    expect(pred.note).toBeNull();
  });

  it("同ターン決着+tie → 相打ち", () => {
    const pred = predictWinner(mockOutcome(3), mockOutcome(3), "tie");
    expect(pred.winner).toBe("draw");
    expect(pred.note).toBe("simultaneous");
  });

  it("両者ダメージ通らず → 膠着", () => {
    const pred = predictWinner(mockOutcome(Infinity), mockOutcome(Infinity), "A");
    expect(pred.winner).toBe("draw");
    expect(pred.note).toBe("stalemate");
  });
});

describe("calcPetBattleResult (統合)", () => {
  it("典型: 物理 vs 物理で完全な結果が返る", () => {
    const a = makePet({ atk: 500, spd: 10000, luck: 200, vit: 300, element: "火" });
    const b = makePet({ atk: 300, spd: 5000, luck: 100, vit: 400, element: "水" });
    const result = calcPetBattleResult(a, b);
    expect(result.aToB).toBeDefined();
    expect(result.bToA).toBeDefined();
    expect(result.initiative).toBe("A");
    expect(result.prediction).toBeDefined();
  });

  it("SPDが高い方が先攻勝ちしやすい", () => {
    const fast = makePet({ atk: 500, spd: 50000, luck: 100, vit: 100 });
    const slow = makePet({ atk: 500, spd: 1000, luck: 100, vit: 100 });
    const result = calcPetBattleResult(fast, slow);
    expect(result.initiative).toBe("A");
    expect(result.prediction.winner).toBe("A");
  });

  it("属性弱点を突く側が有利", () => {
    const fire = makePet({ atk: 500, element: "火", def: 100, mdef: 100, vit: 200, spd: 1000, luck: 100 });
    const wood = makePet({ atk: 500, element: "木", def: 100, mdef: 100, vit: 200, spd: 1000, luck: 100 });
    const result = calcPetBattleResult(fire, wood);
    // A(火) → B(木) は弱点 ×1.2、B(木) → A(火) は耐性 ×0.8
    expect(result.aToB.elementAffinity).toBe(1.2);
    expect(result.bToA.elementAffinity).toBe(0.8);
    expect(result.aToB.damage.avg).toBeGreaterThan(result.bToA.damage.avg);
  });
});
