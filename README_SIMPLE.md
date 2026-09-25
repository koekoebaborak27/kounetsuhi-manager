# はじめての方へ（かんたん版）

**光熱費マネージャー**は、電気・ガス・水道の検針票を 1 枚ずつ記録して、「今月は高いのか」「季節でどう変わるのか」をすぐ確かめられるようにする、家族向けのアプリです。
スマートフォンと PC のブラウザから使い、Google アカウントでログインした家族だけが使えます。

いまは要件と画面のレイアウトを決め終えた段階で、アプリ本体はまだありません。詳しい説明は [`README.md`](README.md) にあります。

## まず見るところ

| 知りたいこと | 見る場所 |
|---|---|
| どんな画面になるか | [`docs/mockups/画面イメージ.html`](docs/mockups/画面イメージ.html)（ブラウザで開く） |
| どんな機能があるか | [`README.md`](README.md) の「主な機能」 |
| いま何が残っているか | [`docs/todo/TODO.md`](docs/todo/TODO.md) |

## よく使うコマンド

```
pnpm install        # 必要な部品をそろえる
pnpm lint           # 書き方のチェック
pnpm typecheck      # 型のチェック
pnpm test           # テストの実行
```

アプリを起動する手順は、アプリ本体を作り始めた時点で [`README.md`](README.md) の「セットアップ」に書きます。

## AIエージェントで開発する

Claude Code / Codex / GitHub Copilot のどれを使っても、同じルールで開発できるようにしてあります。ルールは [`AGENTS.md`](AGENTS.md) の 1 か所にまとめてあり、各 AI の指示書からはそこを読ませるだけです。

| AI | 最初に読まれるファイル |
|---|---|
| Claude Code | [`CLAUDE.md`](CLAUDE.md) |
| Codex | [`AGENTS.md`](AGENTS.md) |
| GitHub Copilot | [`.github/copilot-instructions.md`](.github/copilot-instructions.md) |

使い方の詳細は [`README.md`](README.md) の「AIエージェントによる開発」を見てください。

## 困ったときは

| 知りたいこと | 見る場所 |
|---|---|
| Git の使い方（変更を反映する手順） | [`docs/development/gitの操作ルール.md`](docs/development/gitの操作ルール.md) |
| AI に何を許可しているか | [`docs/agent_permissions.md`](docs/agent_permissions.md) |
