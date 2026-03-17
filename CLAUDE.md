# OnceWorld Tools

## 開発フロー原則
- **機能改修は必ずPRで**：新機能・バグ修正・リファクタリングを問わず、すべての変更はfeature/fix/refactorブランチを切ってPRを作成してからmainにマージする
  - `main` への直接pushは禁止
  - PR作成前に必ずブランチを作成する（`git checkout -b feature/xxx`）
  - PRには変更内容・理由・確認事項を記載する
- **作業開始前にブランチ確認**：`main` ブランチにいる場合、作業ブランチを切ってから実装を開始する

## UIレイアウト原則
- **縦スクロール禁止**：ページ全体が画面高さに収まるレイアウトにする。`overflow-hidden` や `h-screen` を活用し、スクロールバーが出ないことを確認してから完了とする
- **横並び2カラム**：入力パネル（左）と結果パネル（右）を横並びにする
  - パターン：`lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start`
  - モバイルは縦積み、PCは横並び（`lg:` prefix）
- 各タブは DamageCalculator / StatusSimulator のレイアウト構造に倣う
