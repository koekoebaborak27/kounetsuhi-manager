# 03. Google ログインの本番設定 — 8-3 で実施

Google Cloud の OAuth クライアントと同意画面を本番用に整える。**この文書は章立てと確認項目まで。** 画面のボタン名までの手順は、8-3 で実際に操作しながら書き足す。開発用の手順は [`Googleログインの準備.md`](../../development/Googleログインの準備.md)。

## 事前に必要なもの

- 本番の URL（`https://<プロジェクト名>.vercel.app`）。**Vercel のプロジェクトを先に作って URL を確定してから行う**（04 の最初の章）。
- 家族の Google アカウントのメールアドレス。

## 章立て

1. 使うクライアントを決める
   - 開発用クライアントに本番の URL を足すか、本番用に別のクライアントを作るか（本番と開発でシークレットを分けられるため、別に作る案を基本に検討する）
   - 決めた内容をこの節に残す
2. 承認済みのリダイレクト URI を登録する
   - 形: `https://<プロジェクト名>.vercel.app/api/auth/callback/google`
   - 開発用（`http://localhost:3000/api/auth/callback/google`）は別クライアントなら本番側に入れない
3. 同意画面（Google Auth Platform）の設定を確かめる
   - 公開ステータスが **テスト** のままであること（「本番環境にする」は押さない）
   - 求める情報が `openid`・`email`・`profile` だけであること
4. テストユーザーに家族を登録する
   - 登録していない人は Google の画面で止まる（アプリ側では判定しない）
5. クライアント ID とシークレットを控える
   - 保管先はパスワード管理ツール。04 で Vercel の環境変数（Production）へ入れる

## Better Auth 側で本番 URL を指定する箇所

- コードに URL は書かない。**環境変数 `BETTER_AUTH_URL`** に本番の URL（`https://<プロジェクト名>.vercel.app`）を入れる。Better Auth はこの値から、Google へ渡すリダイレクト先（`<BETTER_AUTH_URL>/api/auth/callback/google`）を作る。
- Google の承認済みリダイレクト URI と、`BETTER_AUTH_URL` から作られる URL が**1 文字でも違うと**ログインが失敗する（`redirect_uri_mismatch`）。末尾のスラッシュ・`http` と `https` の違いに注意する。
- `BETTER_AUTH_SECRET` は本番用に別の値を作る（[01](infra_design_01_事前準備.md)）。

## 確認項目（完了の条件）

- [ ] リダイレクト URI が上の形で登録されている
- [ ] 公開ステータスが「テスト」で、家族全員がテストユーザーに入っている
- [ ] クライアント ID・シークレットがコード・ドキュメント・チャットに残っていない
- [ ] 実際のログインの確認は 8-5 で行う（この時点ではまだ Vercel に環境変数が無い）
