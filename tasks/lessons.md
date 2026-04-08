# Lessons Learned

## [2026-04-08] 新シリーズ装備がダメージ計算の選択UIに出ない

**発生回数**: 2回以上（ユーザーが「前もあった気がする」と言及）

**原因**: `src/components/SimConfigPanel.tsx` の `EQUIP_SERIES_ORDER` 配列が装備シリーズのホワイトリストになっている。
`equipment.json` に新シリーズを追加しても、この配列に追加しないとUIに表示されない。

```typescript
// SimConfigPanel.tsx:72
const EQUIP_SERIES_ORDER = ["皮", "鉄", "プラチナ", "魔導士", "獄炎", "ドラゴン", "暴君", "悪魔", "その他"] as const;
```

**対策**: `equipment.json` に新シリーズ（`series` フィールド）を追加するときは、**必ず** `SimConfigPanel.tsx` の `EQUIP_SERIES_ORDER` にも追加する（`"その他"` の直前に挿入）。

**将来的な改善案**: `EQUIP_SERIES_ORDER` を動的に `equipment.json` から生成すれば漏れがなくなる。
