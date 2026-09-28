# TODO

光熱費マネージャーの**残タスクと現在地**。

**このファイルには「いま何が残っているか」だけを書く。** 設計・手順・経緯は下表の担当ファイルへ書き、ここからはリンクするだけにする。同じ内容を 2 か所に置かない。**150 行を超えたら、抱え込んでいる内容を担当ファイルへ移す。**

| 書きたいこと | 書く場所 |
| --- | --- |
| **残タスク・進捗・次の一手** | **このファイル** |
| 要件・設計・仕様の決定 | [`docs/specs/`](../specs/README.md) |
| 本番構築の手順・本番構成・環境変数 | [`docs/specs/99_infra/`](../specs/99_infra/README.md) |
| 設定値・落とし穴・実測値 | [`docs/todo/notes/`](notes/README.md) |
| 何をやったか・なぜ・どこで詰まったか | [`docs/todo/history/`](history/README.md)（古い順。新しい記録は末尾へ） |
| 開発フロー | [`docs/development/gitの操作ルール.md`](../development/gitの操作ルール.md) |
| 初めて触る人が必要とする情報 | [`README.md`](../../README.md) |

このファイルの更新手順は [`docs/skills/update-todo.md`](../skills/update-todo.md)（`/update-todo` の正本）。

## 進捗サマリ

**進捗を書くのはこの表だけ。** 他の節に「N / M 完了」を重ねて書かない。

| 区分 | 進捗 |
| --- | --- |
| 開発工程（次にやること 1〜7） | 4 / 7 |

## 次にやること

**次のセッションが最初に打つコマンドまで具体的に書く。**

```powershell
git log --oneline -1     # 現在のコミット
git status --porcelain   # 未コミット差分がないか確認
```

- [x] **1. 要件定義**（2026-09-25）→ [`docs/specs/01_requirements/`](../specs/01_requirements/README.md)・[履歴](history/2026-09.md#2026-09-25-要件の壁打ちと要件定義書の作成)
- [x] **2. 画面イメージ検討**（2026-09-25。AIがHTMLで主要画面のひな形を作ってレイアウトをすり合わせた。画像による作り込みは行わず、ひな形のデザインで確定し、[`DESIGN.md`](../../DESIGN.md) を刷新）→ [`docs/mockups/画面イメージ.html`](../mockups/画面イメージ.html)・[履歴](history/2026-09.md#2026-09-25-画面イメージのhtmlひな形でレイアウトをすり合わせ)
  - [x] HTMLひな形でのすり合わせ完了（2026-09-25）
  - [x] 画像による作り込みは行わず、ひな形のデザインで確定（2026-09-25）
  - [x] [`DESIGN.md`](../../DESIGN.md) を画面イメージに合わせて刷新（2026-09-25）→ [履歴](history/2026-09.md#2026-09-25-テンプレート由来の文書をプロジェクト用に整備)
- [x] **3. 基本設計**（2026-09-25）→ [`docs/specs/02_basic-design/`](../specs/02_basic-design/README.md)・[履歴](history/2026-09.md#2026-09-25-基本設計書の作成)
- [x] **4. 詳細設計**（2026-09-28。不要と判断し、詳細設計書は作らない）→ [履歴](history/2026-09.md#2026-09-28-詳細設計を不要と判断)
- [ ] 5. 実装・単体ロジックテスト（1機能ずつ実装する。→ [`create-vitest-test`](../skills/create-vitest-test.md)）
  - [x] 5-1. Next.js を導入し、ローカルでの起動方法を [`AGENTS.md`](../../AGENTS.md)・[`README.md`](../../README.md) に書く（2026-09-28）→ [履歴](history/2026-09.md#2026-09-28-nextjsを導入して仮のトップページを表示)
  - [ ] 5-2. Prisma を導入する（`.env.example` から `.env` を作り、各機能の `01_データベース.md` からスキーマを書いて、開発用 DB に最初のマイグレーションを流す）→ [`prisma/AGENTS.md`](../../prisma/AGENTS.md)
  - [ ] 5-3. `src/shared/`（`AppError`・処理の入口を包む仕組み）を作る → [`src/AGENTS.md`](../../src/AGENTS.md)
  - [ ] 5-4. 認証と世帯（Better Auth による Google ログイン）→ [`01_認証と世帯`](../specs/02_basic-design/01_認証と世帯/README.md)
  - [ ] 5-5. 契約 → [`02_契約`](../specs/02_basic-design/02_契約/README.md)
  - [ ] 5-6. 検針票の記録 → [`03_検針票の記録`](../specs/02_basic-design/03_検針票の記録/README.md)
  - [ ] 5-7. ホーム → [`04_ホーム`](../specs/02_basic-design/04_ホーム/README.md)
  - [ ] 5-8. グラフ → [`05_グラフ`](../specs/02_basic-design/05_グラフ/README.md)
- [ ] 6. 画面テスト（必要かどうかを判断する。必要な場合は [`create-unit-test-spec`](../skills/create-unit-test-spec.md) でテスト仕様書を作成したうえで [`playwright-evidence-test`](../skills/playwright-evidence-test.md) を行う）
- [ ] 7. ユーザテスト（必要かどうかを判断する）

## 残っているタスク

いずれも**期限のない宿題**。判断材料は各リンク先にまとめる。

- （なし）

## 現在の状態

事実のみ。予定・経緯・仕様は書かない。

| 項目 | 状態 |
| --- | --- |
| 作業ブランチ | `feature/setup-nextjs`（5-1。未コミット・PR 未作成）。既定は `main`（[koekoebaborak27/kounetsuhi-manager](https://github.com/koekoebaborak27/kounetsuhi-manager)、public。ブランチ保護なし）。確認は `git log --oneline -1` |
| ローカル環境 | 開発用 DB（Docker の PostgreSQL 17）と Next.js 16（仮のトップページ 1 枚）。DB の起動は `docker compose -f docker/docker-compose.yml up -d db`、アプリの起動は `pnpm dev`。Prisma・Better Auth・`src/shared/` は未導入 |
| 本番 | 未構築 |

## 完了済みの作業

各区分の実施内容・判断・詰まった点は [`docs/todo/history/`](history/README.md) にセッション単位で残す。

| 区分 | 件数 | 記録 |
| --- | --- | --- |
| （なし） | 0 | — |
