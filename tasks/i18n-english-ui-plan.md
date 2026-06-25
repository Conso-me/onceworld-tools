# i18n 英語化プラン（Forms フィードバック「pls add more english」対応）

> セッション再開時はこのファイルを最初に読む。状態と次手順がここに集約。

## 全体方針（変更不可）

- **型値はJP維持**：`type Element = "火" | "水" | ..."` 等の型値は翻訳しない。`monsters.json` / 共有URL / localStorage に影響するため。
- **表示層のみ翻訳**：`t(\`game:element.${el}\`)` 等で表示時に変換。
- **8 namespace構成**：`common` / `game` / `damage` / `status` / `farm` / `arena` / `monsters` / `petbattle`
- **多namespace使用パターン**：`useTranslation(["damage", "common"])` + `t("common:total")` の prefix 形式
- **module-level 配列に t() 必要なら**：コンポーネント内で `useMemo` 化する
- **Forms フィードバック原文**: 「pls add more english」

## 進捗状況

| PR | スコープ | ブランチ | 状態 |
|----|---------|---------|------|
| **PR1a** | 共通UI部品（装備サマリー・モンスター選択・敵プリセット・ダメージサマリー3種・App.tsx 装備確認） | `feature/i18n-common-ui-2026-04-26` | **PR #131 マージ済み** |
| **PR1b** | `SimConfigPanel` + `DamageCalculator` 本体 + Comparison表・PetConfigPanel | `feature/i18n-damage-main-2026-04-27` | **PR #132 オープン中**、レビュー後 merge |
| PR1c | `PetSimulator` / `ArenaCalculator` / `StatusSimulator` / `FarmCalculator` / `MonsterEditor` / `PetBattleSimulator` / `ExpCalculator` / `GoldCalculator` / `PatchNotesModal` / `AreaPresetModal` / `MonsterPickerModal` / 各種 ui 残り | 未作成 | 待機 |
| **PR2** | ゲームデータに `nameEn` フィールド追加（モンスター名翻訳） | 未作成 | マッピング準備済み |

## PR毎の手順

### PR1b 開始時

1. `git checkout main && git pull`
2. `git checkout -b feature/i18n-damage-main-2026-XX-XX`
3. 対象ファイル：
   - `src/components/SimConfigPanel.tsx`
   - `src/components/DamageCalculator.tsx`
   - `src/components/damage/DefensiveComparisonTable.tsx`
   - `src/components/damage/OffensiveComparisonTable.tsx`
   - `src/components/damage/PetConfigPanel.tsx`
4. JP literal 抽出 → `damage.json` / `common.json` / `game.json` にキー追加（既存キー再利用優先）
5. 検証: `npx tsc --noEmit` && `npm run build` && ブラウザJA/EN切替
6. 単一コミット（PR1aと同方針）→ push → `gh pr create`

### PR1c 開始時

1. ブランチ：`feature/i18n-other-tabs-2026-XX-XX`
2. 各タブ毎にファイル群分けて段階的に。tab 毎にサブコミット切ってもOK（PR1cは規模大）
3. ui/ 残り：`InputField` (placeholder のみ・大半数値で対応不要), `MonsterSelector`, `ProgressBar`, `ResultRow`, `StatCard`, `TabNav`

### PR2 開始時

1. ブランチ：`feature/i18n-game-data-2026-XX-XX`
2. **マッピングファイル**：`docs/wiki/en/monster_name_mapping.json`（123/123 完了済み・gitignored）
3. 作業：
   - `docs/data/monsters.json` の各エントリに `nameEn` フィールド追加（マッピングJSONの `en` を移植）
   - `types/game.ts` の `MonsterBase` に `nameEn?: string` 追加
   - 表示箇所で `i18n.language === "en" ? m.nameEn ?? m.name : m.name` または helper関数化
4. **データ追加ルール厳守**（CLAUDE.md）：配列順序変更・途中挿入・削除禁止。`nameEn` は既存エントリへのフィールド追加のみ。
5. 装備・アクセサリ・ペットスキル名も同様に翻訳予定なら別PRに分割推奨

## マッピングファイル仕様

`docs/wiki/en/monster_name_mapping.json`:
```json
[
  { "jaIdx": 0, "ja": "グリーンスライム", "en": "Green Slime",
    "pokedexIdx": 0, "matchType": "stat_unique" },
  ...
]
```

- 123エントリ
- 118 = `stat_unique`（ステータス完全一致で自動マッチ）
- 5 = `manual_override`（古代魚ザコーン・パンダ・アヌビス・禁域のヴァルネシア・オコスター）
- ソース：`docs/wiki/en/monster_EN.txt`（pokedex順、ただしJA配列順と異なる）

## 検証チェックリスト（PR毎共通）

- [ ] `npx tsc --noEmit` 通過
- [ ] `npm run build` 成功
- [ ] ブラウザで JA → EN → JA トグルし表示崩れ無し
- [ ] 既存共有URLが引き続き動作（型値据え置きの確認）
- [ ] 既存プリセット (localStorage) が引き続き動作

## 学んだこと（次回参考）

- **InputField の placeholder 確認**：型値や数値デフォルト (`"0"`) は翻訳不要。コード読んで実態確認してからキー追加。
- **MonsterSelectorModal の壊れた条件式に注意**：旧 i18n 化途中の `t("game:element.火", { defaultValue: "" }).length > 0` のような nonsense 条件は素直に `t("monsters:element")` 等に書き換える。
- **コミット分割**：i18n PR は「キー追加」と「使用」がペアなので**単一コミット推奨**。コミット分割すると reviewer がキー対応確認で行き来する羽目になる。

## 参考PR

- PR #131 (PR1a): https://github.com/Conso-me/onceworld-tools/pull/131
