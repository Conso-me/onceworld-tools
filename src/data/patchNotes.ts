export type ChangeType = "fix" | "feature" | "improve" | "feedback" | "wip";

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
    date: "2026-04-27",
    changes: [
    { type: "improve", text: "feat(i18n): DamageCalculator・SimConfigPanel等の英語化（PR1b）" },
    ],
  },

  {
    date: "2026-04-26",
    changes: [
    { type: "improve", text: "feat(i18n): 共通UI部品の英語化（PR1a）" },
    ],
  },

  {
    date: "2026-04-20",
    changes: [
    { type: "feature", text: "feat(data): 新武器3件追加（ネギソード・ワタッガシ・滅界双刃）" },
    { type: "improve", text: "feat(pet-battle): 先制ヒット数をスライダーで直接調整可能に" },
    { type: "improve", text: "fix(pet-battle): 開始距離50固定・先制ダメージを勝敗予測に反映" },
    { type: "feature", text: "feat(pet-battle): レンジ・接敵フェーズのシミュレーションを追加" },
    { type: "improve", text: "feat(pet-selector): ステータス別ソートに対応" },
    { type: "feature", text: "feat(pet-selector): ペット選択時にステータス表示と強さ順ソートを追加" },
    ],
  },

  {
    date: "2026-04-19",
    changes: [
    { type: "improve", text: "fix(damage): SPD多段HIT計算式を正式仕様に更新・上限撤廃" },
    ],
  },

  {
    date: "2026-04-17",
    changes: [
    { type: "improve", text: "fix(petbattle): LUK命中率計算式をヒル関数に更新（Issue #120）" },
    { type: "fix", text: "ペットバトル：幸運によるHIT率計算式をヒル関数に更新（実測データでフィット・検証中バッジを削除）" },
    { type: "improve", text: "revert(ci): PATCH_NOTES_PATに戻す" },
    { type: "fix", text: "fix(ci): PATCH_NOTES_PATをGITHUB_TOKENに変更してcheckout認証エラーを修正" },
    { type: "fix", text: "fix(ci): GH_TOKENをGITHUB_TOKENに変更してfeedback sync認証エラーを修正" },
    ],
  },

  {
    date: "2026-04-16",
    changes: [
    { type: "fix", text: "feat(magic): 心眼威圧を追加・時流停滞の魔法倍率を修正" },
    { type: "improve", text: "feat(petbattle): 幸運によるHIT率を勝敗予測に反映" },
    { type: "improve", text: "feat(petbattle): バトル結果にモンスター名・レベル・殲儀数を表示" },
    { type: "fix", text: "fix(data): 七理の宝環の最大レベルを100に修正" },
    { type: "improve", text: "fix(ui): 全ステ効果アクセをALL+X%表示・全カテゴリに表示" },
    { type: "improve", text: "feat(data): add 七理の宝環 accessory" },
    ],
  },

  {
    date: "2026-04-15",
    changes: [
    { type: "improve", text: "feat: ペットバトルをメインタブに昇格、ペットシミュをoverflowへ移動" },
    { type: "feature", text: "feat: ペット1対1バトルシミュレータを追加 (Issue #113)" },
    ],
  },

  {
    date: "2026-04-13",
    changes: [
    { type: "improve", text: "fix: OKライン数値を削除、オレンジ背景+グレー文字に変更" },
    { type: "improve", text: "fix: オーバーキル表示のコントラスト改善" },
    { type: "improve", text: "fix: オーバーキルラインの視認性を改善" },
    { type: "improve", text: "fix: ペットスキルの？を正しいタイプに更新" },
    { type: "fix", text: "fix: accCategory/petCategoryの翻訳キー不足を修正" },
    { type: "feature", text: "feat: アクセ・ペットの分類に経験値/捕獲率/ドロップ率/MOV/HP回復を追加" },
    ],
  },

  {
    date: "2026-04-12",
    changes: [
    { type: "feature", text: "feat: 装備サマリーにキャラクター情報セクションを追加" },
    { type: "feature", text: "feat: PWAオフライン対応を追加" },
    { type: "fix", text: "fix: 裏路地シミュの「ダメ計と同期」が最新値を反映しないバグを修正" },
    ],
  },

  {
    date: "2026-04-11",
    changes: [
    { type: "improve", text: "fix: 敵プリセットモーダルの出現場所列幅を拡張（w-44→w-56）" },
    { type: "improve", text: "fix: 装備サマリーのコンテンツ幅を60%に制限" },
    { type: "improve", text: "fix: 装備サマリーの名前を左揃え・強化値/レベルを右揃えに変更" },
    { type: "improve", text: "fix: テキストコピーのステータスをラベル・数値ともに右揃えに変更" },
    { type: "improve", text: "fix: テキストコピーのステータスを縦並びに変更" },
    { type: "feature", text: "feat: 装備・ステータス一括確認モーダルを追加" },
    { type: "feature", text: "feat: 木魔法・闇魔法のデバフ効果をダメージ計算に反映するトグルを追加" },
    ],
  },

  {
    date: "2026-04-10",
    changes: [
    { type: "improve", text: "fix: 敵プリセットモーダルのPC表示幅を拡張してモンスター名を広げる" },
    { type: "fix", text: "fix: 多段魔法（火魔法等）のオーバーキル判定を1発基準に修正" },
    { type: "improve", text: "refactor: ヘッダータブを5個に整理、周回計算・モンスター登録を⋯ドロップダウンへ" },
    { type: "feature", text: "feat: ペットシミュレータタブを追加" },
    { type: "improve", text: "feat: 魔法無効エネミーの表示対応 (close #93)" },
    { type: "feature", text: "feat: オコォーンを太古の中庭エネミープリセットに追加" },
    ],
  },

  {
    date: "2026-04-09",
    changes: [
    { type: "fix", text: "fix: パターン1ペット5体追加・超越者リガミア名前修正 (ref #90)" },
    { type: "feature", text: "feat: パターン2ペット（Lv200-1200）のスキルデータを追加 (close #90)" },
    { type: "improve", text: "feat: プリセット保存欄にペット名をデフォルト表示" },
    { type: "improve", text: "fix: 全部MAXから同族殲儀を除外（現ゲームでは30到達不可のため）" },
    { type: "improve", text: "refactor: 上限Lv入力を廃止・全部MAXボタンを1つに集約" },
    { type: "feature", text: "feat: 全数値入力にMAXボタンを追加" },
    { type: "fix", text: "fix: Issue #88 フィードバック対応（攻撃タイプ修正・MAXボタン・上限Lv・プリセット保存）" },
    { type: "feature", text: "feat: ペットのステータスでダメージ計算する機能を追加" },
    { type: "fix", text: "fix: アクセサリーの最大レベルをwiki準拠に修正し、選択時に自動セット" },
    { type: "fix", text: "fix: ビルドプリセットに魔晶立方体・魔法解析書を記録するよう修正" },
    { type: "feature", text: "fix: ステータスシミュレータのダメ計プリセット保存に魔法解析書・解析書の解析書・魔晶立方体を追加" },
    { type: "feature", text: "feat: 魔攻単体表示にOverKill用魔晶立方体数を追加、キューブ→魔晶立方体に統一" },
    { type: "feature", text: "feat: 魔攻比較リストにOverKillサマリーを追加" },
    { type: "improve", text: "fix: 比較リストのヘッダー・セルをモンスター名以外中央揃えに変更" },
    { type: "improve", text: "fix: 比較リストのオーバーキル表示を「OK」から「OverKill」に変更" },
    { type: "fix", text: "fix: 比較リストの魔攻でオーバーキル判定が表示されない問題を修正" },
    ],
  },

  {
    date: "2026-04-08",
    changes: [
    { type: "fix", text: "fix: ダークフェニックス・トリカゴドリ・オメガ・スペクトラムの攻撃タイプを魔攻に修正" },
    { type: "improve", text: "fix: 比較テーブルのmin-widthを600pxに拡大して読みやすく" },
    { type: "fix", text: "fix: ダメージ計算ページのスマホ表示でテキスト重なり・はみ出しを修正" },
    { type: "feature", text: "feat: 悪魔シリーズを装備選択UIに表示、持つ書物を追加" },
    { type: "improve", text: "feat: 与ダメ物理サマリーを与ダメ専用情報に作り直す" },
    { type: "feature", text: "feat: 与ダメ物理サマリーに命中LUCK最大の敵への与ダメ・必要LUCKを追加" },
    { type: "improve", text: "feat: 与ダメ比較（物理時）にも最大DEF/MDEFサマリーを表示" },
    { type: "improve", text: "fix: 達成済み時も必要DEF/MDEF値を常に表示" },
    { type: "feature", text: "feat: 被ダメ比較テーブルに全モンスター無効化に必要な最大DEF/MDEF表示を追加" },
    { type: "feature", text: "feat: オメガ・スペクトラムのデータを追加" },
    { type: "feature", text: "feat: バージョン2.0の装備・アクセ・モンスターデータを追加" },
    { type: "feature", text: "feat: 命中率表示に必要LUK・不足LUKのヒントを追加" },
    { type: "feature", text: "feat: ビルドプリセット読み込み後に上書き保存ボタンを追加" },
    { type: "fix", text: "fix: ヨハネの祭壇・羽ペンの振り分けポイント乗算順序を修正" },
    ],
  },

  {
    date: "2026-04-07",
    changes: [
    { type: "feature", text: "fix: 振り分け上限を天命輪廻ベースに変更・オコスターLv18万プリセット追加" },
    { type: "fix", text: "fix: ver2.0新モンスターの攻撃タイプ修正" },
    { type: "feature", text: "feat: ヨハネの祭壇を追加・ステータス割り振りを上部に移動" },
    { type: "fix", text: "fix: 暴君盾のステータス修正・強化対応化" },
    { type: "feature", text: "feat: ver2.0新モンスター7体・循環宇宙3〜5プリセット追加" },
    { type: "improve", text: "fix: 転生の極致ボーナスをテーブルから式 5000*(天命輪廻-9)^1.25 に置き換え (#60)" },
    ],
  },

  {
    date: "2026-04-05",
    changes: [
    { type: "improve", text: "fix: 魔法攻撃にクリティカル判定が存在しないため計算と表示から除外" },
    { type: "feature", text: "feat: 装備に表示順フィールド(order)を追加し、オーディンアックスを追加" },
    ],
  },

  {
    date: "2026-04-04",
    changes: [
    { type: "improve", text: "fix: 比較テーブルのヘッダーラベルを全て左揃えに統一" },
    { type: "feature", text: "feat: 数値表記を億・兆まで対応（英語はB・T追加）" },
    { type: "improve", text: "fix: ダメージ値のwrap防止（万が改行される問題）" },
    { type: "improve", text: "fix: 被ダメ・与ダメの最小値/最大値を列で揃える" },
    { type: "fix", text: "fix: 無効化DEF/MDEF・必要LUCK を専用列に分離、受けられる回数ラベル改行修正" },
    { type: "fix", text: "fix: 被ダメ表示幅修正・無効化必要DEF/MDEF表示追加 (close #66)" },
    ],
  },

  {
    date: "2026-04-03",
    changes: [
    { type: "feature", text: "feat: 雪山禁域にBOX Lv.100000プリセットを追加" },
    ],
  },

  {
    date: "2026-04-02",
    changes: [
    { type: "feature", text: "feat: フィードバック対応状況をパッチノートに追加" },
    { type: "feedback", text: "feat: フィードバック対応をパッチノートに統合" },
    { type: "feedback", text: "ステータスポイントの計算ミスを修正（Lv200・天命輪廻0・羽ペン0時に5275→4975と表示される不具合）" },
    { type: "wip", text: "天命輪廻12→13回でステータスポイントが減少する問題：原因特定済み・計算式を検証中" },
    { type: "feedback", text: "ダメージ計算にOver Killラインを追加（魔結晶収集に必要なATK/INT目安を表示）" },
    ],
  },

  {
    date: "2026-03-31",
    changes: [
    { type: "improve", text: "refactor: 裏路地テーブルの防御/攻撃カラムを縦線で区切る" },
    { type: "improve", text: "refactor: 裏路地の想定与ダメを最低値〜のみ表示に変更" },
    { type: "improve", text: "refactor: 裏路地UIを整理" },
    { type: "feature", text: "feat: 裏路地に物理攻撃の想定与ダメとHIT率カラムを追加" },
    { type: "improve", text: "fix: 裏路地のプリセット読み込みをビルドプリセット（装備シミュレータ）に統一" },
    ],
  },

  {
    date: "2026-03-29",
    changes: [
    { type: "fix", text: "fix: 魔晶立方体を防御計算前適用に確定・魔法effectiveDefをceilに修正 (#45)" },
    { type: "feature", text: "docs: データJSONの末尾追加ルールをSKILLとCLAUDE.mdに明記" },
    { type: "improve", text: "perf: 装備・アクセ・ペット・モンスター名をIDに置換してURL短縮" },
    { type: "improve", text: "perf: deflate圧縮でシェアURLをさらに短縮（776→476文字）" },
    { type: "improve", text: "perf: SimConfigのデフォルト値を除いてシェアURLを短縮" },
    { type: "improve", text: "feat: シェアボタンを「自分のステータス」ヘッダーに常時表示" },
    { type: "improve", text: "feat: 比較モードのモンスター一覧もURLシェアに含める" },
    { type: "improve", text: "docs: URLシェア機能の説明をREADMEに追記" },
    { type: "improve", text: "feat: ダメージ計算の状態をURLで共有できるようにする (#54)" },
    { type: "improve", text: "feat: 魔攻比較時に魔法を手動選択できるようにし、ダメージ表記を万単位に統一" },
    { type: "improve", text: "feat: ダメージ計算で複数モンスターを同時比較できるようにする" },
    { type: "improve", text: "fix: 比較モードOFF時にアクティブ設定をAにリセットする" },
    ],
  },

  {
    date: "2026-03-28",
    changes: [
    { type: "improve", text: "fix: 素材.jsonのドロップ元モンスターの記載不足を補完" },
    ],
  },

  {
    date: "2026-03-27",
    changes: [
    { type: "improve", text: "fix: 敵プリセットのマップグループを整理" },
    { type: "fix", text: "fix: 物理オーバーキル計算を単発基準に修正、多段切り替えトグルを追加" },
    { type: "feature", text: "feat: ダメージ計算結果のSNSシェア用テキストコピー機能を追加" },
    { type: "improve", text: "fix: ダメージ計算の与ダメージ結果を常時全表示に変更" },
    { type: "feature", text: "Revert \"feat: 魔晶立方体（魔法ダメージ+1%/個、最大1000個）を追加\"" },
    { type: "feature", text: "Revert \"chore: 魔晶立方体のUI入力欄を一時非表示（実装確認中）\"" },
    { type: "feature", text: "feat: 周回計算にエリアプリセット追加とカスタムプリセット保存機能を実装" },
    { type: "improve", text: "feat: 魔晶立方体の計算タイミングを画面で切替可能に" },
    { type: "improve", text: "fix: 魔晶立方体を最終ダメージへの乗算として正しく反映" },
    { type: "improve", text: "fix: 魔弾モードに魔晶立方体の効果を反映" },
    { type: "fix", text: "fix: 魔攻スペルのオーバーキルstat行が消える問題を修正" },
    { type: "improve", text: "feat: オーバーキル表示を改善" },
    { type: "feature", text: "feat: 魔法設定のリセット/MAXボタンとオーバーキル表示を追加" },
    { type: "feature", text: "feat: 魔晶立方体（魔法ダメージ+1%/個、最大1000個）を追加" },
    { type: "improve", text: "fix: 暴君シリーズを装備設定に表示・既存暴君盾をシリーズ分類に変更" },
    { type: "feature", text: "feat: ver1.7.0コンテンツを追加" },
    { type: "improve", text: "fix: 超越者リガミアのプリセット名に混入した全角スペースを削除" },
    { type: "feature", text: "feat: Vitestテスト基盤を追加（179テスト）" },
    ],
  },

  {
    date: "2026-03-26",
    changes: [
    { type: "improve", text: "feat: 裏路地の同期先モードを手動で選択できるようにする" },
    { type: "improve", text: "fix: 言語ボタンを「切替先」から「現在の言語」表示に変更" },
    { type: "improve", text: "feat: ダメ計の「自分のステータス」をモバイルで折り畳み可能に" },
    { type: "improve", text: "feat: モバイル対応を強化 (close #35)" },
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
