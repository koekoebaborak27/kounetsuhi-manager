// Supabase 無料プランの一時停止を防ぐため、Vercel Cron から 1 日 1 回呼ばれる処理。
import "server-only";
import { timingSafeEqual } from "node:crypto";
import { Errors } from "@/shared/errors/app-error";
import { pingDatabase } from "./repository";

// Authorization ヘッダーが「Bearer <CRON_SECRET>」と一致するかを確かめる。
// 環境変数が未設定・短すぎるときは、誰でも通れてしまうのを避けるため、常に一致しない扱いにする。
// 比べるときは、一致した文字数から秘密の値を推測されにくい timingSafeEqual を使う。
export function isValidCronRequest(authorization: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || authorization === null) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  // timingSafeEqual は長さが違うと例外になるため、先に長さを比べる。
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Cron からの呼び出しであることを確かめてから、DB へ軽い問い合わせを送る。
// 確かめに失敗したときは、DB に触れる前に UNAUTHORIZED の AppError を投げる。
export async function runKeepalive(authorization: string | null): Promise<void> {
  if (!isValidCronRequest(authorization)) {
    throw Errors.UNAUTHORIZED("認証に失敗しました。");
  }
  await pingDatabase();
}
