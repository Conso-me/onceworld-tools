# 新アプデ データ追加テンプレート

新マップ・新モンスター・新アクセサリーを追加する際のコピペ用テンプレート集。

---

## 1. モンスター基礎ステータス（`docs/data/monsters.json`）

**末尾に追加**（途中挿入・並び替え禁止）

```json
  {
    "name": "モンスター名",
    "level": 0,
    "element": "木|火|水|光|闇",
    "attackType": "物理|魔法|魔弾",
    "vit": 0,
    "spd": 0,
    "atk": 0,
    "int": 0,
    "def": 0,
    "mdef": 0,
    "luck": 0,
    "mov": 0,
    "captureRate": 0,
    "exp": 0,
    "gold": 0
  }
```

**`captureRate` 目安:**
- 通常モンスター: 1〜3
- ボス・禁域: 0.1〜0.01

---

## 2. モンスタードロップ情報（`docs/wiki/json/モンスター.json`）

`rows` 配列の末尾に追加:

```json
["モンスター名", "出現場所", "通常ドロップ", "レアドロップ", "激レアドロップ", "捕獲率%"]
```

例:
```json
["新モンスター", "新マップ", "青の結晶", "ルーン石板", "", "1.00%"]
```

空のドロップ欄は `""` でOK。

---

## 3. ドロップ率オーバーライド（`src/data/monsterDrops.ts`）

デフォルトは50%。特殊な場合のみ `DROP_RATE_OVERRIDES` に追記:

```typescript
  "新モンスター名": 100,  // ルーン石板ドロップボスなど
```

---

## 4. モンスターペットスキル（`docs/data/pet-skills.json`）

分かり次第、末尾に追加:

```json
  {
    "name": "モンスター名",
    "skills": [
      { "level": 31,  "type": "ATK|INT|VIT|SPD|DEF|MDEF|LUCK|ATK%|INT%|VIT%|SPD%|DEF%|MDEF%|最終ATK%|最終INT%|最終VIT%|最終SPD%|最終DEF%|最終MDEF%", "value": 0 },
      { "level": 71,  "type": "???", "value": 0 },
      { "level": 121, "type": "???", "value": 0 },
      { "level": 181, "type": "???", "value": 0 }
    ]
  }
```

未判明スキルは後でいつでも追加できる。

---

## 5. アクセサリー（`docs/data/accessories.json`）

**末尾に追加**（途中挿入・並び替え禁止）

```json
  { "name": "アクセサリー名", "maxLevel": 9999, "effects": [{ "type": "ATK%", "value": 30, "scalePercent": 1 }] }
```

**複合効果の場合:**
```json
  { "name": "アクセサリー名", "maxLevel": 100, "effects": [
    { "type": "ATK",  "value": 90,  "scalePercent": 10 },
    { "type": "ATK%", "value": 5,   "scalePercent": 1  }
  ]}
```

**`type` 一覧:**
`VIT` / `VIT%` / `SPD` / `SPD%` / `ATK` / `ATK%` / `INT` / `INT%`
`DEF` / `DEF%` / `M-DEF` / `M-DEF%` / `LUCK` / `LUCK%` / `MOV`
`HP回復` / `経験値` / `捕獲率` / `ドロップ率`

**`scalePercent` の意味:** Lv1上げるごとに増える量の%（例: value=90, scalePercent=10 → Lv2で99, Lv3で108...）

---

## 6. マップ・エリアプリセット（`src/data/enemyPresets.ts`）

`enemyPresetGroups` 配列の末尾（`];` の直前）に追加:

### 新マップ（複数エリア）
```typescript
  {
    mapLabel: "新マップ名",
    label: "エリア名1",
    presets: [
      { monsterName: "モンスター名", level: 10000, location: "エリア名1" },
      { monsterName: null,           level: 20000, location: "エリア名1" },  // 名称不明の場合
    ],
  },
  {
    mapLabel: "新マップ名",
    label: "エリア名2",
    presets: [
      { monsterName: "モンスター名", level: 50000, location: "エリア名2" },
    ],
  },
```

### 既存マップへのエリア追加
既存の `mapLabel` と同じ値を使えば自動的にグループ化される。

---

## 追加チェックリスト

新モンスターを追加する際の作業一覧:

- [ ] `docs/data/monsters.json` — 基礎ステータス（末尾追加）
- [ ] `docs/wiki/json/モンスター.json` — ドロップ情報（`rows`末尾追加）
- [ ] `src/data/monsterDrops.ts` — 特殊ドロップ率があれば追加
- [ ] `docs/data/pet-skills.json` — ペットスキル（判明次第）
- [ ] `src/data/enemyPresets.ts` — マップのプリセット

新アクセサリー:
- [ ] `docs/data/accessories.json` — 末尾追加
