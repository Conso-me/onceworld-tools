export type ChangeType = "fix" | "feature" | "improve";

export interface PatchChange {
  type: ChangeType;
  text: string;
}

export interface PatchEntry {
  date: string; // "YYYY-MM-DD"
  title?: string; // 任意（手動追加用）
  changes: PatchChange[];
}

export const patchNotes: PatchEntry[] = [
  {
    date: "2026-03-26",
    changes: [
    { type: "improve", text: "fix: 裏路地同期ONかつ装備設定モード時にsim結果を連携" },
    { type: "feature", text: "feat: 割り振りポイントにリセットボタンを追加" },
    { type: "feature", text: "feat: DamageCalculatorに装備設定モードを追加（close #34）" },
    ],
  },

  {
    date: "2026-03-20",
    changes: [
    { type: "fix", text: "fix: スクロールバー出現によるレイアウトズレを修正" },
    { type: "improve", text: "feat: PCモーダルを拡幅しモンスター一覧の表示領域を拡大" },
    { type: "improve", text: "feat: 敵プリセット選択を3階層（マップ→エリア→モンスター）に変更 (close #31)" },
    ],
  },

  {
    date: "2026-03-17",
    changes: [
    { type: "fix", text: "refactor: パッチノートの項目順を新しいものが上になるよう修正" },
    { type: "feature", text: "feat: パッチノートにLODESTONEスタイルのタブフィルタを追加" },
      { type: "improve", text: "refactor: 全ページからタイトルヘッダーを削除して省スペース化" },
      { type: "improve", text: "feat: 裏路地シミュレーター機能強化 (#22)" },
      { type: "improve", text: "fix: パッチノート生成時にMerge pull requestコミットを除外" },
      { type: "improve", text: "fix: パッチノートからMerge pull requestエントリを削除" },
      { type: "improve", text: "feat: パッチノートを年＞月＞日の階層表示に変更" },
      { type: "fix", text: "fix: 捕獲率の入力で小数点以下を受け付けるよう修正" },
      { type: "fix", text: "fix: 捕獲率で0や0.01など0始まりの小数が入力できない問題を修正" },
      { type: "improve", text: "fix: パッチノート生成スクリプトをコミット単位のdedup方式に改善" },
      { type: "improve", text: "fix: パッチノートワークフローにPATを使用してブランチ保護をバイパス" },
      { type: "fix", text: "fix: ステータスポイントに転生ボーナスを加算して #15 を修正" },
      { type: "improve", text: "fix: 天命輪廻10以上のとき転生回数入力を「転生の極致」表示に切り替え" },
      { type: "improve", text: "feat: レベル入力時に転生回数を自動推定・入力" },
    ],
  },

  {
    date: "2026-03-16",
    changes: [
      { type: "feature", text: "裏路地シミュレーター追加（Issue #4）" },
      { type: "feature", text: "タブにアイコン追加・ヘッダーをライト系グラデーションに変更" },
      { type: "improve", text: "数値入力欄をtype=\"number\"に統一してスピナーを表示" },
      { type: "feature", text: "裏路地にLUK回避表示を追加・全数値入力欄を3桁区切り表示に戻す" },
      { type: "improve", text: "タブタイトルをOnceWorld Toolsに変更" },
      { type: "improve", text: "スマホ向けレスポンシブ対応（モーダル・タブ・ヘッダー）" },
      { type: "improve", text: "NumInputの入力中に空文字を許容し数値入力を改善" },
      { type: "improve", text: "SmallNumInputで装備強化・アクセLv・スキルPt入力も空文字許容に統一" },
      { type: "feature", text: "Vercel Analyticsを追加" },
      { type: "feature", text: "フィードバック新規Issue作成時にDiscord通知を追加" },
      { type: "feature", text: "パッチノート機能を追加（モーダル表示・自動生成スクリプト・CI連携）" },
      { type: "improve", text: "gitフックを.githooks/に移動しLF改行を保証" },
      { type: "improve", text: "READMEをプロジェクト用に書き直し（セットアップ手順・パッチノート運用を記載）" },
      { type: "improve", text: "タブにアイコン追加・ヘッダーデザインを変更" },
      { type: "improve", text: "敵ステータス表示をラベル上・値下の縦積みレイアウトに統一" },
      { type: "improve", text: "ステータスの入力欄を数値キーボード化・3桁カンマ表示に統一" },
      { type: "improve", text: "数値入力欄の空文字許容・3桁カンマ表示を統一" },
      { type: "improve", text: "スマホ向けレスポンシブ対応を改善" },
      { type: "fix", text: "モバイル表示の崩れを修正（入力欄・周回計算）" },
      { type: "feature", text: "裏路地にLUK回避表示を追加" },
      { type: "feature", text: "裏路地シミュレーターを追加（Issue #4）" },
      { type: "fix", text: "ビルドプリセット保存・連携機能を追加し、ダメ計プリセットのバグを修正" },
      { type: "improve", text: "被ダメ計算UIに補助防御情報と魔法ダメージ表示を改善" },
      { type: "fix", text: "数値入力のカーソルズレを修正し、被ダメ防御値表示を右揃えに改善" },
      { type: "feature", text: "カスタムモンスター登録機能を追加" },
    ],
  },
  {
    date: "2026-03-15",
    changes: [
      { type: "feature", text: "ステータスプリセット機能を追加・レスポンシブUI改善" },
      { type: "feature", text: "ステータスシミュレーターを実装（Issue #2）" },
      { type: "improve", text: "ステータスシミュ利便性向上（Issue #6）" },
      { type: "improve", text: "経験値・金策タブを周回計算機に統合（Issue #7関連）" },
      { type: "feature", text: "モンスタードロップデータ最新化・周回計算機実装（Issue #7）" },
      { type: "feature", text: "ヘッダーにフィードバックとBuy me a coffeeリンクを追加" },
      { type: "improve", text: "ダメージ計算機のレイアウト改修・敵プリセット追加（Issue #3）" },
      { type: "improve", text: "ステータスシミュレーターを拡張（装備強化・4枠アクセ・3枠ペット・全MAX）" },
      { type: "improve", text: "ステータスシミュのUI改善（装備・アクセ・ペット選択モーダル化など）" },
      { type: "improve", text: "経験値・金策タブを周回計算機に統合" },
      { type: "improve", text: "周回設定UIの入力欄を整理・改善" },
      { type: "improve", text: "敵プリセット・モンスター選択をモーダルUIに変更" },
      { type: "improve", text: "ダメージ計算機の魔法攻撃機能を大幅強化" },
      { type: "fix", text: "未使用定数を削除してVercelビルドエラーを修正" },
      { type: "feature", text: "モンスタードロップデータ最新化・周回計算機を実装（Issue #7）" },
      { type: "feature", text: "ダメージ計算機にVIT・LUK追加、プリセットUIをモーダル化（Issue #10）" },
      { type: "feature", text: "受けられる回数が0〜1回の時に即死警告UIを表示" },
      { type: "feature", text: "フィードバックループの仕組みを実装（Issue #9）" },
    ],
  },
  {
    date: "2026-03-14",
    changes: [
      { type: "feature", text: "計画書・スクリプト・Supabase設定・アセットを追加" },
      { type: "improve", text: "プロジェクト基盤をセットアップ" },
      { type: "feature", text: "ゲームデータとWiki計算式リファレンスを追加" },
      { type: "feature", text: "型定義・データモジュール・計算ユーティリティを実装" },
      { type: "feature", text: "ダメージ計算機・経験値計算機・金策計算機のUIを実装" },
      { type: "feature", text: "タブ切り替え・リロード時の状態保持を実装" },
    ],
  },
  {
    date: "2026-01-17",
    changes: [
      { type: "improve", text: "Initial commit" },
    ],
  },
];
