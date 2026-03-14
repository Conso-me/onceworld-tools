# OnceWorld Damage Calculator - Formula Reference

This document catalogues every calculation formula extracted from the original spreadsheet's
**ダメージ計算**, **主人公計算**, and **ペット計算** sheets. It serves as the canonical reference
for implementing calculation logic in the web tool.

> **Notation conventions**
> - Cell references use the original spreadsheet coordinates (e.g. `C4`, `H13`).
> - `FLOOR(x)` = truncate toward zero (JavaScript `Math.floor` for positive values).
> - `CEILING(x)` = round up (JavaScript `Math.ceil`).
> - `ROUND(x)` = standard rounding (JavaScript `Math.round`).
> - Cross-sheet references like `'主人公計算'!C4` are written as `主人公計算.C4`.
> - `VLOOKUP(key, range, col, FALSE)` = exact-match lookup; described in plain language for each usage.

---

## Table of Contents

1. [ダメージ計算 (Damage Calculator)](#1-ダメージ計算-damage-calculator)
   - [1.1 Self Stats Resolution](#11-self-stats-resolution)
   - [1.2 Enemy Stats (Base & Scaled)](#12-enemy-stats-base--scaled)
   - [1.3 Intermediate Combat Values](#13-intermediate-combat-values)
   - [1.4 Damage Output (Attacking the Enemy)](#14-damage-output-attacking-the-enemy)
   - [1.5 Damage Input (Enemy Attacking Self)](#15-damage-input-enemy-attacking-self)
   - [1.6 Target Stats / Required Stats](#16-target-stats--required-stats)
   - [1.7 Required Stat Additions (Flat & Allocation)](#17-required-stat-additions-flat--allocation)
   - [1.8 Magic Settings](#18-magic-settings)
2. [主人公計算 (Hero Calculator)](#2-主人公計算-hero-calculator)
   - [2.1 Final Stats (Output)](#21-final-stats-output)
   - [2.2 Derived Stats](#22-derived-stats)
   - [2.3 Protein (Buff) Stats](#23-protein-buff-stats)
   - [2.4 Status Effects (Aggregated Bonuses)](#24-status-effects-aggregated-bonuses)
   - [2.5 Pre-allocation Equipment Stats](#25-pre-allocation-equipment-stats)
   - [2.6 Post-allocation Equipment Stats (with Mushroom House)](#26-post-allocation-equipment-stats-with-mushroom-house)
   - [2.7 Equipment Stat Calculation (Per Slot)](#27-equipment-stat-calculation-per-slot)
   - [2.8 Equipment Stat Totals](#28-equipment-stat-totals)
   - [2.9 Accessory / Pet Skill Effect Resolution](#29-accessory--pet-skill-effect-resolution)
   - [2.10 Accessory Value Calculation](#210-accessory-value-calculation)
   - [2.11 Per-Point Multipliers (Required Allocation Calc)](#211-per-point-multipliers-required-allocation-calc)
3. [ペット計算 (Pet Calculator)](#3-ペット計算-pet-calculator)
   - [3.1 Pet Stats with Mushroom Bonus](#31-pet-stats-with-mushroom-bonus)
   - [3.2 Base Monster Data Lookup](#32-base-monster-data-lookup)
   - [3.3 Mushroom House Bonus Logic](#33-mushroom-house-bonus-logic)

---

## 1. ダメージ計算 (Damage Calculator)

### 1.1 Self Stats Resolution

These formulas resolve the player's stats based on the selected source (`H3`).
When `H3 = "入力欄"` (manual input), values come from the input area (rows 3-7).
When `H3 = "主人公"`, values come from the Hero Calculator sheet.
When `H3 = "ペット"`, values come from the Pet Calculator sheet.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `B9` | `=IF($H$3="入力欄", "自身", $H$3) & "ステータス"` | Label: displays "{source}ステータス" | `(H3 === "入力欄" ? "自身" : H3) + "ステータス"` |
| `C10` | `=IF($H$3 = "ペット", 'ペット計算'!C22, C3)` | Self element: from Pet sheet if pet mode, otherwise from input cell C3 | `H3 === "ペット" ? petCalc.C22 : C3` |
| `E10` | `=IF($H$3 = "ペット", 'ペット計算'!E22, E3)` | Self attack type: from Pet sheet if pet mode, otherwise from input cell E3 | `H3 === "ペット" ? petCalc.E22 : E3` |
| `C11` | `=IFS($H$3 = "入力欄", C4, $H$3 = "主人公", '主人公計算'!C4, $H$3 = "ペット", 'ペット計算'!C8)` | Self VIT | `H3 === "入力欄" ? C4 : H3 === "主人公" ? heroCalc.C4 : petCalc.C8` |
| `C12` | `=IFS($H$3 = "入力欄", C5, $H$3 = "主人公", '主人公計算'!C5, $H$3 = "ペット", 'ペット計算'!C9)` | Self ATK | `H3 === "入力欄" ? C5 : H3 === "主人公" ? heroCalc.C5 : petCalc.C9` |
| `C13` | `=IFS($H$3 = "入力欄", C6, $H$3 = "主人公", '主人公計算'!C6, $H$3 = "ペット", 'ペット計算'!C10)` | Self DEF | `H3 === "入力欄" ? C6 : H3 === "主人公" ? heroCalc.C6 : petCalc.C10` |
| `C14` | `=IFS($H$3 = "入力欄", C7, $H$3 = "主人公", '主人公計算'!C7, $H$3 = "ペット", 'ペット計算'!C11)` | Self LUCK | `H3 === "入力欄" ? C7 : H3 === "主人公" ? heroCalc.C7 : petCalc.C11` |
| `E11` | `=IFS($H$3 = "入力欄", E4, $H$3 = "主人公", '主人公計算'!F4, $H$3 = "ペット", 'ペット計算'!F8)` | Self SPD | `H3 === "入力欄" ? E4 : H3 === "主人公" ? heroCalc.F4 : petCalc.F8` |
| `E12` | `=IFS($H$3 = "入力欄", E5, $H$3 = "主人公", '主人公計算'!F5, $H$3 = "ペット", 'ペット計算'!F9)` | Self INT | `H3 === "入力欄" ? E5 : H3 === "主人公" ? heroCalc.F5 : petCalc.F9` |
| `E13` | `=IFS($H$3 = "入力欄", E6, $H$3 = "主人公", '主人公計算'!F6, $H$3 = "ペット", 'ペット計算'!F10)` | Self M-DEF | `H3 === "入力欄" ? E6 : H3 === "主人公" ? heroCalc.F6 : petCalc.F10` |
| `E14` | `=IFS($H$3 = "入力欄", E7, $H$3 = "主人公", '主人公計算'!F7, $H$3 = "ペット", 'ペット計算'!F11)` | Self MOV | `H3 === "入力欄" ? E7 : H3 === "主人公" ? heroCalc.F7 : petCalc.F11` |

### 1.2 Enemy Stats (Base & Scaled)

Enemy data is looked up from the `敵ステータス` sheet by monster name (`B18`), then scaled by enemy level (`E18`).

**Base stats (from lookup):**

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `C21` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 3, FALSE)` | Enemy element | `lookup(enemyName, monsters, "element")` |
| `E21` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 4, FALSE)` | Enemy attack type (物理/魔弾) | `lookup(enemyName, monsters, "attackType")` |
| `C30` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 5, FALSE)` | Base enemy VIT | `lookup(enemyName, monsters, "vit")` |
| `E30` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 6, FALSE)` | Base enemy SPD | `lookup(enemyName, monsters, "spd")` |
| `C31` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 7, FALSE)` | Base enemy ATK | `lookup(enemyName, monsters, "atk")` |
| `E31` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 8, FALSE)` | Base enemy INT | `lookup(enemyName, monsters, "int")` |
| `C32` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 9, FALSE)` | Base enemy DEF | `lookup(enemyName, monsters, "def")` |
| `E32` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 10, FALSE)` | Base enemy M-DEF | `lookup(enemyName, monsters, "mdef")` |
| `C33` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 11, FALSE)` | Base enemy LUCK | `lookup(enemyName, monsters, "luck")` |
| `E33` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 12, FALSE)` | Base enemy MOV | `lookup(enemyName, monsters, "mov")` |
| `C34` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 14, FALSE)` | Base enemy EXP | `lookup(enemyName, monsters, "exp")` |
| `E34` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 15, FALSE)` | Base enemy Gold | `lookup(enemyName, monsters, "gold")` |
| `C27` | `=VLOOKUP($B$18, '敵ステータス'!$A$2:$O, 13, FALSE)` | Enemy capture rate | `lookup(enemyName, monsters, "captureRate")` |

**Level-scaled stats:**

The scaling formula is: `FLOOR(baseStat * ((level - 1) * 0.1 + 1))`

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `C22` | `=Floor(C30 * (($E$18-1) * 0.1 + 1))` | Scaled enemy VIT | `Math.floor(baseVit * ((level - 1) * 0.1 + 1))` |
| `E22` | `=Floor(E30 * (($E$18-1) * 0.1 + 1))` | Scaled enemy SPD | `Math.floor(baseSpd * ((level - 1) * 0.1 + 1))` |
| `C23` | `=Floor(C31 * (($E$18-1) * 0.1 + 1))` | Scaled enemy ATK | `Math.floor(baseAtk * ((level - 1) * 0.1 + 1))` |
| `E23` | `=Floor(E31 * (($E$18-1) * 0.1 + 1))` | Scaled enemy INT | `Math.floor(baseInt * ((level - 1) * 0.1 + 1))` |
| `C24` | `=CEILING(Floor(C32 * (($E$18-1) * 0.1 + 1)) / IF(H6, 2, 1))` | Scaled enemy DEF (halved if DEF-halved flag H6 is TRUE) | `Math.ceil(Math.floor(baseDef * ((level - 1) * 0.1 + 1)) / (defHalved ? 2 : 1))` |
| `E24` | `=Floor(E32 * (($E$18-1) * 0.1 + 1))` | Scaled enemy M-DEF | `Math.floor(baseMdef * ((level - 1) * 0.1 + 1))` |
| `C25` | `=CEILING(Floor(C33 * (($E$18 - 1) * 0.1 + 1)) / IF(H7, 2, 1))` | Scaled enemy LUCK (halved if LUCK-halved flag H7 is TRUE) | `Math.ceil(Math.floor(baseLuck * ((level - 1) * 0.1 + 1)) / (luckHalved ? 2 : 1))` |
| `E25` | `=E33` | Enemy MOV (not level-scaled) | `baseMov` |
| `C26` | `=MAX(FLOOR(E18 ^ 1.1 * 0.2), 1) * C34` | Scaled enemy EXP: `max(floor(level^1.1 * 0.2), 1) * baseExp` | `Math.max(Math.floor(Math.pow(level, 1.1) * 0.2), 1) * baseExp` |
| `D26` | `=MAX(FLOOR(E18 ^ 1.1 * 0.2), 1) * C34` | (Same as C26) | (Same as C26) |
| `E26` | `=MAX(FLOOR(E18 ^ 1.1 * 0.2), 1) * C34` | (Same as C26) | (Same as C26) |
| `E27` | `=E34` | Enemy Gold (not level-scaled) | `baseGold` |

### 1.3 Intermediate Combat Values

These compute element matchups, defense types, attack multipliers, and multi-hit counts.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `D37` | `=VLOOKUP(C10, '属性'!A2:F6, VLOOKUP(C21, '属性'!A8:B12, 2, FALSE) + 1, FALSE)` | Element affinity (self attacking enemy): looks up self element vs enemy element in the 5x5 affinity table | `elementTable[selfElement][enemyElement]` |
| `D38` | `=VLOOKUP(C21, '属性'!A2:F6, VLOOKUP(C10, '属性'!A8:B12, 2, FALSE) + 1, FALSE)` | Element affinity (enemy attacking self): reversed lookup | `elementTable[enemyElement][selfElement]` |
| `D39` | `=IF(E21="物理", "DEF", "M-DEF")` | Enemy defense type label (based on enemy attack type) | `enemyAtkType === "物理" ? "DEF" : "M-DEF"` |
| `D40` | `=IF(E10="物理", "ATK", "INT")` | Self attack stat label (based on self attack type) | `selfAtkType === "物理" ? "ATK" : "INT"` |
| `D41` | `=IF(E21="物理", C13 + FLOOR(E13 / 10), E13 + FLOOR(C13 / 10))` | Effective self defense vs enemy: if enemy is physical, use DEF + floor(M-DEF/10); otherwise M-DEF + floor(DEF/10) | `enemyAtkType === "物理" ? selfDef + Math.floor(selfMdef / 10) : selfMdef + Math.floor(selfDef / 10)` |
| `D42` | `=IF(E10 = "物理", C24 + FLOOR(E24 / 10), E24 + FLOOR(C24 / 10))` | Effective enemy defense vs self: if self is physical, use enemy DEF + floor(enemy M-DEF/10); otherwise enemy M-DEF + floor(enemy DEF/10) | `selfAtkType === "物理" ? enemyDef + Math.floor(enemyMdef / 10) : enemyMdef + Math.floor(enemyDef / 10)` |
| `D43` | `=IFS(E10 = "魔法", 1, E11 >= 100000, 5, E11 >= 30000, 4, E11 >= 10000, 3, E11 >= 3000, 2, TRUE, 1)` | Self multi-hit count: 1 for magic; otherwise based on SPD thresholds (3k/10k/30k/100k = 2/3/4/5 hits) | `selfAtkType === "魔法" ? 1 : selfSpd >= 100000 ? 5 : selfSpd >= 30000 ? 4 : selfSpd >= 10000 ? 3 : selfSpd >= 3000 ? 2 : 1` |
| `D44` | `=IFS(E22 >= 100000, 5, E22 >= 30000, 4, E22 >= 10000, 3, E22 >= 3000, 2, TRUE, 1)` | Enemy multi-hit count: based on enemy scaled SPD thresholds | `enemySpd >= 100000 ? 5 : enemySpd >= 30000 ? 4 : enemySpd >= 10000 ? 3 : enemySpd >= 3000 ? 2 : 1` |
| `D50` | `=VLOOKUP(D47, '属性'!A15:B19, 2, FALSE)` | Magic element base multiplier: looks up magic element (D47) from the magic multiplier table | `magicBaseMultiplier[magicElement]` |
| `D51` | `=D48 * (1 + D49 * 0.1)` | Magic base INT: `analysisBookCount * (1 + analysisAnalysisBookCount * 0.1)` | `analysisBooks * (1 + analysisAnalysisBooks * 0.1)` |

**Element affinity table** (from `属性` sheet, rows 2-6):

| Attacker\Defender | 火 | 水 | 木 | 光 | 闇 |
|---|---|---|---|---|---|
| 火 | 1.0 | 0.8 | 1.2 | 1.0 | 1.0 |
| 水 | 1.2 | 1.0 | 0.8 | 1.0 | 1.0 |
| 木 | 0.8 | 1.2 | 1.0 | 1.0 | 1.0 |
| 光 | 1.0 | 1.0 | 1.0 | 0.8 | 1.2 |
| 闇 | 1.0 | 1.0 | 1.0 | 1.2 | 0.8 |

**Magic element base multiplier** (from `属性` sheet, rows 15-19):

| Element | Multiplier |
|---------|------------|
| 火 | 1.0 |
| 水 | 1.0 |
| 木 | 1.3 |
| 光 | 2.0 |
| 闇 | 1.4 |

### 1.4 Damage Output (Attacking the Enemy)

Core damage formula for the player attacking an enemy.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `H12` | `=C22*18+100` | Enemy HP: `scaledEnemyVit * 18 + 100` | `enemyVit * 18 + 100` |
| `H13` | `=MAX(IF(E10 = "物理", C12, E12 + IF(E10 = "魔法", D51, 0)) * IF(E10 = "魔法", 1.25 * D50, 1.75) - D42, 0) * 4 * D37` | **Base damage dealt**: Physical: `max((ATK * 1.75 - effectiveEnemyDef), 0) * 4 * elementAffinity`; Magic: `max(((INT + magicBaseInt) * 1.25 * magicMult - effectiveEnemyDef), 0) * 4 * elementAffinity` | See breakdown below |
| `H14` | `=FLOOR(H13 * 0.9)` | Min damage (90% of base) | `Math.floor(baseDmg * 0.9)` |
| `H15` | `=FLOOR(H13 * 1.1)` | Max damage (110% of base) | `Math.floor(baseDmg * 1.1)` |
| `H16` | `=IF(H13 = 0, "-", CEILING(H12 / (H14 * D43)))` | Hits to kill: `ceil(enemyHP / (minDmg * multiHitCount))` | `baseDmg === 0 ? "-" : Math.ceil(enemyHP / (minDmg * multiHitCount))` |

**Damage formula breakdown (H13):**

```javascript
// Determine raw attack power
let rawAtk;
if (selfAtkType === "物理") {
  rawAtk = selfAtk;  // Physical: use ATK
} else {
  rawAtk = selfInt + (selfAtkType === "魔法" ? magicBaseInt : 0);  // Magic: INT + magic base INT
}

// Determine attack multiplier
let atkMultiplier;
if (selfAtkType === "魔法") {
  atkMultiplier = 1.25 * magicElementMultiplier;  // Magic: 1.25 * element multiplier
} else {
  atkMultiplier = 1.75;  // Physical/魔弾: 1.75
}

// Calculate base damage
let baseDamage = Math.max(rawAtk * atkMultiplier - effectiveEnemyDef, 0) * 4 * elementAffinity;
```

**Multi-hit display labels:**

| Cell | Original Formula | Description |
|------|-----------------|-------------|
| `I13` | `=IF(D43 > 1, "×" & D43, "")` | Shows "×N" if multi-hit > 1 |
| `I14` | `=IF(D43 > 1, "×" & D43, "")` | (same) |
| `I15` | `=IF(D43 > 1, "×" & D43, "")` | (same) |

### 1.5 Damage Input (Enemy Attacking Self)

Core damage formula for the enemy attacking the player.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `G19` | `=IF($H$3="入力欄", "自身", $H$3) & "HP"` | Label for self HP display | `(H3 === "入力欄" ? "自身" : H3) + "HP"` |
| `H19` | `=IF(H3 = "主人公", '主人公計算'!D9, C11*18+100)` | Self HP: from Hero Calculator if hero mode; otherwise `selfVit * 18 + 100` | `H3 === "主人公" ? heroCalc.D9 : selfVit * 18 + 100` |
| `H20` | `=MAX(IF(E21 = "物理", C23, E23) * 1.75 - D41, 0) * 4 * D38` | **Base damage received**: `max((enemyAtkStat * 1.75 - effectiveSelfDef), 0) * 4 * elementAffinity` (enemy always uses 1.75 multiplier, never magic formula) | `Math.max((enemyAtkType === "物理" ? enemyAtk : enemyInt) * 1.75 - effectiveSelfDef, 0) * 4 * elementAffinityDefense` |
| `H21` | `=FLOOR(H20 * 0.9)` | Min damage received (90%) | `Math.floor(baseDmgReceived * 0.9)` |
| `H22` | `=FLOOR(H20 * 1.1)` | Max damage received (110%) | `Math.floor(baseDmgReceived * 1.1)` |
| `H23` | `=IF(H20 = 0, "-", FLOOR(H19 / (H22 * D44)))` | Survival turns: `floor(selfHP / (maxDmgReceived * enemyMultiHit))` | `baseDmgReceived === 0 ? "-" : Math.floor(selfHP / (maxDmgReceived * enemyMultiHitCount))` |

**Multi-hit display labels (enemy):**

| Cell | Original Formula | Description |
|------|-----------------|-------------|
| `I20` | `=IF(D44 > 1, "×" & D44, "")` | Shows "×N" if enemy multi-hit > 1 |
| `I21` | `=IF(D44 > 1, "×" & D44, "")` | (same) |
| `I22` | `=IF(D44 > 1, "×" & D44, "")` | (same) |

### 1.6 Target Stats / Required Stats

These calculate the stat values needed to achieve a particular combat outcome.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `H26` | `=CEILING(IF(E21="物理", C23, E23) * 1.75)` | DEF/M-DEF needed to nullify all enemy damage (make received damage = 0) | `Math.ceil((enemyAtkType === "物理" ? enemyAtk : enemyInt) * 1.75)` |
| `H27` | `=CEILING(D42 / IF(E10 = "魔法", 1.25 * D50, 1.75) - IF(E10 = "魔法", D51, 0))` | Minimum ATK/INT needed to deal any damage (break through enemy defense) | `Math.ceil(effectiveEnemyDef / (selfAtkType === "魔法" ? 1.25 * magicMult : 1.75) - (selfAtkType === "魔法" ? magicBaseInt : 0))` |
| `H28` | `=MAX(CEILING((CEILING(H12 / H4) / 4 / D37 / 0.9 / D43 + D42) / IF(E10 = "魔法", 1.25 * D50, 1.75) - IF(E10 = "魔法", D51, 0)), 0)` | Target ATK/INT needed to kill enemy in `H4` attacks | See breakdown below |
| `H29` | `=MAX(CEILING((H22 * D44 * H5 / IF(H3 = "主人公", '主人公計算'!G9 / 100 + 1, 1) - 99) / 18), 0)` | Target VIT needed to survive `H5` enemy attacks | See breakdown below |
| `H30` | `=CEILING(C25 * H8)` | Hit LUCK required: `enemyLuck * hitLuckMultiplier` | `Math.ceil(enemyLuck * hitLuckMultiplier)` |
| `H31` | `=MAX(CEILING(C25 * H9), 100)` | Dodge LUCK required: `max(ceil(enemyLuck * dodgeLuckMultiplier), 100)` | `Math.max(Math.ceil(enemyLuck * dodgeLuckMultiplier), 100)` |

**Target ATK/INT breakdown (H28):**

```javascript
// Required damage per hit to kill in targetAttacks
let requiredDmgPerHit = Math.ceil(enemyHP / targetAttacks);
// Reverse the damage formula to find required attack stat
let requiredPreDef = requiredDmgPerHit / 4 / elementAffinity / 0.9 / multiHitCount + effectiveEnemyDef;
let requiredAtkStat;
if (selfAtkType === "魔法") {
  requiredAtkStat = Math.max(Math.ceil(requiredPreDef / (1.25 * magicMult) - magicBaseInt), 0);
} else {
  requiredAtkStat = Math.max(Math.ceil(requiredPreDef / 1.75), 0);
}
```

**Target VIT breakdown (H29):**

```javascript
// Total damage to survive for targetSurvivalTurns
let totalDmgToSurvive = maxDmgReceived * enemyMultiHit * targetSurvivalTurns;
// If hero mode, factor in HP% bonus from 禁域の液体
let hpMultiplier = (H3 === "主人公") ? (heroCalc.G9 / 100 + 1) : 1;
let requiredVit = Math.max(Math.ceil((totalDmgToSurvive / hpMultiplier - 99) / 18), 0);
```

### 1.7 Required Stat Additions (Flat & Allocation)

How much additional stat is needed beyond current values, and (for hero mode) how many stat points that requires.

**Flat additions needed:**

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `H34` | `=MAX(H26 - D41, 0)` | Additional DEF/M-DEF needed to nullify damage | `Math.max(nullifyDef - effectiveSelfDef, 0)` |
| `H35` | `=MAX(H28 - IF(E10 = "物理", C12, E12), 0)` | Additional ATK/INT needed to reach kill target | `Math.max(targetAtk - (selfAtkType === "物理" ? selfAtk : selfInt), 0)` |
| `H36` | `=MAX(H29 - C11, 0)` | Additional VIT needed to reach survival target | `Math.max(targetVit - selfVit, 0)` |
| `H37` | `=MAX(H30 - C14, 0)` | Additional LUCK needed for hit accuracy | `Math.max(hitLuck - selfLuck, 0)` |
| `H38` | `=MAX(H31 - C14, 0)` | Additional LUCK needed for dodge | `Math.max(dodgeLuck - selfLuck, 0)` |

**Dynamic labels:**

| Cell | Formula | Description |
|------|---------|-------------|
| `G26` | `="無効化" & D39` | "Nullify" + defense type label |
| `G27` | `="最低必要" & D40` | "Minimum required" + attack type label |
| `G28` | `="目標" & D40` | "Target" + attack type label |
| `G34` | `=D39 & "+"` | Defense type + "+" |
| `G35` | `=D40 & "+"` | Attack type + "+" |

**Hero mode allocation points needed (only available when H3 = "主人公"):**

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `H41` | `=IF($H$3 = "主人公", CEILING(H34 / IF(E21="物理", '主人公計算'!C108, '主人公計算'!C109)), "-")` | Allocation points for DEF: additional DEF needed / per-point DEF multiplier | `H3 === "主人公" ? Math.ceil(additionalDef / (enemyAtkType === "物理" ? heroCalc.C108 : heroCalc.C109)) : "-"` |
| `H42` | `=IF($H$3 = "主人公", CEILING(H35 / IF(E10 = "物理", '主人公計算'!C106, '主人公計算'!C107)), "-")` | Allocation points for ATK/INT | `H3 === "主人公" ? Math.ceil(additionalAtk / (selfAtkType === "物理" ? heroCalc.C106 : heroCalc.C107)) : "-"` |
| `H43` | `=IF($H$3 = "主人公", CEILING(H36 / '主人公計算'!C104), "-")` | Allocation points for VIT | `H3 === "主人公" ? Math.ceil(additionalVit / heroCalc.C104) : "-"` |
| `H44` | `=IF($H$3 = "主人公", CEILING(MAX(H30 - C14, 0) / '主人公計算'!C110), "-")` | Allocation points for hit LUCK | `H3 === "主人公" ? Math.ceil(Math.max(hitLuck - selfLuck, 0) / heroCalc.C110) : "-"` |
| `H45` | `=IF($H$3 = "主人公", CEILING(MAX(H31 - C14, 0) / '主人公計算'!C110), "-")` | Allocation points for dodge LUCK | `H3 === "主人公" ? Math.ceil(Math.max(dodgeLuck - selfLuck, 0) / heroCalc.C110) : "-"` |

### 1.8 Magic Settings

User-input magic configuration values and their computed effects.

| Cell | Value/Formula | Description |
|------|--------------|-------------|
| `D47` | User input (e.g. `光`) | Magic element used |
| `D48` | User input (e.g. `0`) | Number of 解析書 (analysis books) owned |
| `D49` | User input (e.g. `0`) | Number of 解析解析書 (analysis-analysis books) owned |
| `D50` | `=VLOOKUP(D47, '属性'!A15:B19, 2, FALSE)` | Magic element base multiplier (see table in 1.3) |
| `D51` | `=D48 * (1 + D49 * 0.1)` | Effective magic base INT bonus |

---

## 2. 主人公計算 (Hero Calculator)

### 2.1 Final Stats (Output)

The hero's final computed stats after all bonuses. These are the values consumed by the damage calculator.

The general stat formula is:
`ROUND(ROUND((baseWithEquip + accessoryFlat) * (1 + accessoryPct / 100)) * (1 + finalPct / 100))`

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `C4` | `=ROUND(ROUND((H57 + D48) * (1 + G48 / 100)) * (1 + J48 / 100))` | **Final VIT**: `round(round((preAllocVit + accFlatVit) * (1 + accPctVit%)) * (1 + finalPctVit%))` | `Math.round(Math.round((H57 + D48) * (1 + G48 / 100)) * (1 + J48 / 100))` |
| `C5` | `=ROUND(ROUND((H58 + D50) * (1 + G50 / 100)) * (1 + J50 / 100))` | **Final ATK** | `Math.round(Math.round((H58 + D50) * (1 + G50 / 100)) * (1 + J50 / 100))` |
| `C6` | `=ROUND(ROUND((H59 + D52) * (1 + G52 / 100)) * (1 + J52 / 100))` | **Final DEF** | `Math.round(Math.round((H59 + D52) * (1 + G52 / 100)) * (1 + J52 / 100))` |
| `C7` | `=ROUND(ROUND((H60 + D54) * (1 + G54 / 100)) * (1 + J54 / 100))` | **Final LUCK** | `Math.round(Math.round((H60 + D54) * (1 + G54 / 100)) * (1 + J54 / 100))` |
| `F4` | `=ROUND(ROUND((J57 + D49) * (1 + G49 / 100)) * (1 + J49 / 100))` | **Final SPD** | `Math.round(Math.round((J57 + D49) * (1 + G49 / 100)) * (1 + J49 / 100))` |
| `F5` | `=ROUND(ROUND((J58 + D51) * (1 + G51 / 100)) * (1 + J51 / 100))` | **Final INT** | `Math.round(Math.round((J58 + D51) * (1 + G51 / 100)) * (1 + J51 / 100))` |
| `F6` | `=ROUND(ROUND((J59 + D53) * (1 + G53 / 100)) * (1 + J53 / 100))` | **Final M-DEF** | `Math.round(Math.round((J59 + D53) * (1 + G53 / 100)) * (1 + J53 / 100))` |
| `F7` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=E7), 0), J60)` | **Final MOV**: sum of MOV effects from accessories/pets + base MOV | `sumEffects("MOV") + J60` |

Where:
- `H57`/`J57` = pre-allocation base stats (left/right columns)
- `D48`-`D54` = flat accessory/pet bonuses (from accessory table)
- `G48`-`G54` = percentage bonuses (from accessory table)
- `J48`-`J54` = "final" percentage bonuses (from accessory table)

### 2.2 Derived Stats

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `D8` | `=C6+FLOOR(F6/10)` | Effective DEF: `DEF + floor(M-DEF / 10)` | `finalDef + Math.floor(finalMdef / 10)` |
| `G8` | `=F6+FLOOR(C6/10)` | Effective M-DEF: `M-DEF + floor(DEF / 10)` | `finalMdef + Math.floor(finalDef / 10)` |
| `D9` | `=(FLOOR(C4) * 18 + 100) * (1 + G9 / 100)` | **Hero HP**: `(floor(VIT) * 18 + 100) * (1 + hpBonusPct%)` | `(Math.floor(finalVit) * 18 + 100) * (1 + hpBonusPct / 100)` |
| `G9` | (References `D10` context) | HP bonus percentage from 禁域の液体 | (Derived from item count) |
| `D10` | `=(VLOOKUP(C13, 'ステポ'!A2:B, 2, FALSE) + IF(G13 < 10, E13 * 30, 0)) * (1 + G13) + IF(G12, G13 * 10000, 0) + IF(G13 >= 10, VLOOKUP(G13, 'ステポ'!D3:E, 2, FALSE), 0)` | **Total stat points**: from level lookup + rebirth bonuses | See breakdown below |
| `D11` | `=10000+C12*10+E12*80` | **Stat allocation cap**: `10000 + sageCount * 10 + sageLevel * 80` | `10000 + sageCount * 10 + sageLevel * 80` |
| `D13` | `=IF(G13 < 10, "転生", "転生の極致")` | Rebirth type label: "転生" if count < 10, else "転生の極致" | `rebirthCount < 10 ? "転生" : "転生の極致"` |
| `G10` | `=D10 - SUM(D4:D7, G4:G6)` | Remaining stat points: `totalPoints - sum(all allocations)` | `totalPoints - (allocVit + allocAtk + allocDef + allocLuck + allocSpd + allocInt + allocMdef)` |
| `G17` | `=IF('リスト'!G2 = 5, "あり", "なし")` | Set bonus active: checks if equipment series count = 5 (from リスト sheet) | `equipSeriesCount === 5 ? "あり" : "なし"` |

**Total stat points breakdown (D10):**

```javascript
// C13 = level, E13 = rebirth bonus stat, G13 = rebirth count, G12 = sage flag
let basePoints = lookup(level, statPointsTable);  // ステポ sheet
let rebirthBonus = rebirthCount < 10 ? rebirthBonusStat * 30 : 0;
let totalPoints = (basePoints + rebirthBonus) * (1 + rebirthCount);
if (sageFlag) {
  totalPoints += rebirthCount * 10000;
}
if (rebirthCount >= 10) {
  totalPoints += lookup(rebirthCount, rebirthPinnacleTable);  // ステポ sheet D3:E
}
```

### 2.3 Protein (Buff) Stats

Protein stats are pre-computed from the protein section and then used in equipment stat calculations.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `C38` | `=FLOOR(D38 * (1 + $G$41 / 100))` | Protein VIT (left): `floor(baseProteinVit * (1 + proteinSetBonus%))` | `Math.floor(proteinBaseVit * (1 + proteinSetBonusPct / 100))` |
| `C39` | `=FLOOR(D39 * (1 + $G$41 / 100))` | Protein ATK (left) | `Math.floor(proteinBaseAtk * (1 + proteinSetBonusPct / 100))` |
| `C40` | `=FLOOR(D40 * (1 + $G$41 / 100))` | Protein DEF (left) | `Math.floor(proteinBaseDef * (1 + proteinSetBonusPct / 100))` |
| `C41` | `=FLOOR(D41 * (1 + $G$41 / 100))` | Protein LUCK (left) | `Math.floor(proteinBaseLuck * (1 + proteinSetBonusPct / 100))` |
| `F38` | `=FLOOR(G38 * (1 + $G$41 / 100))` | Protein SPD (right) | `Math.floor(proteinBaseSpd * (1 + proteinSetBonusPct / 100))` |
| `F39` | `=FLOOR(G39 * (1 + $G$41 / 100))` | Protein INT (right) | `Math.floor(proteinBaseInt * (1 + proteinSetBonusPct / 100))` |
| `F40` | `=FLOOR(G40 * (1 + $G$41 / 100))` | Protein M-DEF (right) | `Math.floor(proteinBaseMdef * (1 + proteinSetBonusPct / 100))` |

> `G41` = protein set bonus percentage (from the protein shaker count section)
> `D38`-`D41` and `G38`-`G40` = raw protein base values (user input)

### 2.4 Status Effects (Aggregated Bonuses)

These aggregate flat and percentage bonuses from accessories and pet skills.

**Flat stat bonuses from accessories/pets (rows 48-54, column D):**

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `D48` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=B48), 0))` | Total flat VIT from effects | `sumEffectsWhere(effectType === "VIT")` |
| `D49` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=B49), 0))` | Total flat SPD from effects | `sumEffectsWhere(effectType === "SPD")` |
| `D50` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=B50), 0))` | Total flat ATK from effects | `sumEffectsWhere(effectType === "ATK")` |
| `D51` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=B51), 0))` | Total flat INT from effects | `sumEffectsWhere(effectType === "INT")` |
| `D52` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=B52), 0))` | Total flat DEF from effects | `sumEffectsWhere(effectType === "DEF")` |
| `D53` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=B53), 0))` | Total flat M-DEF from effects | `sumEffectsWhere(effectType === "M-DEF")` |
| `D54` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=B54), 0))` | Total flat LUCK from effects | `sumEffectsWhere(effectType === "LUCK")` |

**Percentage stat bonuses from accessories/pets (rows 48-54, column G):**

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `G48` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=E48), 0))` | Total VIT% from effects | `sumEffectsWhere(effectType === "VIT%")` |
| `G49` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=E49), 0))` | Total SPD% from effects | `sumEffectsWhere(effectType === "SPD%")` |
| `G50` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=E50), 0))` | Total ATK% from effects | `sumEffectsWhere(effectType === "ATK%")` |
| `G51` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=E51), 0))` | Total INT% from effects | `sumEffectsWhere(effectType === "INT%")` |
| `G52` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=E52), 0))` | Total DEF% from effects | `sumEffectsWhere(effectType === "DEF%")` |
| `G53` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=E53), 0))` | Total M-DEF% from effects | `sumEffectsWhere(effectType === "M-DEF%")` |
| `G54` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=E54), 0))` | Total LUCK% from effects | `sumEffectsWhere(effectType === "LUCK%")` |

**"Final" percentage bonuses (rows 48-54, column J):**

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `J48` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=H48), 0))` | Total "最終VIT%" from effects | `sumEffectsWhere(effectType === "最終VIT%")` |
| `J49` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=H49), 0))` | Total "最終SPD%" from effects | `sumEffectsWhere(effectType === "最終SPD%")` |
| `J50` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=H50), 0))` | Total "最終ATK%" from effects | `sumEffectsWhere(effectType === "最終ATK%")` |
| `J51` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=H51), 0))` | Total "最終INT%" from effects | `sumEffectsWhere(effectType === "最終INT%")` |
| `J52` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=H52), 0))` | Total "最終DEF%" from effects | `sumEffectsWhere(effectType === "最終DEF%")` |
| `J53` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=H53), 0))` | Total "最終M-DEF%" from effects | `sumEffectsWhere(effectType === "最終M-DEF%")` |
| `J54` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=H54), 0))` | Total "最終LUCK%" from effects | `sumEffectsWhere(effectType === "最終LUCK%")` |

**Special effect aggregations:**

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `C44` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=B44), 0))` | Total capture rate bonus | `sumEffectsWhere(effectType === "捕獲率")` |
| `C45` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=B45), 0))` | Total EXP bonus | `sumEffectsWhere(effectType === "経験値")` |
| `F44` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=E44), 0))` | Total drop rate bonus | `sumEffectsWhere(effectType === "ドロップ率")` |
| `F45` | `=SUM(IFERROR(FILTER($I$74:$I$91, $G$74:$G$91=E45), 0))` | Total HP recovery bonus | `sumEffectsWhere(effectType === "HP回復")` |
| `D45` | `=(1 + C45 / 100) & "倍"` | EXP multiplier display | `(1 + expBonus / 100) + "倍"` |
| `G44` | `=(1 + F44 / 100) & "倍"` | Drop rate multiplier display | `(1 + dropBonus / 100) + "倍"` |
| `G45` | `=(1 + F45 / 100) & "倍"` | HP recovery multiplier display | `(1 + hpRecoveryBonus / 100) + "倍"` |

### 2.5 Pre-allocation Equipment Stats

These are the raw equipment stat sums (before stat allocation bonuses).

**Equipment stats per slot (columns G-N, rows 64-69):**

Each equipment slot's stat is calculated as:
`FLOOR(VLOOKUP(equipName, equipTable, statColumn, FALSE) * (1 + enhanceLevel / 10))`

| Stat Column | Equipment Table Column | Cells |
|-------------|----------------------|-------|
| VIT | 5 | `G64`-`G69` |
| SPD | 6 | `H64`-`H69` |
| ATK | 7 | `I64`-`I69` |
| INT | 8 | `J64`-`J69` |
| DEF | 9 | `K64`-`K69` |
| M-DEF | 10 | `L64`-`L69` |
| LUCK | 11 | `M64`-`M69` |
| MOV | 12 | `N64`-`N69` |

**Example (VIT for weapon slot):**

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `G64` | `=FLOOR(VLOOKUP(C64, '装備'!A2:M, 5, FALSE) * (1 + F64 / 10))` | Weapon VIT: `floor(baseVit * (1 + enhanceLevel / 10))` | `Math.floor(lookup(weaponName, equipment, "vit") * (1 + enhanceLevel / 10))` |

> The pattern repeats for all 6 equipment slots (rows 64-69) and all 8 stats (columns G-N).
> `C64`-`C69` = equipment name references (`C17`-`C22` in the input section)
> `F64`-`F69` = enhancement level references (`C17`-`C22` enhance levels)

### 2.6 Post-allocation Equipment Stats (with Mushroom House)

Pre-allocation stats combined with protein buffs and allocation bonuses, then multiplied by set bonus.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `H57` | `=FLOOR((C57 + C38 + D4) * IF($G$17="あり", 1.1, 1))` | Pre-alloc VIT: `floor((equipVit + proteinVit + allocVit) * setBonus)` | `Math.floor((equipTotalVit + proteinVit + allocVit) * (setBonus ? 1.1 : 1))` |
| `H58` | `=FLOOR((C58 + C39 + D5) * IF($G$17="あり", 1.1, 1))` | Pre-alloc ATK | `Math.floor((equipTotalAtk + proteinAtk + allocAtk) * (setBonus ? 1.1 : 1))` |
| `H59` | `=FLOOR((C59 + C40 + D6) * IF($G$17="あり", 1.1, 1))` | Pre-alloc DEF | `Math.floor((equipTotalDef + proteinDef + allocDef) * (setBonus ? 1.1 : 1))` |
| `H60` | `=FLOOR((C60 + C41 + D7) * IF($G$17="あり", 1.1, 1))` | Pre-alloc LUCK | `Math.floor((equipTotalLuck + proteinLuck + allocLuck) * (setBonus ? 1.1 : 1))` |
| `J57` | `=FLOOR((E57 + F38 + G4) * IF($G$17="あり", 1.1, 1))` | Pre-alloc SPD | `Math.floor((equipTotalSpd + proteinSpd + allocSpd) * (setBonus ? 1.1 : 1))` |
| `J58` | `=FLOOR((E58 + F39 + G5) * IF($G$17="あり", 1.1, 1))` | Pre-alloc INT | `Math.floor((equipTotalInt + proteinInt + allocInt) * (setBonus ? 1.1 : 1))` |
| `J59` | `=FLOOR((E59 + F40 + G6) * IF($G$17="あり", 1.1, 1))` | Pre-alloc M-DEF | `Math.floor((equipTotalMdef + proteinMdef + allocMdef) * (setBonus ? 1.1 : 1))` |
| `J60` | `=E60+6` | Pre-alloc MOV: `equipTotalMov + 6` (base MOV is always +6) | `equipTotalMov + 6` |

Where:
- `C57`/`E57` = equipment VIT/SPD totals (`G70`/`H70`)
- `C38`/`F38` = protein stats (see 2.3)
- `D4`-`D7`, `G4`-`G6` = user stat allocation values
- `G17` = set bonus flag ("あり" if 5-piece set equipped)

### 2.7 Equipment Stat Calculation (Per Slot)

Each of the 6 equipment slots (weapon, head, body, shield, hands, legs) calculates stats using the same pattern.

**General formula per equipment slot:**

```javascript
function calcEquipStat(equipName, equipTableStartRow, statColumnIndex, enhanceLevel) {
  let baseStat = lookup(equipName, equipmentTable[equipTableStartRow], statColumnIndex);
  return Math.floor(baseStat * (1 + enhanceLevel / 10));
}
```

**Equipment slot row mapping:**

| Slot | Row | Equipment Name Cell | Enhance Level Cell | Table Start Row |
|------|-----|--------------------|--------------------|-----------------|
| 武器 (Weapon) | 64 | `C64` (=`C17`) | `F64` (=`C17` enhance) | A2 |
| 頭 (Head) | 65 | `C65` (=`C18`) | `F65` (=`C18` enhance) | A3 |
| 服 (Body) | 66 | `C66` (=`C19`) | `F66` (=`C19` enhance) | A4 |
| 盾 (Shield) | 67 | `C67` (=`C20`) | `F67` (=`C20` enhance) | A5 |
| 手 (Hands) | 68 | `C68` (=`C21`) | `F68` (=`C21` enhance) | A6 |
| 脚 (Legs) | 69 | `C69` (=`C22`) | `F69` (=`C22` enhance) | A7 |

**Equipment table column mapping** (from `装備` sheet):

| Column Index | Stat |
|-------------|------|
| 5 | VIT |
| 6 | SPD |
| 7 | ATK |
| 8 | INT |
| 9 | DEF |
| 10 | M-DEF |
| 11 | LUCK |
| 12 | MOV |

### 2.8 Equipment Stat Totals

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `G70` | `=SUM(G64:G69)` | Total equipment VIT | `sum(equipVit[0..5])` |
| `H70` | `=SUM(H64:H69)` | Total equipment SPD | `sum(equipSpd[0..5])` |
| `I70` | `=SUM(I64:I69)` | Total equipment ATK | `sum(equipAtk[0..5])` |
| `J70` | `=SUM(J64:J69)` | Total equipment INT | `sum(equipInt[0..5])` |
| `K70` | `=SUM(K64:K69)` | Total equipment DEF | `sum(equipDef[0..5])` |
| `L70` | `=SUM(L64:L69)` | Total equipment M-DEF | `sum(equipMdef[0..5])` |
| `M70` | `=SUM(M64:M69)` | Total equipment LUCK | `sum(equipLuck[0..5])` |
| `N70` | `=SUM(N64:N69)` | Total equipment MOV | `sum(equipMov[0..5])` |

These totals feed into:
- `C57` = `G70` (VIT total)
- `E57` = `H70` (SPD total)
- `C58` = `I70` (ATK total)
- `E58` = `J70` (INT total)
- `C59` = `K70` (DEF total)
- `E59` = `L70` (M-DEF total)
- `C60` = `M70` (LUCK total)
- `E60` = `N70` (MOV total)

### 2.9 Accessory / Pet Skill Effect Resolution

Effects are resolved from 3 accessory slots (rows 74-79) and 3 pet slots (rows 80-91, 4 skill tiers each).

**Accessory effect resolution (rows 74-79):**

Each accessory has up to 2 effects. The effect type and value are looked up from the `アクセサリー` sheet.

| Cell | Original Formula | Description |
|------|-----------------|-------------|
| `G74` | `=VLOOKUP(C74, 'アクセサリー'!$A$2:$G, 2, FALSE)` | Accessory 1, effect 1 type |
| `G75` | `=VLOOKUP(C74, 'アクセサリー'!$A$2:$G, 5, FALSE)` | Accessory 1, effect 2 type |
| `G76`-`G79` | (same pattern for accessories 2 and 3) | |

**Accessory value calculation:**

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `C95` | `=VLOOKUP(C74, 'アクセサリー'!$A$2:$G, 3, FALSE)` | Accessory 1 effect 1 base value | `lookup(accName, accessories, "value1")` |
| `D95` | `=VLOOKUP(C74, 'アクセサリー'!$A$2:$G, 4, FALSE)` | Accessory 1 effect 1 growth rate (% per level) | `lookup(accName, accessories, "growth1")` |
| `E95` | `=C95 * (1 + D95 / 100 * MAX(B95 - 1, 1))` | Scaled value: `baseValue * (1 + growthPct/100 * max(level-1, 1))` | `baseVal * (1 + growthPct / 100 * Math.max(level - 1, 1))` |
| `F95` | `=IF(D95 >= 10, FLOOR(E95), E95)` | Final value: floor if growth >= 10%, otherwise keep decimal | `growthPct >= 10 ? Math.floor(scaledVal) : scaledVal` |

> This pattern repeats for all 6 effect slots (rows 95-100), covering 3 accessories x 2 effects each.

**Accessory effect value to effect table (rows 74-79, column I):**

| Cell | Original Formula | Description |
|------|-----------------|-------------|
| `I74` | `=IF(F95 = 0, "", F95)` | Accessory 1 effect 1 final value (blank if 0) |
| `I75` | `=IF(F96 = 0, "", F96)` | Accessory 1 effect 2 final value |
| `I76`-`I79` | (same pattern) | |

**Pet skill effect resolution (rows 80-91):**

Each pet has 4 skill tiers unlocked at levels 31, 71, 121, and 181.

| Cell | Original Formula | Description |
|------|-----------------|-------------|
| `G80` | `=IF(F80 >= 31, VLOOKUP(C80, 'ペットスキル'!$A$2:$I, 2, FALSE), "")` | Pet 1 skill 1 type (unlocked at Lv31) |
| `I80` | `=IF(F80 >= 31, VLOOKUP(C80, 'ペットスキル'!$A$2:$I, 3, FALSE), "")` | Pet 1 skill 1 value |
| `G81` | `=IF(F80 >= 71, VLOOKUP(C80, 'ペットスキル'!$A$2:$I, 4, FALSE), "")` | Pet 1 skill 2 type (unlocked at Lv71) |
| `I81` | `=IF(F80 >= 71, VLOOKUP(C80, 'ペットスキル'!$A$2:$I, 5, FALSE), "")` | Pet 1 skill 2 value |
| `G82` | `=IF(F80 >= 121, VLOOKUP(C80, 'ペットスキル'!$A$2:$I, 6, FALSE), "")` | Pet 1 skill 3 type (unlocked at Lv121) |
| `I82` | `=IF(F80 >= 121, VLOOKUP(C80, 'ペットスキル'!$A$2:$I, 7, FALSE), "")` | Pet 1 skill 3 value |
| `G83` | `=IF(F80 >= 181, VLOOKUP(C80, 'ペットスキル'!$A$2:$I, 8, FALSE), "")` | Pet 1 skill 4 type (unlocked at Lv181) |
| `I83` | `=IF(F80 >= 181, VLOOKUP(C80, 'ペットスキル'!$A$2:$I, 9, FALSE), "")` | Pet 1 skill 4 value |

> The same pattern repeats for Pet 2 (rows 84-87, using `F84` and `C84`) and Pet 3 (rows 88-91, using `F88` and `C88`).

**Pet skill unlock thresholds:**

| Tier | Required Level | Effect Type Column | Effect Value Column |
|------|---------------|-------------------|-------------------- |
| 1 | 31 | 2 | 3 |
| 2 | 71 | 4 | 5 |
| 3 | 121 | 6 | 7 |
| 4 | 181 | 8 | 9 |

**General JS pseudo-code for pet skill resolution:**

```javascript
function resolvePetSkills(petName, petLevel) {
  const thresholds = [
    { level: 31, typeCol: 2, valueCol: 3 },
    { level: 71, typeCol: 4, valueCol: 5 },
    { level: 121, typeCol: 6, valueCol: 7 },
    { level: 181, typeCol: 8, valueCol: 9 },
  ];
  return thresholds
    .filter(t => petLevel >= t.level)
    .map(t => ({
      type: lookup(petName, petSkills, t.typeCol),
      value: lookup(petName, petSkills, t.valueCol),
    }));
}
```

### 2.10 Accessory Value Calculation

Detailed formula for computing accessory effect values based on level and growth rate.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `B95`-`B100` | `=F26` / `=F27` / `=F28` (repeating) | Accessory level (from accessory slot level input) | `accessoryLevel` |
| `C95`-`C100` | `=VLOOKUP(...)` | Base value from accessory data | `lookup(accName, accessories, valueCol)` |
| `D95`-`D100` | `=VLOOKUP(...)` | Growth percentage from accessory data | `lookup(accName, accessories, growthCol)` |
| `E95` | `=C95 * (1 + D95 / 100 * MAX(B95 - 1, 1))` | Scaled value before floor check | `baseVal * (1 + growthPct / 100 * Math.max(level - 1, 1))` |
| `F95` | `=IF(D95 >= 10, FLOOR(E95), E95)` | Final value: apply floor for high-growth accessories | `growthPct >= 10 ? Math.floor(scaledVal) : scaledVal` |

**Accessory data columns** (from `アクセサリー` sheet):

| Column | Content |
|--------|---------|
| A | Accessory name |
| B | Effect 1 type |
| C | Effect 1 base value |
| D | Effect 1 growth % per level |
| E | Effect 2 type |
| F | Effect 2 base value |
| G | Effect 2 growth % per level |

### 2.11 Per-Point Multipliers (Required Allocation Calc)

These multipliers determine how much each stat increases per allocation point, used for reverse-calculating required points in the damage calculator.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `C104` | `=IF($G$17 = "あり", 1.1, 1) * (1 + G48 / 100) * (1 + J48 / 100)` | VIT per point | `(setBonus ? 1.1 : 1) * (1 + vitPct / 100) * (1 + finalVitPct / 100)` |
| `C105` | `=IF($G$17 = "あり", 1.1, 1) * (1 + G49 / 100) * (1 + J49 / 100)` | SPD per point | `(setBonus ? 1.1 : 1) * (1 + spdPct / 100) * (1 + finalSpdPct / 100)` |
| `C106` | `=IF($G$17 = "あり", 1.1, 1) * (1 + G50 / 100) * (1 + J50 / 100)` | ATK per point | `(setBonus ? 1.1 : 1) * (1 + atkPct / 100) * (1 + finalAtkPct / 100)` |
| `C107` | `=IF($G$17 = "あり", 1.1, 1) * (1 + G51 / 100) * (1 + J51 / 100)` | INT per point | `(setBonus ? 1.1 : 1) * (1 + intPct / 100) * (1 + finalIntPct / 100)` |
| `C108` | `=IF($G$17 = "あり", 1.1, 1) * (1 + G52 / 100) * (1 + J52 / 100)` | DEF per point | `(setBonus ? 1.1 : 1) * (1 + defPct / 100) * (1 + finalDefPct / 100)` |
| `C109` | `=IF($G$17 = "あり", 1.1, 1) * (1 + G53 / 100) * (1 + J53 / 100)` | M-DEF per point | `(setBonus ? 1.1 : 1) * (1 + mdefPct / 100) * (1 + finalMdefPct / 100)` |
| `C110` | `=IF($G$17 = "あり", 1.1, 1) * (1 + G54 / 100) * (1 + J54 / 100)` | LUCK per point | `(setBonus ? 1.1 : 1) * (1 + luckPct / 100) * (1 + finalLuckPct / 100)` |

---

## 3. ペット計算 (Pet Calculator)

### 3.1 Pet Stats with Mushroom Bonus

Pet stats are computed as base stats (without mushroom) plus an optional mushroom house bonus that applies to the pet's highest stat.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `C8` | `=C31 + IF($G$16 = B8, $G$17, 0)` | Pet VIT with mushroom: `baseVit + (if highest stat type matches "VIT", mushroomBonus, 0)` | `baseVit + (highestStatType === "VIT" ? mushroomBonus : 0)` |
| `C9` | `=C32 + IF($G$16 = B9, $G$17, 0)` | Pet ATK with mushroom | `baseAtk + (highestStatType === "ATK" ? mushroomBonus : 0)` |
| `C10` | `=C33 + IF($G$16 = B10, $G$17, 0)` | Pet DEF with mushroom | `baseDef + (highestStatType === "DEF" ? mushroomBonus : 0)` |
| `C11` | `=C34 + IF($G$16 = B11, $G$17, 0)` | Pet LUCK with mushroom | `baseLuck + (highestStatType === "LUCK" ? mushroomBonus : 0)` |
| `F8` | `=E31 + IF($G$16 = E8, $G$17, 0)` | Pet SPD with mushroom | `baseSpd + (highestStatType === "SPD" ? mushroomBonus : 0)` |
| `F9` | `=E32 + IF($G$16 = E9, $G$17, 0)` | Pet INT with mushroom | `baseInt + (highestStatType === "INT" ? mushroomBonus : 0)` |
| `F10` | `=E33 + IF($G$16 = E10, $G$17, 0)` | Pet M-DEF with mushroom | `baseMdef + (highestStatType === "M-DEF" ? mushroomBonus : 0)` |
| `F11` | `=E26` | Pet MOV (no mushroom bonus, direct from base) | `baseMov` |

> **Note:** `C31`-`C34` and `E31`-`E33` reference the "キノコなしペットステータス" (base pet stats without mushroom) section. These rows exist in the original spreadsheet but are beyond the exported data range. They represent the base VIT, ATK, DEF, LUCK (C column) and SPD, INT, M-DEF (E column) computed from the pet's monster data and level.

### 3.2 Base Monster Data Lookup

Base pet stats are looked up from the `敵ステータス` sheet using the pet's monster name (`B4`).

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `C22` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 3, FALSE)` | Pet element | `lookup(petName, monsters, "element")` |
| `E22` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 4, FALSE)` | Pet attack type | `lookup(petName, monsters, "attackType")` |
| `C23` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 5, FALSE)` | Base VIT | `lookup(petName, monsters, "vit")` |
| `E23` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 6, FALSE)` | Base SPD | `lookup(petName, monsters, "spd")` |
| `C24` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 7, FALSE)` | Base ATK | `lookup(petName, monsters, "atk")` |
| `E24` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 8, FALSE)` | Base INT | `lookup(petName, monsters, "int")` |
| `C25` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 9, FALSE)` | Base DEF | `lookup(petName, monsters, "def")` |
| `E25` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 10, FALSE)` | Base M-DEF | `lookup(petName, monsters, "mdef")` |
| `C26` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 11, FALSE)` | Base LUCK | `lookup(petName, monsters, "luck")` |
| `E26` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 12, FALSE)` | Base MOV | `lookup(petName, monsters, "mov")` |
| `C27` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 14, FALSE)` | Base EXP | `lookup(petName, monsters, "exp")` |
| `C28` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 13, FALSE)` | Capture rate | `lookup(petName, monsters, "captureRate")` |
| `E27` | `=VLOOKUP($B$4, '敵ステータス'!$A$2:$O, 15, FALSE)` | Base Gold | `lookup(petName, monsters, "gold")` |

### 3.3 Mushroom House Bonus Logic

The mushroom house provides a bonus to the pet's highest base stat.

| Cell | Original Formula | Description | JS Pseudo-code |
|------|-----------------|-------------|----------------|
| `G14` | `=((F4 - 1) * 0.1 + G4 * 3) * (G4 + 1) + 1` | Mushroom growth formula: `((petLevel - 1) * 0.1 + mushroomCount * 3) * (mushroomCount + 1) + 1` | `((petLevel - 1) * 0.1 + mushroomCount * 3) * (mushroomCount + 1) + 1` |
| `G15` | `=MAX(C31:C34, E31:E33)` | Highest base stat value (among VIT, ATK, DEF, LUCK, SPD, INT, M-DEF) | `Math.max(baseVit, baseAtk, baseDef, baseLuck, baseSpd, baseInt, baseMdef)` |
| `G16` | `=IFS(C31 = G15, B31, E31 = G15, D31, C32 = G15, B32, E32 = G15, D32, C33 = G15, B33, E33 = G15, D33, C34 = G15, B34)` | Name of the highest stat (first match in priority: VIT > SPD > ATK > INT > DEF > M-DEF > LUCK) | See below |
| `G17` | `=VLOOKUP(C22, B14:D18, 3, FALSE) * IF(D19, 100, 1)` | Mushroom bonus value: looks up element-based multiplier from mushroom table, then multiplied by 100 if mushroom house flag (D19) is TRUE | `lookupMushroomMultiplier(petElement) * (mushroomHouseFlag ? 100 : 1)` |

**Highest stat name resolution (G16) pseudo-code:**

```javascript
function getHighestStatName(stats) {
  // stats = { VIT: baseVit, SPD: baseSpd, ATK: baseAtk, INT: baseInt,
  //           DEF: baseDef, MDEF: baseMdef, LUCK: baseLuck }
  // Priority order: VIT, SPD, ATK, INT, DEF, M-DEF, LUCK
  const max = Math.max(...Object.values(stats));
  const priority = ["VIT", "SPD", "ATK", "INT", "DEF", "M-DEF", "LUCK"];
  return priority.find(key => stats[key] === max);
}
```

**Mushroom element multiplier table** (from `ペット計算` rows 10-14, column D):

> These values are user inputs (0 by default) for each element: 火, 水, 木, 光, 闇.
> The VLOOKUP in G17 uses the pet's element (C22) to select which mushroom setting to use.

---

## Appendix: Calculation Flow Summary

### Complete Damage Calculation Pipeline

```
1. Resolve self stats (from input / hero calc / pet calc)
2. Look up enemy base stats from monster database
3. Scale enemy stats by level: stat * ((level - 1) * 0.1 + 1)
4. Apply DEF/LUCK halving flags
5. Calculate element affinity multipliers
6. Determine multi-hit counts from SPD thresholds
7. Compute effective defense values (primary + floor(secondary / 10))
8. Calculate damage output:
   Physical: max((ATK * 1.75 - enemyEffDef), 0) * 4 * elementAffinity
   Magic:    max(((INT + magicBaseInt) * 1.25 * magicMult - enemyEffDef), 0) * 4 * elementAffinity
9. Apply damage variance: min = floor(base * 0.9), max = floor(base * 1.1)
10. Calculate kills needed: ceil(enemyHP / (minDmg * multiHit))
11. Calculate damage input (reverse of step 8 for enemy attacking)
12. Calculate survival turns: floor(selfHP / (maxDmgReceived * enemyMultiHit))
13. Reverse-calculate target stats for desired outcomes
```

### Hero Stat Calculation Pipeline

```
1. Look up equipment base stats from equipment database
2. Apply enhancement level: floor(baseStat * (1 + enhLevel / 10))
3. Sum equipment stats across all 6 slots
4. Calculate protein buffs with set bonus
5. Add stat allocation points
6. Apply set bonus (×1.1 if 5-piece set)
7. Resolve accessory effects (base value with level scaling)
8. Resolve pet skill effects (based on pet level thresholds)
9. Aggregate flat bonuses, % bonuses, and "final %" bonuses
10. Final stat = round(round((preAllocStat + flatBonus) * (1 + pctBonus%)) * (1 + finalPct%))
```

### Pet Stat Calculation Pipeline

```
1. Look up monster base stats from monster database
2. Calculate base pet stats (from level and powder count - in hidden rows)
3. Determine highest base stat and its type
4. Calculate mushroom house bonus based on element and settings
5. Add mushroom bonus to the highest stat only
6. Output final pet stats
```
