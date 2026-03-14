# Supabase セットアップガイド

## APIキーについて

### どのキーを使うか？

Supabase Dashboard > Project Settings > API で確認できるキー：

| キー名 | 用途 | このプロジェクトで使う？ |
|--------|------|------------------------|
| **Project URL** | APIエンドポイント | ✅ **必須** |
| **anon public** | 公開用APIキー | ✅ **必須** |
| **service_role secret** | 管理者用（全権限） | ❌ 使わない |

### 必要な情報

以下2つを `.env.local` ファイルに設定します：

```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**注意**: `service_role secret` は**使わないでください**。これはサーバーサイドのみで使用する管理者キーで、公開するとセキュリティリスクになります。

---

## 管理画面用のアドレスとパスワード

### これは何？

管理画面（あなた専用のデータ編集画面）にログインするための認証情報です。

### なぜ必要？

SupabaseのRow Level Security（RLS）を設定して：
- **一般ユーザー**: データの読み取りのみ可能
- **管理者（あなた）**: データの作成・更新・削除が可能

### どうやって作る？

#### 方法1: Supabase Dashboardから作成（推奨）

1. Supabase Dashboard > Authentication > Users を開く
2. 「Add user」ボタンをクリック
3. 以下を入力：
   - **Email**: あなたのメールアドレス（例: yourname@gmail.com）
   - **Password**: 任意のパスワード（8文字以上、推奨: 12文字以上）
4. 「Create user」

#### 方法2: 管理画面作成後にサインアップ

管理画面が完成してから、画面上でサインアップしてもOKです。

---

## 今すぐやること

### Step 1: API情報を共有

Supabase Dashboard > Project Settings > API から以下をコピー：

```
Project URL: https://xxxxxxxxxxxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIs...
```

これらをKimiに教えてください。

### Step 2: 管理者アカウント作成（今すぐでなくてもOK）

管理画面が完成した後で作成でも問題ありません。

---

## 補足: RLSポリシーについて

Kimiが設定するRLSポリシーのイメージ：

```sql
-- 一般ユーザー: 読み取りのみOK
CREATE POLICY "Allow public read" ON monsters
    FOR SELECT USING (true);

-- 管理者: 全操作OK
CREATE POLICY "Allow admin all" ON monsters
    FOR ALL USING (auth.uid() IN (SELECT auth.uid FROM auth.users));
```

これにより、誰でもデータを見られるが、編集できるのは管理者（あなた）のみ、という設定になります。
