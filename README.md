# 光熱費マネージャー（kounetsuhi_manager）

電気・ガス・水道の請求額と使用量を**検針票 1 枚ごとに記録**し、次のことにすぐ答えられるようにする家族向けの Web アプリです。

- 今月の光熱費は高いのか（前回・前年同月と比べて）
- 季節によってどう変わるのか
- 契約を見直すときの判断材料（使用量と請求額の推移、請求額の内訳）

主な利用端末は Android スマートフォンの Chrome（ホーム画面に追加して使う PWA）で、家庭の PC のブラウザからも同じ画面を使えます。Google ログインで、家族（1 世帯）だけが使えるように制限します。

> **現在の状態**: 要件定義と画面レイアウトのすり合わせが終わった段階で、アプリ本体はまだありません。進み具合は [`docs/todo/TODO.md`](docs/todo/TODO.md) を見てください。

## 主な機能

| ID | 機能 | 画面 | 要件 |
|---|---|---|---|
| F01 | 認証と世帯（Google ログイン、世帯の作成、招待コードでの参加、一般メンバーの退出） | S01 ログイン / S02 初回設定 / S07 設定 | [`01_認証と世帯/`](docs/specs/01_requirements/01_認証と世帯/README.md) |
| F02 | 契約（会社・プラン・契約期間、請求額の内訳項目の選択） | S07 設定 / S08 契約 | [`02_契約/`](docs/specs/01_requirements/02_契約/README.md) |
| F03 | 検針票の記録（使用月ごとの作成・編集） | S05 記録 / S04 検針票の入力 | [`03_検針票の記録/`](docs/specs/01_requirements/03_検針票の記録/README.md) |
| F04 | ホーム（種別ごとの最新の検針票、前回比・前年同月比、今年の合計） | S03 ホーム | [`04_ホーム/`](docs/specs/01_requirements/04_ホーム/README.md) |
| F05 | グラフ（推移・年比較・年間） | S06 グラフ | [`05_グラフ/`](docs/specs/01_requirements/05_グラフ/README.md) |

画面のレイアウトは [`docs/mockups/画面イメージ.html`](docs/mockups/画面イメージ.html)（スマホ版・PC 版）をブラウザで開くと確認できます。

## 技術スタック

| 項目 | 内容 |
|---|---|
| 言語 | TypeScript / Node.js（[`.nvmrc`](.nvmrc) のバージョン） |
| フレームワーク | Next.js（未導入） |
| DB | PostgreSQL（Supabase の無料プラン）+ Prisma。開発用と本番用を分けず、1 つの DB を使う |
| 認証 | Better Auth（Google ログインのみ） |
| デプロイ先 | Vercel（Hobby プラン） |
| テスト | Vitest（単体）+ Playwright（画面操作） |
| パッケージマネージャ | pnpm |

無料プランの範囲だけで運用します。アプリの中で AI の API は使いません。

## セットアップ

Next.js を導入していないため、アプリを起動する手順はまだありません。導入した時点でここに書きます。

いまの時点で動かせるのは、静的チェックと単体テストだけです。

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm test
```

## よく使うコマンド

```
pnpm install        # 依存パッケージの取得
pnpm lint           # ESLint
pnpm format:check   # Prettier チェック
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest（単体）
pnpm test:watch     # Vitest（監視）
pnpm test:e2e       # Playwright（画面操作）
```

## 本番デプロイ

未構築です。手順は決まった時点で [`docs/specs/99_infra/`](docs/specs/99_infra/README.md) に書きます。

## CI（GitHub Actions）

PR の作成・更新時と `main` への push 時に、次を順に実行します（[`.github/workflows/ci.yml`](.github/workflows/ci.yml)）。`*.md` と `docs/` 配下だけの変更では起動しません。

1. lint
2. format チェック
3. typecheck
4. test

## ドキュメント

| 知りたいこと | 場所 |
|---|---|
| 要件（全体・機能ごと） | [`docs/specs/01_requirements/`](docs/specs/01_requirements/README.md) |
| 基本設計（画面・DB・画面遷移図。機能ごと） | [`docs/specs/02_basic-design/`](docs/specs/02_basic-design/README.md) |
| 設計書の索引 | [`docs/specs/`](docs/specs/README.md) |
| 画面レイアウト | [`docs/mockups/画面イメージ.html`](docs/mockups/画面イメージ.html) |
| 残タスクと現在地 | [`docs/todo/TODO.md`](docs/todo/TODO.md) |
| 作業の経緯 | [`docs/todo/history/`](docs/todo/history/README.md) |
| 開発フロー（ブランチ → PR → CI → マージ） | [`docs/development/gitの操作ルール.md`](docs/development/gitの操作ルール.md) |
| UI / デザイン規約 | [`DESIGN.md`](DESIGN.md) |
| レビュー観点 / テスト方針 | [`REVIEW.md`](REVIEW.md) / [`TESTING.md`](TESTING.md) |
| DB（Prisma）の操作 | [`docs/prisma_operations.md`](docs/prisma_operations.md) |

## AIエージェントによる開発

このリポジトリは、Claude Code / Codex / GitHub Copilot のどれを使っても同じルールで開発できるように作ってあります（土台は AI 開発テンプレート「ai-dev-template」）。

- **共通ルールの正本は [`AGENTS.md`](AGENTS.md)**。各ツールの入口ファイルはそこを読ませるだけです。
- **作業手順（スキル）の正本は [`docs/skills/`](docs/skills/README.md)**。各ツールの入口は正本を読ませるだけです。
- **AI に許可・禁止するコマンドの正本は [`docs/agent_permissions.md`](docs/agent_permissions.md)**。各ツールの設定ファイルはその写しです。

| ツール | 入口 | スキルの起動 | 権限の設定 |
|---|---|---|---|
| Claude Code | [`CLAUDE.md`](CLAUDE.md) | `/update-todo` のようなスラッシュコマンド、または説明文に合う依頼 | `.claude/settings.json` |
| Codex | [`AGENTS.md`](AGENTS.md) を直接読む | `.agents/skills/` の説明文に合う依頼 | `.codex/rules/project.rules`・`.codex/config.toml`（プロジェクトを trusted として承認したときだけ読まれる） |
| GitHub Copilot | [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Copilot Chat で `/update-todo` のように起動 | `.vscode/settings.json`（`false` は「禁止」ではなく「毎回確認する」） |

導入済みのスキルは次のとおりです。

| スキル | 何をするか |
|---|---|
| `update-todo` | `docs/todo/TODO.md` を最新化し、影響があれば README も直す |
| `push-skip-ci` | CI を起動させずに push する（実行前に必ずユーザーの承認を取る） |
| `create-unit-test-spec` | 単体テスト仕様書を Markdown で作る |
| `create-vitest-test` | Vitest の単体テストを書き、`pnpm test` が通るまで直す（Claude Code ではサブエージェントとしても使える） |
| `playwright-evidence-test` | 仕様書どおりに画面を操作し、スクリーンショットと DB 状態をエビデンスとして残す |

スキルを追加する手順は [`docs/skills/README.md`](docs/skills/README.md) にあります。

## ライセンス

MIT（[`LICENSE`](LICENSE)）。
