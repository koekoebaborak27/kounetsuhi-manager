// DB へつなぐための Prisma のクライアントを 1 つだけ作って配る。
// ブラウザ側のコードに混ざると接続先の情報が漏れるため、server-only でサーバー専用にする。
import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// 開発中に作ったクライアントを覚えておく置き場所。
// Next.js の開発サーバーはファイルを保存するたびにこのファイルを読み直すため、
// 毎回作り直すと DB への接続が増え続ける。読み直しても消えない globalThis に置いて使い回す。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma のクライアントを新しく作る。
// Prisma 7 では、PostgreSQL へは @prisma/adapter-pg を通してつなぐ。接続先は環境変数 DATABASE_URL を使う。
// 使うスキーマ（DB の中の区画）は環境変数 DATABASE_SCHEMA で決める。
// 接続文字列の ?schema= は、この接続方法では読まれないため、ここで別に渡す必要がある。
// 未設定・空文字のときは undefined を渡し、標準の public を使う（開発用 DB はこれ）。
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(
    { connectionString: process.env.DATABASE_URL },
    { schema: process.env.DATABASE_SCHEMA || undefined },
  );
  return new PrismaClient({ adapter });
}

// アプリ全体で使う Prisma のクライアント。DB を読み書きするときはこれを import する。
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// 本番では読み直しが起きないので、開発中だけ置き場所に覚えさせる。
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
