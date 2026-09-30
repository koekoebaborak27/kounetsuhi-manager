# 04. Vercel へのデプロイ — 8-3・8-4 で実施（2026-09-30 完了）

Next.js アプリを Vercel（Hobby プラン）にデプロイする。**1 は 8-3、2〜7 は 8-4（2026-09-30）で実際に操作しながら書いた手順。** 画面の名前はその時点のもの。方針は [00](infra_design_00_概要と全体構成.md)、環境変数は [01](infra_design_01_事前準備.md)。

## 前提

- **コードの実装が先に要る:** Cron 用の URL と `CRON_SECRET`、PWA の manifest とアイコン、専用スキーマ `DATABASE_SCHEMA` の受け渡し（[00 の 4](infra_design_00_概要と全体構成.md#4-現時点でコードに無いもの本番構築の前に別タスクで実装する)）。8-A・8-B・8-C で実装・マージ済み。
- 8-2 の DB とマイグレーションが済んでいること。

## 章立て

1. [プロジェクトを作って URL を確定する](#1-プロジェクトを作って-url-を確定する8-3-の前に行う)（8-3 で実施）
2. [ビルドの設定を確かめる](#2-ビルドの設定を確かめる2026-09-30-に実施)
3. [関数のリージョンを東京にする](#3-関数のリージョンを東京にする2026-09-30-に実施)
4. [環境変数を設定する](#4-環境変数を設定する2026-09-30-に実施)
5. [デプロイして、ビルドが通ることを確認する](#5-デプロイしてビルドが通ることを確認する2026-09-30-に実施)
6. [Cron を確認する](#6-cron-を確認する2026-09-30-に実施)
7. [Preview デプロイの扱いを確認する](#7-preview-デプロイの扱いを確認する2026-09-30-に実施)

## 1. プロジェクトを作って URL を確定する（8-3 の前に行う）

Google の承認済みリダイレクト URI に本番の URL が要るため、環境変数を入れる前に、Vercel のプロジェクトだけを先に作る（2026-09-30 に実施）。画面の名前は 2026-09 時点のもの。

1. [Vercel](https://vercel.com/) に **GitHub アカウントでサインアップ**する。
2. 「Choose a Plan」の画面では、「**I'm working on personal projects（Hobby）**」を選ぶ。既定で選ばれている「commercial projects（Pro）」を選ぶと、有料プランのお試しが始まる。「Team Name」は個人用チームの名前で、URL には関係しない。「**Continue**」を押す。
3. 「Secure Your Account with 2FA」の画面は「Skip securing my account」で進む。**Vercel 側の 2 段階認証は設定しない。** 理由: Vercel には GitHub アカウントでログインしており、ログインの入口である GitHub 側で 2 段階認証を有効にして保護しているため（GitHub 側が有効であることは確認済み）。GitHub 側の 2 段階認証を外したら、この判断は成り立たないので、Vercel 側の設定を見直す。
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

## 2. ビルドの設定を確かめる（2026-09-30 に実施）

Vercel の Settings →「Build and Deployment」で設定する。

- **調べたこと:** `pnpm build` の中身は `next build` だけで、`postinstall` も無い。Prisma のコードの生成先 `src/shared/db/generated/` は gitignore 済みのため、Vercel の環境には無く、そのままだとビルドが「モジュールが見つからない」で失敗する（CI は別途 `pnpm prisma:generate` を実行している）。
- **対応（案 A: 管理画面で上書き）:** 「Framework Settings」の **Build Command** の「**Override**」をオンにし、`pnpm prisma:generate && pnpm build` を入力して「**Save**」を押す。Install Command・Output Directory は上書きしない。
  - 案 B（`package.json` に `"postinstall": "prisma generate"` を足す）は、コードの変更（PR）が要るため見送った。設定がリポジトリの外にあるので、Vercel のプロジェクトを作り直したときはこの上書きをやり直す。
  - `prisma generate` は `prisma.config.ts` の `env("DATABASE_URL")` を読むため、`DATABASE_URL` が無い環境（環境変数を入れていない Preview）ではビルドが失敗する。
- **Framework Preset:** 「Next.js」と自動検出されていた（変更なし）。
- **Node.js Version:** 「**22.x**」に設定して「Save」（`.nvmrc` は 22）。Vercel は `.nvmrc` を読まない。`package.json` の `engines` は `>=22.12.0` で、そのままだと 24 系が選ばれる恐れがあるため、画面で固定する。
- **Root Directory:** `./`（変更なし）。
- **マイグレーション:** ビルドでは実行しない（`db:migrate` 等の記述は無い）。DB の変更は [`prisma_operations.md`](../../prisma_operations.md) の手順で別に行う。

## 3. 関数のリージョンを東京にする（2026-09-30 に実施）

コード（`vercel.json`）は変えず、管理画面で設定する。

1. Settings の左メニュー「**Functions**」を開く。
2. 「**Function Region**」の選択欄で「**Tokyo, Japan (hnd1)**」を選ぶ。
3. **もとから選ばれているワシントン D.C.（`iad1`）のチェックは外す。** Hobby は 1 リージョンまでで、2 つ選んだままだと「Regions for Hobby projects are limited to 1. Upgrade to Pro.」と出て「Save」が押せない（Pro にする必要は無い）。
4. 「**Save**」を押す。「Updated Function Regions successfully. A new deployment is needed for changes to take effect.」と出る。
5. **反映は次のデプロイから**。5 のデプロイで効く。

## 4. 環境変数を設定する（2026-09-30 に実施）

名前と意味は [01 の 4](infra_design_01_事前準備.md#4-環境変数の対応表) の表のとおり。**Production だけ**に、1 つずつ設定する。値の入力と生成は本人が行い、チャット・コード・ドキュメントには書かない。

### 4-1. 秘密の値を作る（`BETTER_AUTH_SECRET` と `CRON_SECRET`。別々の値にする）

自分の PowerShell で次を実行すると、値が画面に出ず、クリップボードに入る。実行した直後に Vercel の Value 欄へ貼り付ける。2 つ目を作るときはもう一度実行する（上書きされる）。開発用 `.env` の値は使い回さない。

```powershell
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" | Set-Clipboard
```

`CRON_SECRET` は 6 の動作確認で自分の端末から使う。Secret は保存後に画面で見られないため、パスワード管理ツールへ控えておくか、6 で作り直して入れ直す（再デプロイが要る）。

### 4-2. 追加のしかた（1 変数ごとに繰り返す）

Settings の「**Environment Variables**」で追加の画面（**Add Environment Variable**）を開く。左メニューの「Environments」は別の機能なので使わない。

| 項目 | 意味 | 設定 |
| --- | --- | --- |
| **Type** | 保存後に値を見られるかの種類 | 秘密の変数は **Secret**（保存後は値を見られない）、そうでなければ **Config**（見られる）。下の表のとおり |
| **Key** | 変数の名前 | 下の表の名前。綴りを確かめる |
| **Value** | 値 | 目のアイコンで、前後に空白・改行が入っていないか確かめる |
| **Note (Optional)** | メモ | 空でよい |
| **Add new variable** | 同じ画面に入力欄を増やす | 使わない（1 つずつ保存する） |
| **Environments** | 反映する環境 | **Production のみ**（Preview・Development のチェックは外す） |
| **Import .env** | `.env` の一括取り込み | 使わない（開発用の値が入っているため） |
| **Save** | 保存 | 内容を確かめてから押す |

追加のたびに「Redeploy」の案内が出ても、全部入れ終わるまで押さない（5 で行う）。

### 4-3. 追加する 7 つ

| Key | Type | Value |
| --- | --- | --- |
| `DATABASE_SCHEMA` | Config | `kounetsuhi_manager` |
| `BETTER_AUTH_URL` | Config | `https://<プロジェクト名>.vercel.app`（末尾に `/` を付けない）。Google に伝える戻り先 URL の元になり、Google に登録したリダイレクト URI と一字一句合わせる必要がある |
| `GOOGLE_CLIENT_ID` | Config | 開発用 OAuth クライアントの ID |
| `GOOGLE_CLIENT_SECRET` | Secret | 同じクライアントのシークレット |
| `BETTER_AUTH_SECRET` | Secret | 4-1 で作った 1 つ目の値 |
| `CRON_SECRET` | Secret | 4-1 で作った 2 つ目の値 |
| `DATABASE_URL` | Secret | [02 の 3-3](infra_design_02_Supabase.md) の **Transaction モード**（ポート 6543）の接続文字列。ユーザーは専用ロール `app_kounetsuhi_manager.<プロジェクトID>`、`?schema=` は付けない |

`DATABASE_URL` を入れる前に、控えた文字列が「`postgres.` ではなく専用ロールで始まる」「ポートが 6543」「`?schema=` が無い」「`[YOUR-PASSWORD]` が残っていない」ことを確かめる。

### Session モードと Transaction モードの使い分け

Vercel の関数は短命な処理が同時に多数動くため、使い終わった接続をすぐ返す **Transaction モード（6543）** をアプリの `DATABASE_URL` にする。マイグレーション（DB の構造を変える処理）は接続ごとの状態を使うので **Session モード（5432）** で、手元のシェルから一時的に行う（Vercel には入れない）。

## 5. デプロイして、ビルドが通ることを確認する（2026-09-30 に実施）

環境変数を入れたあとに再デプロイする（変更は、それ以前のデプロイには効かない）。

1. 上部のタブ「**Deployments**」を開き、いちばん上のデプロイをクリックする。
2. 「**Source**」のコミットが最新の `main` であることを確かめる（古ければ、`main` に push して自動デプロイさせる）。
3. 右上の「**Redeploy**」（または「⋯」→「Redeploy」）を押す。
4. ダイアログの「**Use existing Build Cache**」にチェックが付いていれば外し、「**Redeploy**」を押す。
5. 「Building」から「**Ready**」になるまで待つ。「**Visit**」で本番の画面が開くことを確かめる。
6. 失敗したら「**Build Logs**」の赤いエラー行の前後を見る（パスワードや接続文字列が写っていないか確かめてから共有する）。

結果: Ready になり、画面が開いた。関数のリージョン（東京）はこのデプロイから効く。

**DB への接続:** アプリから DB に届くかは、6 の Cron 用 URL が DB へ問い合わせを送る作りなのを使って確かめた（認証つきで `{"ok":true}` と 200 が返れば、Transaction モードのプーラー経由で届いている）。今回は Transaction モードのままで問題は出なかったため、Session モードへの切り替えは不要。問題が出たら（接続エラー、プリペアドステートメント関連のエラーなど）、`DATABASE_URL` を Session モード（5432）の文字列に差し替えて再デプロイする。

> 補足: `main` への push で自動デプロイされる（Git 連携済みの Production Branch は `main`）。

## 6. Cron を確認する（2026-09-30 に実施）

1. **登録:** `vercel.json` の `crons` は `"0 18 * * *"`（毎日 1 回、UTC 18:00＝日本時間の翌 3:00）の 1 件だけ。Settings の「**Cron Jobs**」に、パス `/api/cron/keepalive` とスケジュールが登録されていることを確かめた。
2. **認証なしは拒否される:** 自分の PowerShell で次を実行し、`401` が返ること。

   ```powershell
   curl.exe -s -o NUL -w "%{http_code}`n" https://<プロジェクト名>.vercel.app/api/cron/keepalive
   ```

3. **認証つきは成功する:** `CRON_SECRET` の値を画面に出さないよう、パスワード管理ツールからコピー → クリップボードから一時変数へ入れて呼ぶ。`{"ok":true}` と `200` が返ること。終わったら変数を消し、クリップボード履歴（Win + V）から値を削除する。

   ```powershell
   $env:CRON_SECRET = (Get-Clipboard)
   curl.exe -s -w "`n%{http_code}`n" -H "Authorization: Bearer $env:CRON_SECRET" https://<プロジェクト名>.vercel.app/api/cron/keepalive
   Remove-Item Env:CRON_SECRET
   ```

   `401` なら値が合っていない、`500` なら本文の `error` を見る。

## 7. Preview デプロイの扱いを確認する（2026-09-30 に実施）

`main` 以外のブランチや PR の push で作られる Preview デプロイには、本番の環境変数もシークレットも渡さない。

1. **環境変数:** Settings →「**Environment Variables**」で、環境の絞り込みを「**Preview**」にして、**0 件**であること（4 で Production だけに設定したため）。
2. **Deployment Protection:** Settings →「**Deployment Protection**」を開き、「**Vercel Authentication**」が**オン**であることを確かめた（Preview の URL は Vercel にログインした本人だけが開ける）。設定は変えない。
3. **運用:** Preview の URL からはログインしない。Preview には `DATABASE_URL` が無いため、ビルドの `prisma generate` が失敗して Preview のビルドは「Error」になる。**想定どおりなので、PR のコミットステータスの Vercel 欄が赤くても無視してよい**（CI の結果で判断する）。

## 確認項目（完了の条件）

- [x] 本番のビルドが成功し、`https://<プロジェクト名>.vercel.app` が開く
- [x] 環境変数が Production だけに設定されている
- [x] 関数のリージョンが東京になっている
- [x] Cron が登録され、認証つきで成功する
- [x] シークレットがコード・ドキュメント・チャットに残っていない

## 戻し方

- 不具合のあるデプロイは、**Instant Rollback** で直前の正常なデプロイに戻す。プロジェクトの概要ページの「Production Deployment」の枠で「**Instant Rollback**」→ 戻り先を選んで「**Continue**」→ 内容を確かめて「**Confirm Rollback**」。または「Deployments」で対象の行の「⋮」→「Instant Rollback」。Hobby で戻せるのは**直前のデプロイだけ**。
- 戻したあとは、`main` への push で自動で本番に出る動きが止まる。直したコードを出すときは、概要ページの「**Undo Rollback**」を押し、出したいデプロイを選んで「**Confirm**」で確定する。
- 戻しても環境変数は戻らない（今の値のまま）。Cron は戻り先のデプロイの状態になる。
- DB のスキーマが後方互換なら、コードだけ戻して動く（[`prisma_operations.md`](../../prisma_operations.md) の 3-2・3-4）。
