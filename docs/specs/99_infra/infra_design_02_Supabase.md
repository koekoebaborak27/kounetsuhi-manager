# 02. Supabase（本番 DB）— 8-2 で実施（2026-09-30 完了）

本番の PostgreSQL に本アプリ専用の領域を作り、マイグレーションを流す。方針は [00](infra_design_00_概要と全体構成.md)、環境変数は [01](infra_design_01_事前準備.md)。**実際の値（プロジェクト ID・接続文字列・パスワード）はここに書かない。** `<プロジェクトID>` のようなプレースホルダで書く。

## 0. 決めたこと（今回の構成）

| 項目 | 決めたこと | 理由 |
| --- | --- | --- |
| プロジェクト | 新しく作らず、**すでにある別アプリ（food-stock-manager）のプロジェクトへ同居**する。プロジェクト名を `private-app` に変えた | 無料プランは 1 人あたり無料プロジェクト 2 個までで、上限に達していた（下の「プロジェクトを増やせなかったとき」） |
| 分け方 | 本アプリ専用の**スキーマ `kounetsuhi_manager`** を作り、テーブルも `_prisma_migrations` もここに入れる。別アプリは `public` を使うので、お互いに触れない | 同じ DB の中でテーブルが混ざらないようにするため |
| 接続するユーザー | 専用の**ロール `app_kounetsuhi_manager`**（ログイン用のユーザー）を作り、`kounetsuhi_manager` だけを所有させる。`postgres` は使わない | 別アプリのテーブルを誤って触る事故を防ぐため |
| 名前の付け方 | スキーマ名・ロール名は**アンダースコア区切り** | ハイフン入りの名前は SQL で毎回ダブルクォートが要り、書き忘れの元になるため |
| リージョン | 東京（`ap-northeast-1`）。既存のプロジェクトがすでに東京だった | 00 の方針どおり |
| 組織 | 既存の組織（無料プラン） | — |
| 別アプリのスキーマ | **今回は触らない**（`public` のまま）。別スキーマへの移行は別途、そのアプリ側で計画する | 動いている別アプリの変更は、本作業と切り離すため |

## 1. プロジェクトの用意

### プロジェクトを増やせなかったとき（今回の経緯）

**New project** を押した作成画面に「The organization has members who have exceeded their free project limits」と出て、**Create new project** が押せなかった。無料プランは無料プロジェクトを 2 個までしか持てないため。選べる対処は次のとおり。

| 対処 | 内容 |
| --- | --- |
| 使っていないプロジェクトを **Pause project**（一時停止）する | 停止したプロジェクトは上限に数えられない。1 年以内なら再開できる |
| 別の Google アカウントで Supabase に登録する | 上限は「ログインした人ごと」 |
| 既存のプロジェクトに、専用スキーマを作って同居する（**今回の選択**） | 無料のまま、設計をほぼ変えずに済む。ただし別アプリと DB のパスワード・一時停止・障害が共通になる |
| Pro プラン | 有料 |

削除（Delete project）は元に戻せないので、この手順書では選ばない。

### 1-1. プロジェクトの名前を変える

1. 画面左メニュー最下部の歯車 **Project Settings** → **General** を開く。
2. **General settings** の **Project name** に `private-app` を入れ、**Save changes** を押す。
3. 画面上部のパンくずの表示が変わったことを確かめる。

名前を変えても、プロジェクト ID・接続文字列は変わらない（別アプリの動作に影響しない）。**入力欄が編集できないときは、ブラウザを再読み込み**し、画面下の読み込み表示（灰色の帯）が消えるのを待つ。

## 2. 専用のロールとスキーマを作る

**初期設定として、管理画面の SQL Editor で SQL を実行する。** 「本番へ `psql` などで直接変更しない」という規約は、テーブルの中身・構造を変えることについての決まりで、ここで作るのは入れ物（ロールとスキーマ）だけ。テーブルは 3 でマイグレーションだけが作る。

対象は、別アプリの本番 DB でもある。実行前に、画面上部のパンくずが `private-app` であることを必ず確かめる。

### 2-1. パスワードを作る

`app_kounetsuhi_manager` 用のパスワードを、パスワード管理ツールか次の PowerShell で作って保管する。**英数字だけ・32 文字**にする（記号があると接続文字列で変換が要り、失敗の元になる）。画面には表示せず、クリップボードにだけ入れる。

```powershell
$chars = [char[]]'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$pw = -join (1..32 | ForEach-Object { $b = [byte[]]::new(1); do { $rng.GetBytes($b) } while ($b[0] -ge 248); $chars[$b[0] % 62] })
Set-Clipboard -Value $pw; $pw = $null
```

パスワード管理ツールへ貼り付けたら、すぐにクリップボードを空にする（Windows のクリップボード履歴 Win + V も削除する）。

```powershell
Set-Clipboard -Value " "
```

### 2-2. SQL を実行する

1. 左メニューの **SQL Editor** を開き、新しいクエリ（**+**）を作る。
2. 次の SQL を貼り、`<パスワード>` だけを 2-1 の値に書き換える（両側の `'` は残す）。
3. **Run**（Ctrl + Enter）を押し、`Success. No rows returned` を確かめる。確認画面が出たら、SQL が下のとおりであることを確かめてから承認する。

```sql
-- 本アプリ専用のログインロールを作る。
CREATE ROLE app_kounetsuhi_manager WITH LOGIN PASSWORD '<パスワード>';

-- postgres がこのロールを扱えるようにする（すでに扱える場合は通知が出るだけ）。
GRANT app_kounetsuhi_manager TO postgres;

-- 本アプリ専用のスキーマを作り、所有者をこのロールにする。
CREATE SCHEMA kounetsuhi_manager AUTHORIZATION app_kounetsuhi_manager;

-- このロールで接続したとき、テーブルを探す場所を kounetsuhi_manager に固定する。
ALTER ROLE app_kounetsuhi_manager SET search_path = kounetsuhi_manager;
```

### 2-3. パスワード入りの SQL を残さない

SQL Editor は実行した SQL を保存する。実行後すぐ、左の一覧（**PRIVATE**）でそのクエリにマウスを載せ、右端の **…** → **Delete query** で削除する。

### 2-4. 作れたか確かめる

パスワードを含まない新しいクエリで、1 つずつ実行する。

```sql
SELECT schema_name, schema_owner FROM information_schema.schemata WHERE schema_name = 'kounetsuhi_manager';
```

```sql
SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'app_kounetsuhi_manager';
```

1 つ目でスキーマとロールの 1 行が出て、2 つ目の `rolconfig` に `search_path=kounetsuhi_manager` が入っていれば成功。

### パスワードを設定し直すとき

接続で「Authentication failed」（P1000）が出たら、まずユーザー名の形（3-2 の表）を確かめる。それでも直らなければ、パスワードを作り直して設定し直す。

```sql
ALTER ROLE app_kounetsuhi_manager WITH PASSWORD '<新パスワード>';
```

実行後は 2-3 と同じくクエリを削除し、パスワード管理ツールの接続文字列（Session・Transaction の両方）のパスワードも直す。

## 3. 接続文字列を控える

保管先はパスワード管理ツールだけ。ファイル・チャット・履歴に残さない。**対象は新しいロール `app_kounetsuhi_manager`**（`postgres` の文字列をそのまま使わない）。

### 3-1. 元になる文字列を取る

1. 画面上部の **Connect** ボタンを押す。
2. 接続方法の **Session pooler**（ポート 5432）を選び、接続文字列を **Copy** する。
3. チャットやエディタに貼らず、パスワード管理ツールの新しい項目に貼る。

### 3-2. パスワード管理ツールの中で書き換える

| 場所 | 書き換え後 |
| --- | --- |
| ユーザー名（`postgres.` の部分） | `app_kounetsuhi_manager.<プロジェクトID>`（接続プーラーは `<ロール名>.<プロジェクトID>` の形のユーザー名を求める。ロール名だけでは認証に失敗する） |
| `[YOUR-PASSWORD]` | 2-1 のパスワード |
| 末尾 | `?schema=kounetsuhi_manager` を付ける（すでに `?` があれば `&schema=kounetsuhi_manager`） |

```text
postgresql://app_kounetsuhi_manager.<プロジェクトID>:<パスワード>@<プーラーのホスト>:5432/postgres?schema=kounetsuhi_manager
```

### 3-3. Transaction モード（6543）も控える

**Connect** で **Transaction pooler** を選び、同じように別の項目へ控えてユーザー名・パスワードを書き換える。こちらは Vercel に設定する値（8-4 で使う）。**`?schema=` は付けない。** アプリ側のスキーマ指定は、コードで行う（下の「アプリ側の宿題」）。

## 4. マイグレーションを流す

**対象は本番。** 実行前に、次の 5 点を確かめる。

1. 対象が `private-app` の専用スキーマ `kounetsuhi_manager` で、`public`（別アプリ）には触れない。
2. 1〜3 が済んでいる。
3. 流すマイグレーションの数を確かめた（`prisma/migrations` の中のフォルダ数。`migration_lock.toml` は数えない。今回は 3 件）。作業ツリーは `main` で変更なし。
4. 使う接続文字列は、Session（5432）で、末尾に `?schema=kounetsuhi_manager` が付いている。
5. 使うコマンドは `pnpm exec prisma migrate deploy` だけ。

### 4-1. 手元のシェルにだけ接続文字列を設定する

PowerShell を開き、履歴と画面に残らない入力方法で設定する。

```powershell
$s = Read-Host "Session の接続文字列" -AsSecureString
$env:DATABASE_URL = [System.Net.NetworkCredential]::new("", $s).Password
```

パスワードを表示せずに、接続先の向きを確かめる。

```powershell
$u = [uri]$env:DATABASE_URL; "$($u.Port) $($u.Query)"
```

`5432 ?schema=kounetsuhi_manager` と出れば正しい。違うときは実行しない。ユーザー名の形は次で確かめる（`True` なら正しい）。

```powershell
$u.UserInfo.Split(':')[0] -match '^app_kounetsuhi_manager\.[A-Za-z0-9]+$'
```

プロジェクトの `.env`（開発用 DB）にも `DATABASE_URL` があるが、シェルに設定済みの値が優先されるため、本番に向く。

### 4-2. 実行する

```powershell
cd <リポジトリのフォルダ>
pnpm exec prisma migrate deploy
```

`3 migrations found in prisma/migrations` と `All migrations have been successfully applied.` を確かめる。「Update available」の案内は無視してよい。実行が途中で失敗したときは [00 の 6](infra_design_00_概要と全体構成.md#6-マイグレーションの流し方の方針) に従う。認証に失敗したときは、DB は何も変わっていない。

### 4-3. シェルの変数を消す

```powershell
Remove-Item Env:DATABASE_URL; $s = $null; $u = $null
```

`$env:DATABASE_URL` を実行して何も表示されなければ消えている。

## 5. テーブルができたことを確かめる

1. 左メニューの **Table Editor** を開く。
2. 左上の **schema** のドロップダウンで `kounetsuhi_manager` を選ぶ。
3. アプリのテーブルと `_prisma_migrations` が並んでいることを確かめる。
4. `_prisma_migrations` を開き、**行数が `prisma/migrations` のマイグレーション数（3）と一致**することを確かめる。
5. ドロップダウンを `public` に切り替え、別アプリのテーブルが以前と変わらないことを確かめる。

## 6. 無料プランの一時停止（2026-09-30 に公式ページで確認）

出典: [Supabase 公式「Project Pausing」](https://supabase.com/docs/guides/platform/free-project-pausing)

- **条件**: 無料プランのプロジェクトは、**1 週間（7 日間）ほとんど DB へのアクセスがない**と一時停止される。1 日に数回のアクセスがあれば止まらない。
- **通知**: 停止の約 1 週間前に警告メールが届き、停止後にも確認メールが届く。警告のあとで管理画面を開くか、アクセスがあれば止まらない。
- **再開**: 管理画面で組織 → 停止したプロジェクトを選び、**Resume project** を押す。**停止から 1 年以内**なら、データも設定も元の状態で戻る。再開後は、状態が Active になるまで数分かかることがある。
- **対策**: Vercel Cron が 1 日 1 回、アプリの `/api/cron/keepalive` から `SELECT 1` を送る（実装済み。動作の確認は 8-4）。
- **同居の注意**: このプロジェクトは別アプリと共有なので、**別アプリへのアクセスでも止まらない**。逆に、Cron が動かなくなっても別アプリが使われていれば止まらない。ただし、両方が使われなくなると、両方とも止まる。
- 無料プランの数値は変わりうるため、作業のたびに公式ページで再確認する。

## 確認項目（完了の条件）

- [x] リージョンが東京になっている（既存のプロジェクトが東京）
- [x] `migrate deploy` が成功し、`prisma/migrations` の件数（3）と `_prisma_migrations` の行数（3）が一致した
- [x] 接続文字列とパスワードがコード・ドキュメント・チャットに残っていない（パスワード入りの SQL は削除、シェルの変数は削除済み）
- [x] `psql` などで本番のテーブルを直接書き換えていない（テーブルを作ったのは migration だけ。SQL Editor で実行したのはロールとスキーマの作成、`ALTER ROLE`、確認用の `SELECT` のみ）

## アプリ側の宿題（8-4 の前に別 PR で行う）

アプリの接続（`src/shared/db/client.ts`、`@prisma/adapter-pg` 経由）は、接続文字列の `?schema=` を**読まない**（`prisma migrate deploy` は読む）。そこで環境変数 `DATABASE_SCHEMA` を `new PrismaPg(..., { schema })` へ渡すようにした（8-C で実装済み）。本番（Vercel の Production）だけ `kounetsuhi_manager` を設定し、開発は未設定（空）で `public` を使う。**設定を忘れると、アプリは `public`（別アプリのテーブルがある側）を見に行き、テーブルが見つからずエラーになる**（別アプリのテーブルを書き換えることは、専用ロールに権限が無いためできない）。実際に本番の DB から読めるかは 8-4・8-5 で確かめる。

## 注意

- 本番に対して `migrate dev` / `migrate reset` / `db push` / seed は実行しない（[`prisma_operations.md`](../../prisma_operations.md) の 3-3）。
- アプリは Supabase の認証・Storage・API を使わない。DB だけを使う。専用スキーマは、公開 API（Data API）の対象にもならない。
- 失敗したときの戻し方は [00 の 6](infra_design_00_概要と全体構成.md#6-マイグレーションの流し方の方針)。
