# OnceWorld Tools

OnceWorld 向けの計算ツール集。

## 機能

### ダメージ計算タブ — URLシェア

モンスターを選択した状態で「URLをコピー」ボタンを押すと、現在の入力状態を埋め込んだURLがクリップボードにコピーされる。そのURLを開くと同じ状態が復元される。

**共有される内容:**
- 選択中のモンスター（名前・レベル）
- ステータスモード（手動 / Simモード）
- 手動モード: ATK/INT/DEF/M-DEF/SPD/VIT/LUCK・属性・攻撃モード・解析書・クリスタルキューブ
- Simモード: 装備・アクセサリー・ペット・ステ振り・タンパク質など SimConfig A 全体

**URLを開いても上書きされないもの:**
- ステータスプリセット・Simプリセット（保存済みのプリセット一覧は安全）
- StatusSimulator の Config B
- ファーム計算の設定・カスタムプリセット
- カスタムモンスター

> Simモードの共有URLを開くと StatusSimulator の Config A にも反映される（同じデータを共有しているため）。

---

## セットアップ

```bash
git clone https://github.com/Conso-me/onceworld-tools.git
cd onceworld-tools
npm install

# git フックを有効化（初回のみ）
git config core.hooksPath .githooks
```

## 開発

```bash
npm run dev
```

## パッチノート

`src/data/patchNotes.ts` に更新履歴を管理しています。

```bash
# 新しいコミットをパッチノートに反映
npm run gen:patchnotes
```

`git push` 時は pre-push フックが自動で実行します（`git config core.hooksPath .githooks` が必要）。
GitHub へのマージ時は Actions が自動でコミットします。
