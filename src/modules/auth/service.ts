// ログイン中の人を取り出す。
import "server-only";
import { headers } from "next/headers";
import { Errors } from "@/shared/errors/app-error";
import { auth } from "./auth";
import type { CurrentUser } from "./types";

// リクエストのクッキーからログイン中の人を取り出す。ログインしていなければ null を返す。
// 画面の振り分け（proxy.ts）のように、リクエストの情報を直接持っている入口から使う。
export async function getCurrentUser(requestHeaders: Headers): Promise<CurrentUser | null> {
  // Better Auth がクッキーの値で Session テーブルを探し、有効期限内ならその人の情報を返す。
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
}

// ログイン中の人を取り出す。ログインしていなければ UNAUTHORIZED の AppError を投げる。
// 画面操作（Server Action）や画面の読み込みで使う。振り分けは画面の表示（GET）でしか行わないため、
// 画面操作では改めてここで確かめる。
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser(await headers());
  if (!user) throw Errors.UNAUTHORIZED();
  return user;
}

// ログアウトする。Session テーブルからこのブラウザのログイン状態の行を消し、クッキーも消す。
export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
}
