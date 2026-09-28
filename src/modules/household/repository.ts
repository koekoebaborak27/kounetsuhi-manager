// 世帯の機能の DB の読み書き。
import "server-only";
import { prisma } from "@/shared/db/client";

// 利用者の所属（Membership）を 1 件探す。所属していなければ null を返す。
// Membership は userId ごとに 1 行しか持てないので、userId で探せば足りる。
export async function findMembershipByUserId(userId: string) {
  return prisma.membership.findUnique({ where: { userId } });
}

// 招待コードを 1 件探す。コードは DB 全体で一意なので、コードで探せば足りる。
export async function findInvitationByCode(code: string) {
  return prisma.invitation.findUnique({ where: { code } });
}

// 招待コードを使って世帯に参加する。コードを使用済みにすることと、所属の行を作ることを 1 つのトランザクションで行う。
// 参加できたら true、コードがすでに使われていた（または期限が切れていた）ら何も変えずに false を返す。
export async function joinWithInvitation(params: {
  invitationId: string;
  householdId: string;
  userId: string;
  now: Date;
}): Promise<boolean> {
  const { invitationId, householdId, userId, now } = params;
  return prisma.$transaction(async (tx) => {
    // 「まだ使われていない・期限内」を条件にして、使用済みにする。
    // 同じコードで 2 人が同時に参加しようとしても、DB が行を 1 人ずつ更新するため、条件に合って更新できるのは先の 1 人だけになる。
    const claimed = await tx.invitation.updateMany({
      where: { id: invitationId, usedByUserId: null, expiresAt: { gt: now } },
      data: { usedByUserId: userId, usedAt: now },
    });
    // 更新できなかった人は、先に使われたということなので参加させない。
    if (claimed.count === 0) return false;
    // 一般のメンバーとして所属させる。同じ人が別の画面から同時に参加していた場合は、
    // Membership の userId の一意の決まりでここが失敗し、コードの更新も取り消される。
    await tx.membership.create({ data: { userId, householdId, role: "MEMBER" } });
    return true;
  });
}

// 世帯を作り、作った人をオーナーとして所属させる。2 つの作成を 1 つのトランザクションで行う。
export async function createHouseholdWithOwner(params: { name: string; userId: string }) {
  const { name, userId } = params;
  // 世帯と所属の行を一度に作る（Prisma は入れ子の作成を 1 つのトランザクションで行う）。
  return prisma.household.create({
    data: { name, memberships: { create: { userId, role: "OWNER" } } },
  });
}

// 世帯を 1 件取り出す。
export async function findHouseholdById(householdId: string) {
  return prisma.household.findUnique({ where: { id: householdId } });
}

// 世帯のメンバーを、名前・メールアドレスつきで参加した順に取り出す。
export async function findMembersByHouseholdId(householdId: string) {
  return prisma.membership.findMany({
    where: { householdId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, email: true } } },
  });
}

// 世帯の招待コードのうち、未使用で期限内のものを、発行が新しい順に取り出す。
export async function findUsableInvitations(householdId: string, now: Date) {
  return prisma.invitation.findMany({
    where: { householdId, usedByUserId: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
}

// 世帯名を変える。
export async function updateHouseholdName(householdId: string, name: string) {
  await prisma.household.update({ where: { id: householdId }, data: { name } });
}

// 招待コードが DB にすでにあるかを返す。発行のときに重なりを避けるために使う。
export async function existsInvitationCode(code: string): Promise<boolean> {
  const found = await prisma.invitation.findUnique({ where: { code }, select: { id: true } });
  return found !== null;
}

// 招待コードを 1 件作る。
export async function createInvitation(params: {
  householdId: string;
  code: string;
  createdByUserId: string;
  expiresAt: Date;
}) {
  return prisma.invitation.create({ data: params });
}

// 利用者の所属の行を消す（世帯から退出する）。発行した招待コードは消さない。
export async function deleteMembershipByUserId(userId: string) {
  await prisma.membership.delete({ where: { userId } });
}
