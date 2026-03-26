import { describe, it, expect } from "vitest";
import monstersJson from "../../../docs/data/monsters.json";
import type { MonsterBase } from "../../types/game";

const monsters = monstersJson as MonsterBase[];

describe("Monster data integrity", () => {
  it("should have at least one monster", () => {
    expect(monsters.length).toBeGreaterThan(0);
  });

  it("all monster names should be unique", () => {
    const names = monsters.map((m) => m.name);
    const uniqueNames = new Set(names);
    const duplicates = names.filter(
      (name, index) => names.indexOf(name) !== index
    );
    expect(duplicates).toEqual([]);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("all elements should be valid", () => {
    const validElements = new Set(["火", "水", "木", "光", "闇"]);
    for (const monster of monsters) {
      expect(
        validElements.has(monster.element),
        `Monster "${monster.name}" has invalid element: "${monster.element}"`
      ).toBe(true);
    }
  });

  it("all attackTypes should be valid", () => {
    const validAttackTypes = new Set(["物理", "魔弾", "魔攻"]);
    for (const monster of monsters) {
      expect(
        validAttackTypes.has(monster.attackType),
        `Monster "${monster.name}" has invalid attackType: "${monster.attackType}"`
      ).toBe(true);
    }
  });

  it("no negative stat values", () => {
    const statKeys: (keyof MonsterBase)[] = [
      "vit",
      "spd",
      "atk",
      "int",
      "def",
      "mdef",
      "luck",
      "mov",
      "exp",
      "gold",
    ];
    for (const monster of monsters) {
      for (const key of statKeys) {
        const value = monster[key] as number;
        expect(
          value,
          `Monster "${monster.name}" has negative ${key}: ${value}`
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("captureRate should be non-negative", () => {
    for (const monster of monsters) {
      expect(
        monster.captureRate,
        `Monster "${monster.name}" has negative captureRate: ${monster.captureRate}`
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("all monsters should have a non-empty name", () => {
    for (const monster of monsters) {
      expect(monster.name).toBeTruthy();
      expect(monster.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("level should be non-negative", () => {
    for (const monster of monsters) {
      expect(
        monster.level,
        `Monster "${monster.name}" has negative level: ${monster.level}`
      ).toBeGreaterThanOrEqual(0);
    }
  });
});
