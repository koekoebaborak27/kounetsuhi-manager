# 04. Vercel へのデプロイ — 8-4 で実施

Next.js アプリを Vercel（Hobby プラン）にデプロイする。**この文書は「1. プロジェクトを作って URL を確定する」だけ手順まで書いてある（8-3 で実施）。** 残りの章は章立てと確認項目まで。画面のボタン名までの手順は、8-4 で実際に操作しながら書き足す。方針は [00](infra_design_00_概要と全体構成.md)、環境変数は [01](infra_design_01_事前準備.md)。

## 前提

- **コードの実装が先に要る:** Cron 用の URL と `CRON_SECRET`、PWA の manifest とアイコン（[00 の 4](infra_design_00_概要と全体構成.md#4-現時点でコードに無いもの本番構築の前に別タスクで実装する)）。これらは別タスクで実装・マージしておく。未実装のままでも画面のデプロイ自体はできるが、Supabase の一時停止を防げない。
- 8-2 の DB とマイグレーションが済んでいること。

## 章立て

1. プロジェクトを作って URL を確定する（8-3 の前に行う）→ [詳しい手順](#1-プロジェクトを作って-url-を確定する8-3-の前に行う)
2. ビルドの設定を確かめる
   - フレームワークが Next.js と検出されること。ビルドコマンドは既定の `pnpm build`（Prisma のコードの生成が要るか、`postinstall` などの有無を確認して書く）
   - Node.js のバージョンが `.nvmrc` と合っていること
   - **ビルドでマイグレーションは実行しない**
3. 関数のリージョンを東京（`hnd1`）にする
4. 環境変数を設定する
   - [01 の 4](infra_design_01_事前準備.md#4-環境変数の対応表) の表のとおり、**Production だけ**に設定する。`DATABASE_SCHEMA`（`kounetsuhi_manager`）も忘れずに設定する。`DATABASE_URL` は Transaction モードの文字列
   - 値の入力は本人が管理画面で行う（チャット・コードに書かない）
   - **入れる前に、Vercel の 2 段階認証を設定する**（1 の 3）。Vercel の GitHub アプリの許可範囲を絞る作業（1 の 4）もここまでに行う
5. デプロイして、ビルドが通ることを確認する
   - `main` への push で自動デプロイされること
   - 接続の確認: Transaction モードのプーラー経由でアプリが DB に届くか。問題が出た場合は Session モードに切り替える判断をここに書く
6. Cron を確認する
   - `vercel.json` の `crons` が 1 日 1 回であること、Vercel の管理画面で Cron が登録されていること
   - `CRON_SECRET` 付きの呼び出しが成功し、無しでは拒否されること
7. Preview デプロイの扱いを確認する
   - Preview には本番の環境変数を入れていないこと。Preview の URL からログインしないこと

## 1. プロジェクトを作って URL を確定する（8-3 の前に行う）

Google の承認済みリダイレクト URI に本番の URL が要るため、環境変数を入れる前に、Vercel のプロジェクトだけを先に作る（2026-09-30 に実施）。画面の名前は 2026-09 時点のもの。

1. [Vercel](https://vercel.com/) に **GitHub アカウントでサインアップ**する。
2. 「Choose a Plan」の画面では、「**I'm working on personal projects（Hobby）**」を選ぶ。既定で選ばれている「commercial projects（Pro）」を選ぶと、有料プランのお試しが始まる。「Team Name」は個人用チームの名前で、URL には関係しない。「**Continue**」を押す。
3. 「Secure Your Account with 2FA」の画面は、いったん「Skip securing my account」で進んでよい。**ただし、環境変数（シークレット）を入れる 4 の前に設定する**（Vercel は本番のシークレットを預かるため）。方法は、Vercel の Settings のセキュリティの画面で認証アプリを登録する。バックアップコードはパスワード管理ツールへ控える。GitHub 側に 2 段階認証があるかも確かめる。
4. 「New Project」の画面（Import Git Repository）で「**GitHub**」を押し、「**Install**」から Vercel の GitHub アプリを入れる。
   - GitHub の画面では「**Only select repositories**」を選び、このリポジトリだけを許可するのが望ましい。全リポジトリを許可した場合は、あとで GitHub の「Settings」→「Applications」→「Installed GitHub Apps」→ Vercel の「Configure」→「Repository access」から絞れる（2026-09-30 は全許可で進めた。絞るのは 8-4 の終わりまでに行う）。
5. リポジトリの一覧から、このリポジトリの「**Import**」を押す。
6. 「Configure Project」の画面で次を確かめ、「**Create Project**」を押す。
   - Vercel Team: 個人の Hobby のチーム
   - **Project Name**: URL になる名前（`https://<プロジェクト名>.vercel.app`）。決めた名前は書かない。あとから変えると URL が変わり、Google 側の登録もやり直しになる。
   - Root Directory は `./`、Application Preset は `Next.js`
   - **Environment Variables は空のまま**
7. 作成後の画面に「recommended integrations」（Supabase など）が出ても**何も追加しない**（DB は別アプリと同居する専用スキーマで、自分で設定する）。最初の「Deploy」は押さなくてよい（押しても、環境変数が無いので失敗してよい）。
8. 左メニューの「**Domains**」（「Environment Variables」の 1 つ下）を開き、`<プロジェクト名>.vercel.app` のドメインが出ていることを確かめる。ここで URL が確定する。Settings の中には Domains が無い。「Add Custom Domain」（独自ドメインの追加）は使わない。

> 補足: 作成直後は「No Deployment」と表示される。`main` に push するとビルドが走り、環境変数が無いうちは失敗する。これは想定どおりなので、失敗の通知は無視してよい。

## 確認項目（完了の条件）

- [ ] 本番のビルドが成功し、`https://<プロジェクト名>.vercel.app` が開く
- [ ] 環境変数が Production だけに設定されている
- [ ] 関数のリージョンが東京になっている
- [ ] Cron が登録され、認証つきで成功する
- [ ] シークレットがコード・ドキュメント・チャットに残っていない

## 戻し方

- 不具合のあるデプロイは、Vercel の Deployments から**直前の正常なデプロイを Production に戻す**（Instant Rollback 相当の操作。実際のボタン名は 8-4 で確認して書く）。
- DB のスキーマが後方互換なら、コードだけ戻して動く（[`prisma_operations.md`](../../prisma_operations.md) の 3-2・3-4）。
