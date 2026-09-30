# 01. 事前準備と環境変数の対応表

本番構築（02〜05）を始める前に用意するものと、必要な環境変数の一覧。値は書かない。

## 1. 必要なアカウントと権限

| もの | 用途 | 権限・備考 |
| --- | --- | --- |
| Supabase のアカウント | 本番 DB の作成 | 無料プランで作る。組織（Organization）は個人用でよい |
| Vercel のアカウント | アプリのデプロイ | Hobby プラン。GitHub アカウントでの登録が簡単。リポジトリの読み取りを許可する |
| Google アカウント（Google Cloud） | OAuth クライアントの作成 | 既存の開発用プロジェクトを使うか、本番用に別のプロジェクトを作るかは 8-3 で決める（[`Googleログインの準備.md`](../../development/Googleログインの準備.md) の「本番を作るとき」） |
| GitHub のアカウント | リポジトリ（`koekoebaborak27/kounetsuhi-manager`） | Vercel にリポジトリを連携できる権限（リポジトリの所有者であること） |
| 家族の Google アカウント | テストユーザーとして登録する | メールアドレスを事前に集めておく（人数は 100 人まで） |

## 2. 必要なツール（手元の PC）

| ツール | 用途 | 確認方法 |
| --- | --- | --- |
| Node.js（`.nvmrc` のバージョン）・pnpm | `prisma migrate deploy` の実行 | `node -v` / `pnpm -v` |
| このリポジトリの clone と `pnpm install` | マイグレーションのファイルと Prisma CLI | `pnpm exec prisma -v` |
| ブラウザ（PC と Android の Chrome） | 各サービスの管理画面、動作確認、PWA の確認 | — |

Vercel CLI・Supabase CLI は使わない（管理画面と Git 連携だけで足りる）。

## 3. 事前に決めておくもの

| 項目 | 決め方 |
| --- | --- |
| Vercel のプロジェクト名 | 既定の URL が `https://<プロジェクト名>.vercel.app` になる。8-4 の最初に決める |
| Supabase のプロジェクト名・DB のパスワード | パスワードはパスワード管理ツールで自動生成して保管する。**チャット・コード・ドキュメントに書かない** |
| `BETTER_AUTH_SECRET` | 32 文字以上のランダムな文字列。手元で生成し、Vercel の環境変数にだけ入れる |
| `CRON_SECRET` | 16 文字以上のランダムな文字列。同上（Cron 用の URL の実装後） |

## 4. 環境変数の対応表

**本番で必要なものだけ**を載せる。「どのサービスに設定するか」は、値を入れる場所。値そのものはどこにも書かない。

| 名前 | 何に使うか | 開発 | 本番 | 設定する場所 |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | DB への接続文字列 | 手元の Docker の PostgreSQL（`.env`） | Supabase の接続プーラー（**Transaction モード**、ポート 6543）の文字列。ユーザーは専用ロール `app_kounetsuhi_manager.<プロジェクトID>`（[02](infra_design_02_Supabase.md)） | Vercel（Production） |
| `DATABASE_URL`（マイグレーション用） | `prisma migrate deploy` が読む接続先 | — | Supabase の接続プーラー（**Session モード**、ポート 5432）の文字列。専用ロールで、末尾に `?schema=kounetsuhi_manager` | 手元のシェルだけ（一時的に設定し、終わったら消す。Vercel には入れない） |
| `DATABASE_SCHEMA` | アプリが使う DB のスキーマ名。接続文字列の `?schema=` はアプリの接続では読まれないため、別に渡す（実装済み: 8-C） | 未設定（空）。`public` を使う | `kounetsuhi_manager`（[02](infra_design_02_Supabase.md)） | Vercel（Production） |
| `BETTER_AUTH_SECRET` | ログイン状態を守る秘密の値 | `.env` に自分で生成した値 | 本番用に**別の**値を生成 | Vercel（Production） |
| `BETTER_AUTH_URL` | アプリの URL。Google から戻ってくる先の URL を作るのに使う | `http://localhost:3000` | `https://<プロジェクト名>.vercel.app` | Vercel（Production） |
| `GOOGLE_CLIENT_ID` | Google の OAuth クライアントの ID | 開発用クライアントの値 | 本番用（または本番の URL を足したクライアント）の値 | Vercel（Production） |
| `GOOGLE_CLIENT_SECRET` | 同上のシークレット | 同上 | 同上 | Vercel（Production） |
| `CRON_SECRET` | Vercel Cron が Cron 用の URL を呼ぶときに付ける秘密の値。アプリはこれを確かめ、それ以外からの呼び出しを拒否する | 不要（開発では Cron を動かさない） | 本番用に生成した値 | Vercel（Production）。Cron 用の URL は実装済み（8-A）。未設定だと呼び出しは常に拒否される（[00 の 4](infra_design_00_概要と全体構成.md#4-現時点でコードに無いもの本番構築の前に別タスクで実装する)） |

補足:

- `.env.example` にある `E2E_BASE_URL`・`E2E_USER_ID`・`E2E_USER_PASSWORD` は画面操作テスト（Playwright）用の開発専用。**本番には設定しない。**
- Vercel の環境変数は、追加するときの「Environments」の選択で **Production のみ**にチェックを入れる（Preview・Development には入れない）。
- 環境変数を変えたあと、反映するには再デプロイが必要。
- 8-4 で、ビルドが通るために必要な環境変数がほかに無いかを確かめ、あればこの表へ追記する。
