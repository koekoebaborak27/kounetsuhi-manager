# Google ログインの準備

手元でログインを試すために、Google Cloud で OAuth のクライアントを作り、`.env` に値を入れる手順。
ログインの仕様は [`00_認証と世帯共通.md`](../specs/02_basic-design/01_認証と世帯/00_認証と世帯共通.md#ログイン)。

> **OAuth のクライアント**とは、「このアプリが Google ログインを使ってよい」と Google に登録したもの。クライアント ID（公開してよい値）とクライアントシークレット（秘密の値）の 2 つが発行される。

## 目次

- [1. Google Cloud の設定](#1-google-cloud-の設定)
- [2. .env に値を入れる](#2-env-に値を入れる)
- [3. 動かして確かめる](#3-動かして確かめる)
- [本番を作るとき](#本番を作るとき)

## 1. Google Cloud の設定

[Google Cloud コンソール](https://console.cloud.google.com/) で行う。画面の名前は 2026-09 時点のもの。

1. 画面上部のプロジェクトの選択から「新しいプロジェクト」を作る（名前の例: `kounetsuhi-manager`）。
2. 左のメニューから「Google Auth Platform」を開き、「開始」を押して次を入れる。
   - アプリ名: `光熱費マネージャー`
   - ユーザーサポートメール・デベロッパーの連絡先: 自分のメールアドレス
   - 対象: **外部**
3. 「対象」を開き、公開ステータスが **テスト** のままであることを確かめる。「本番環境にする」は押さない。
4. 同じ「対象」の「テストユーザー」に、ログインさせたい家族の Google アカウント（自分を含む）を足す。ここに無いアカウントは、Google の画面でログインが止まる。
5. 「クライアント」を開き、「クライアントを作成」で次を入れる。
   - アプリケーションの種類: **ウェブ アプリケーション**
   - 名前: `kounetsuhi-manager（開発）` など
   - 承認済みの JavaScript 生成元: `http://localhost:3000`
   - 承認済みのリダイレクト URI: `http://localhost:3000/api/auth/callback/google`
6. 作成すると、クライアント ID とクライアントシークレットが表示される。シークレットは後から全文を見られないことがあるので、表示された画面で控える（チャットやドキュメントには貼らない）。

アプリが Google に求める情報は `openid`・`email`・`profile` だけで、どれも Google の審査が要らない範囲。「データアクセス」の画面でスコープを足す必要はない。

## 2. .env に値を入れる

`.env` は Git に入らないファイル。ここに書いた値はコミットされない。

| 変数 | 入れる値 |
|---|---|
| `BETTER_AUTH_SECRET` | 32 文字以上のランダムな文字列。下のコマンドで作る |
| `BETTER_AUTH_URL` | `http://localhost:3000`（見本のまま） |
| `GOOGLE_CLIENT_ID` | 手順 1-6 のクライアント ID |
| `GOOGLE_CLIENT_SECRET` | 手順 1-6 のクライアントシークレット |

`BETTER_AUTH_SECRET` はログイン状態を守るための値で、次のコマンドで作れる（表示された文字列をそのまま貼る）。

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 3. 動かして確かめる

```bash
docker compose -f docker/docker-compose.yml up -d db
pnpm prisma:migrate
pnpm dev
```

1. http://localhost:3000 を開くと、ログイン画面（`/login`）へ移る。
2. 「Google でログイン」を押し、テストユーザーに登録したアカウントでログインする。
3. 世帯にまだ入っていないので、初回設定の画面（`/setup`）へ移る。

`.env` を書き換えたときは、`pnpm dev` を止めて起動し直す（起動中は読み直されない）。

## 本番を作るとき

本番用に別のクライアントを作るか、同じクライアントに本番の URL（`https://<Vercel のドメイン>` と `https://<Vercel のドメイン>/api/auth/callback/google`）を足す。本番の手順は [`docs/specs/99_infra/`](../specs/99_infra/README.md) にまとめる。
