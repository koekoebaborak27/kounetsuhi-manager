// 世帯の機能の DB の読み書き。
import "server-only";
import { prisma } from "@/shared/db/client";

// 利用者の所属（Membership）を 1 件探す。所属していなければ null を返す。
// Membership は userId ごとに 1 行しか持てないので、userId で探せば足りる。
export async function findMembershipByUserId(userId: string) {
  return prisma.membership.findUnique({ where: { userId } });
}
