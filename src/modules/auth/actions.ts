"use server";
// 認証の画面操作（Server Action）の入口。
import { redirect } from "next/navigation";
import { withAction } from "@/shared/observability/with-action";
import { LOGIN_PATH } from "./route-guard";
import { signOut } from "./service";

// ログアウトして、ログイン画面へ移す（設計書 S07 の「ログアウト」）。
export const logout = withAction("auth.logout", async () => {
  await signOut();
  // redirect() は Next.js が画面を切り替えるための合図を投げる。withAction はこれを受け止めずに通す。
  redirect(LOGIN_PATH);
});
