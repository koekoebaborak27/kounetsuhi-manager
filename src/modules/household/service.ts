// 世帯の機能のユースケース。
import "server-only";
import { randomInt } from "node:crypto";
import type { z } from "zod";
import { requireUser } from "@/modules/auth";
import { AppError, Errors } from "@/shared/errors/app-error";
import { formatDate } from "@/shared/format/date";
import { UNEXPECTED_ACTION_ERROR_MESSAGE } from "@/shared/observability/with-action";
import {
  formatInvitationCode,
  generateInvitationCode,
  invitationExpiresAt,
} from "./invitation-code";
import {
  createHouseholdWithOwner,
  createInvitation,
  deleteMembershipByUserId,
  existsInvitationCode,
  findHouseholdById,
  findInvitationByCode,
  findMembersByHouseholdId,
  findMembershipByUserId,
  findUsableInvitations,
  joinWithInvitation,
  updateHouseholdName,
} from "./repository";
import type { CurrentMembership, HouseholdSettings } from "./types";
import { householdNameFormSchema, INVITATION_MESSAGES, joinHouseholdSchema } from "./validation";

// 世帯に所属していない人が、所属が必要な操作をしたときの文言（別の画面で退出した後など）。
// 画面を読み直すと、振り分けで初回設定の画面へ移る。
export const NO_MEMBERSHIP_MESSAGE = "世帯に所属していません。画面を再読み込みしてください。";

// オーナーが退出しようとしたときの文言（設計書 S07 の「エラー時の表示文言」）。
export const OWNER_CANNOT_LEAVE_MESSAGE = "オーナーは世帯から退出できません。";

// 招待コードを作り直す回数の上限。32 文字から 8 文字を選ぶと約 1 兆通りあるので、重なりが続くことは実際には起きない。
const MAX_CODE_ATTEMPTS = 5;

// 招待コードの照合で失敗したときのエラー。画面では招待コードの入力欄の下に出す。
// context はログに残す補足情報（対象の ID など）。
export const InvitationErrors = {
  NOT_FOUND: (context?: Record<string, unknown>) =>
    new AppError("INVITATION_NOT_FOUND", 404, INVITATION_MESSAGES.notFound, context),
  USED: (context?: Record<string, unknown>) =>
    new AppError("INVITATION_USED", 409, INVITATION_MESSAGES.used, context),
  EXPIRED: (context?: Record<string, unknown>) =>
    new AppError("INVITATION_EXPIRED", 410, INVITATION_MESSAGES.expired, context),
};

// 入力をスキーマでチェックし、通れば整えた値を返す。通らなければ最初のエラーの文言で VALIDATION_ERROR を投げる。
// 画面でも同じチェックをしているが、画面を通さずに呼ばれることもあるため、サーバーでも必ず確かめる。
function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw Errors.VALIDATION_ERROR(result.error.issues[0]?.message);
  return result.data;
}

// 利用者が世帯に所属しているかどうかを返す。
// 退出したときは Membership の行を消すので、行があるかどうかで所属しているかが分かる。
export async function hasMembership(userId: string): Promise<boolean> {
  const membership = await findMembershipByUserId(userId);
  return membership !== null;
}

// ログイン中の人の所属を返す。ログインしていなければ UNAUTHORIZED、所属していなければ FORBIDDEN の AppError を投げる。
// 世帯のデータを扱う画面操作や画面の読み込みは、最初にこれを呼び、返った householdId でデータを絞り込む。
export async function requireMembership(): Promise<CurrentMembership> {
  const user = await requireUser();
  // 振り分けは画面の表示でしか行わないため、画面操作の時点で所属しているかを改めて確かめる。
  const membership = await findMembershipByUserId(user.id);
  if (!membership) throw Errors.FORBIDDEN(NO_MEMBERSHIP_MESSAGE, { userId: user.id });
  return {
    userId: membership.userId,
    householdId: membership.householdId,
    role: membership.role,
  };
}

// S02「参加する」。招待コードの世帯に、一般のメンバーとして参加する。
// すでに所属していたときは、何も変えずに終わる（呼び出し側はどちらの場合もホームへ移す）。
export async function joinHousehold(userId: string, input: unknown): Promise<void> {
  // 処理の直前に、すでに所属していないかを確かめる（別の画面で参加・作成を済ませていた場合など）。
  if (await hasMembership(userId)) return;
  // 空・形の誤りは、DB を見る前にここで止める。
  const { inviteCode } = parseInput(joinHouseholdSchema, input);

  // コードを DB で探し、使えるかどうかを確かめる。使用済みかつ期限切れのときは「使用済み」を優先して出す。
  const invitation = await findInvitationByCode(inviteCode);
  if (!invitation) throw InvitationErrors.NOT_FOUND();
  if (invitation.usedByUserId !== null)
    throw InvitationErrors.USED({ invitationId: invitation.id });
  const now = new Date();
  if (invitation.expiresAt.getTime() <= now.getTime()) {
    throw InvitationErrors.EXPIRED({ invitationId: invitation.id });
  }

  // コードを使用済みにして参加する。確かめた後に別の人が先に使っていたら false が返るので、使用済みの文言を出す。
  const joined = await joinWithInvitation({
    invitationId: invitation.id,
    householdId: invitation.householdId,
    userId,
    now,
  });
  if (!joined) throw InvitationErrors.USED({ invitationId: invitation.id });
}

// S02「世帯を作成」。世帯を作り、自分をオーナーとして所属させる。
// すでに所属していたときは、何も変えずに終わる。
export async function createHousehold(userId: string, input: unknown): Promise<void> {
  // 処理の直前に、すでに所属していないかを確かめる。
  if (await hasMembership(userId)) return;
  const { name } = parseInput(householdNameFormSchema, input);
  await createHouseholdWithOwner({ name, userId });
}

// S07 設定の画面に出す、世帯名・メンバー・使える招待コードをまとめて返す。
export async function getHouseholdSettings(
  membership: CurrentMembership,
): Promise<HouseholdSettings> {
  const { householdId } = membership;
  // 世帯名・メンバー・招待コードは互いに関係なく読めるので、まとめて問い合わせる。
  const [household, members, invitations] = await Promise.all([
    findHouseholdById(householdId),
    findMembersByHouseholdId(householdId),
    findUsableInvitations(householdId, new Date()),
  ]);
  // 所属の行は世帯を参照しているので、通常は起きない。
  if (!household) throw Errors.NOT_FOUND(undefined, { householdId });

  return {
    householdName: household.name,
    myRole: membership.role,
    members: members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
    })),
    // 画面にそのまま出せるよう、コードはハイフンつき、期限は日本時間の日付にしておく。
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      code: formatInvitationCode(invitation.code),
      expiresOn: formatDate(invitation.expiresAt),
    })),
  };
}

// S07「世帯名の保存」。所属している世帯の名前を変える。
export async function renameHousehold(
  membership: CurrentMembership,
  input: unknown,
): Promise<void> {
  const { name } = parseInput(householdNameFormSchema, input);
  await updateHouseholdName(membership.householdId, name);
}

// S07「コードを発行」。所属している世帯の招待コードを 1 つ作る。有効期限は発行から 7 日後。
export async function issueInvitation(membership: CurrentMembership): Promise<void> {
  // 作ったコードが既存のものと重なったときは作り直す。
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateInvitationCode(randomInt);
    if (await existsInvitationCode(code)) continue;
    await createInvitation({
      householdId: membership.householdId,
      code,
      createdByUserId: membership.userId,
      expiresAt: invitationExpiresAt(new Date()),
    });
    return;
  }
  // 上限まで重なり続けたときは、乱数の仕組みの不具合を疑う。画面には更新失敗の共通の文言を出す。
  throw new AppError("INVITATION_CODE_EXHAUSTED", 500, UNEXPECTED_ACTION_ERROR_MESSAGE, {
    householdId: membership.householdId,
  });
}

// S07「世帯から退出」。自分の所属の行を消す。オーナーは退出できない。
export async function leaveHousehold(membership: CurrentMembership): Promise<void> {
  // 画面では一般のメンバーにだけボタンを出すが、画面を開いた後に役割が変わった場合に備えてここでも確かめる。
  if (membership.role === "OWNER") {
    throw Errors.FORBIDDEN(OWNER_CANNOT_LEAVE_MESSAGE, { userId: membership.userId });
  }
  await deleteMembershipByUserId(membership.userId);
}
