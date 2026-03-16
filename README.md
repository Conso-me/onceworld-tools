# OnceWorld Tools

OnceWorld 向けの計算ツール集。

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
