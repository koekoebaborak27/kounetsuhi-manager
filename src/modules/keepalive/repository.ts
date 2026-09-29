// DB が生きているかを確かめるための、いちばん軽い問い合わせを送る。
import { prisma } from "@/shared/db/client";

// DB へ `SELECT 1` を送る。テーブルは読まず、つながることだけを確かめる。
// つながらなければ例外になり、入口のラッパー（withRoute）が失敗として記録する。
export async function pingDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
