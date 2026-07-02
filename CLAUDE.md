# OnceWorld Tools

## 開発フロー原則
- **機能改修は必ずPRで**：新機能・バグ修正・リファクタリングを問わず、すべての変更はfeature/fix/refactorブランチを切ってPRを作成してからmainにマージする
  - `main` への直接pushは禁止
  - PR作成前に必ずブランチを作成する（`git checkout -b feature/xxx`）
  - PRには変更内容・理由・確認事項を記載する
- **作業開始前にブランチ確認**：`main` ブランチにいる場合、作業ブランチを切ってから実装を開始する

## データファイル管理ルール

以下のJSONファイルは**配列インデックス = サイト内部ID**としてURLシェア機能で使用している。

- `docs/data/equipment.json`
- `docs/data/accessories.json`
- `docs/data/pet-skills.json`
- `docs/data/monsters.json`

**必須ルール：新アイテムは必ず末尾に追加し、既存エントリの並び替え・途中挿入・削除は禁止。** 違反すると既存の共有URLが壊れる。

## 新アプデ時の英語対応フロー

1. ゲームデータを更新する（日本語のみでOK）
   - `docs/data/accessories.json` に新アクセを追加（`nameEn` 不要）
   - `src/data/enemyPresets.ts` に新プリセットを追加（`locationEn` / `mapLabelEn` / `labelEn` 不要）
2. `npm run fill-en` を実行する
   - 未翻訳フィールドを自動検知
   - Claude API で機械翻訳してファイルを更新
   - GitHub Issue（`i18n-review` ラベル）を作成してWiki確認を促す
3. Issue を参照してWikiと照合し、不正確な訳があれば手動修正してクローズ

> `ANTHROPIC_API_KEY` が未設定の場合は `[要翻訳] XXX` プレースホルダーで代替。
> `--dry-run` フラグで変更せずに確認のみ可能。

## レイアウト・UI統一規約
- **縦スクロール禁止**：PC ではページ全体が画面高さに収まるレイアウトにする。スクロールバーが出ないことを確認してから完了とする
- **2カラム骨格は `PageLayout`（`src/components/ui/layout/PageLayout.tsx`）経由必須**。`grid-cols-[minmax(` の直書き禁止
  - 標準：入力左 minmax(340px,400px) / 結果右 1fr / lg:gap-2 / lg:items-start。モバイルは max-w-lg mx-auto space-y-6 の縦積み
  - 左列を広げたい場合のみ `leftWidth="wide"`（420px）、タブ内サブ画面は `"narrow"`（360px, gap-4）
- **カードは `Panel`（`src/components/ui/layout/Panel.tsx`、内部は themed/Card）経由**。標準装飾 = `bg-card border border-line rounded-card shadow-sm`。`rounded-3xl` / `shadow-lg` 系の新規使用禁止
- **モーダルは `ModalShell`（`src/components/ui/modal/`）経由必須**。`fixed inset-0` の直書き禁止
  - portal / ESC / 背景クリック閉じ / z-50 / bg-black/50 / 中央寄せはシェルが担う
  - 高さ：2ペイン選択系 = `height="fixed"`（min(640px,85vh)）、表示系 = `"auto"`（max-h-[85vh]）
- **選択系モーダルは2ペイン**（左：GroupNav グループメニュー / 右：リスト）。PC は縦サイドバー、モバイルは横スクロールピル（GroupNav が自動切替）
- **ブレークポイント**：ページの2カラム切替 = `lg` / モーダル内の2ペイン切替 = `sm`
- **ページ内スクロール領域**：`max-h-[calc(100vh-220px)]` に統一（インライン style 禁止）
- **色はトークン優先**：新規コードでは `bg-card` / `text-ink` / `text-muted` / `border-line` / `accent` 系を使う（`src/index.css` 参照）
