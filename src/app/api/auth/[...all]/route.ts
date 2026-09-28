// ログインの API（/api/auth/...）の入口。Google のログインの開始・Google から戻ってきたときの処理・ログアウトなどを
// Better Auth がまとめて受け持つ。ログは API 用のラッパーで包んで出す。
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/modules/auth";
import { withRoute } from "@/shared/observability/with-route";

// Better Auth が用意した、GET と POST の受け口。
const handlers = toNextJsHandler(auth);

// 情報の取得（ログイン中の人の確認・Google から戻ってきたときの処理など）の受け口。
export const GET = withRoute("auth.api.get", handlers.GET);

// 状態を変える操作（ログインの開始・ログアウトなど）の受け口。
export const POST = withRoute("auth.api.post", handlers.POST);
