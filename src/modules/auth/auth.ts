// Better Auth（ログインの仕組み）の設定。Google ログインだけを有効にする。
// ログイン状態は Better Auth の標準設定のまま、DB の Session テーブルに保存する（設計書 00_認証と世帯共通.md）。
import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/shared/db/client";
import { logBetterAuth } from "./auth-logger";

// Better Auth の本体。ログインの API（/api/auth/...）と、ログイン中の人の取り出しに使う。
// DB に触るのは repository.ts だけという決まりの例外で、Better Auth が User・Session・Account・Verification を
// 読み書きできるように、ここで Prisma のクライアントを渡している（src/AGENTS.md）。
export const auth = betterAuth({
  // 秘密の値（BETTER_AUTH_SECRET）とアプリの URL（BETTER_AUTH_URL）は、Better Auth が環境変数から読む。
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // メールアドレスとパスワードでのログインは設計書で使わないと決めているため、有効にしない（既定で無効）。
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Google に求める情報を openid・email・profile だけに限る（設計書）。既定の範囲を使わずに明示する。
      disableDefaultScope: true,
      scope: ["openid", "email", "profile"],
      // 2 回目以降のログインでも、名前・メールアドレスを Google の値で更新する（設計書 S01 の「DB への影響」）。
      overrideUserInfoOnSignIn: true,
    },
  },
  // Better Auth のログを、このアプリのログの形（1 行の JSON・日本語の文言）で出す。
  logger: { log: logBetterAuth },
  // 画面操作（Server Action）の中でログアウトしたとき、ブラウザのクッキーを消せるようにする。一番最後に置く決まり。
  plugins: [nextCookies()],
});
