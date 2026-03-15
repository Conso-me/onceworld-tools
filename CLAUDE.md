# OnceWorld Tools

## UIレイアウト原則
- **縦スクロール禁止**：ページ全体が画面高さに収まるレイアウトにする。`overflow-hidden` や `h-screen` を活用し、スクロールバーが出ないことを確認してから完了とする
- **横並び2カラム**：入力パネル（左）と結果パネル（右）を横並びにする
  - パターン：`lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start`
  - モバイルは縦積み、PCは横並び（`lg:` prefix）
- 各タブは DamageCalculator / StatusSimulator のレイアウト構造に倣う
