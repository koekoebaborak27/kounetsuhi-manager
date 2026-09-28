/**
 * テストの目的（大項目）
 * 1. hasMembership: 所属（Membership）の行があれば true、無ければ false を返すこと
 * 2. requireMembership: 所属を返し、所属していなければ AppError(FORBIDDEN) を投げること
 * 3. joinHousehold: すでに所属していれば何もしないこと。招待コードの空・形の誤り・見つからない・使用済み・期限切れ・
 *    同時参加で後になった場合に、それぞれ設計書の文言で AppError を投げること
 * 4. createHousehold: すでに所属していれば何もしないこと。世帯名をチェックし、前後の空白を除いて作ること
 * 5. getHouseholdSettings: 世帯名・メンバー・使えるコードを画面の形に整えて返すこと
 * 6. renameHousehold: 世帯名をチェックし、所属している世帯の名前を変えること
 * 7. issueInvitation: 7 日後が期限のコードを作り、既存のコードと重なったら作り直すこと
 * 8. leaveHousehold: 一般のメンバーは所属を消し、オーナーは AppError(FORBIDDEN) を投げること
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AppError } from "@/shared/errors/app-error";
import type { CurrentMembership } from "./types";
import { INVITATION_MESSAGES } from "./validation";

// server-only は Next.js の外で import すると例外を投げるため、テストでは空のものに差し替える。
vi.mock("server-only", () => ({}));

// DB を使わずに試すため、repository を偽物に差し替える。
const repo = {
  findMembershipByUserId: vi.fn(),
  findInvitationByCode: vi.fn(),
  joinWithInvitation: vi.fn(),
  createHouseholdWithOwner: vi.fn(),
  findHouseholdById: vi.fn(),
  findMembersByHouseholdId: vi.fn(),
  findUsableInvitations: vi.fn(),
  updateHouseholdName: vi.fn(),
  existsInvitationCode: vi.fn(),
  createInvitation: vi.fn(),
  deleteMembershipByUserId: vi.fn(),
};
vi.mock("./repository", () => repo);

// ログイン中の人は、認証の機能の偽物から返す。
const requireUser = vi.fn();
vi.mock("@/modules/auth", () => ({ requireUser }));

const {
  createHousehold,
  getHouseholdSettings,
  hasMembership,
  issueInvitation,
  joinHousehold,
  leaveHousehold,
  NO_MEMBERSHIP_MESSAGE,
  OWNER_CANNOT_LEAVE_MESSAGE,
  renameHousehold,
  requireMembership,
} = await import("./service");

// テストの「今」。招待コードの期限の判定に使う。
const NOW = new Date("2026-09-28T03:00:00.000Z");

// 所属の行（repository の戻り値）を作る。変えたい項目だけを渡す。
const makeMembershipRow = (o: Record<string, unknown> = {}) => ({
  id: "m1",
  userId: "u1",
  householdId: "h1",
  role: "OWNER",
  createdAt: NOW,
  ...o,
});

// 招待コードの行（repository の戻り値）を作る。既定は未使用で期限内。
const makeInvitationRow = (o: Record<string, unknown> = {}) => ({
  id: "i1",
  householdId: "h9",
  code: "K7Q29XMA",
  createdByUserId: "u9",
  expiresAt: new Date("2026-10-01T00:00:00.000Z"),
  usedByUserId: null,
  usedAt: null,
  createdAt: NOW,
  ...o,
});

// サービスに渡すログイン中の人の所属を作る。
const makeMembership = (o: Partial<CurrentMembership> = {}): CurrentMembership => ({
  userId: "u1",
  householdId: "h1",
  role: "OWNER",
  ...o,
});

// 投げられた AppError の code と文言を取り出す。
async function catchAppError(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  const { code, userMessage } = error as AppError;
  return { code, userMessage };
}

describe("household/service", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    Object.values(repo).forEach((fn) => fn.mockReset());
    requireUser.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("hasMembership", () => {
    it("所属の行があるときは true を返す", async () => {
      repo.findMembershipByUserId.mockResolvedValue(makeMembershipRow());
      await expect(hasMembership("u1")).resolves.toBe(true);
      expect(repo.findMembershipByUserId).toHaveBeenCalledWith("u1");
    });

    it("所属の行が無いときは false を返す", async () => {
      repo.findMembershipByUserId.mockResolvedValue(null);
      await expect(hasMembership("u1")).resolves.toBe(false);
    });
  });

  describe("requireMembership", () => {
    beforeEach(() => {
      requireUser.mockResolvedValue({ id: "u1", name: "山田 太郎", email: "taro@example.com" });
    });

    describe("所属しているとき", () => {
      it("ログイン中の人の userId・householdId・role を返す", async () => {
        repo.findMembershipByUserId.mockResolvedValue(makeMembershipRow({ role: "MEMBER" }));
        await expect(requireMembership()).resolves.toEqual({
          userId: "u1",
          householdId: "h1",
          role: "MEMBER",
        });
      });
    });

    describe("所属していないとき", () => {
      it("AppError(FORBIDDEN) を「世帯に所属していません」の文言で投げる", async () => {
        repo.findMembershipByUserId.mockResolvedValue(null);
        await expect(catchAppError(requireMembership())).resolves.toEqual({
          code: "FORBIDDEN",
          userMessage: NO_MEMBERSHIP_MESSAGE,
        });
      });
    });

    describe("ログインしていないとき", () => {
      it("requireUser が投げた AppError をそのまま投げ、所属は調べない", async () => {
        requireUser.mockRejectedValue(new AppError("UNAUTHORIZED", 401, "ログインしてください。"));
        await expect(catchAppError(requireMembership())).resolves.toMatchObject({
          code: "UNAUTHORIZED",
        });
        expect(repo.findMembershipByUserId).not.toHaveBeenCalled();
      });
    });
  });

  describe("joinHousehold", () => {
    beforeEach(() => {
      repo.findMembershipByUserId.mockResolvedValue(null);
    });

    describe("使えるコードのとき", () => {
      it("入力を 8 文字に整えて探し、コードの世帯に参加する", async () => {
        repo.findInvitationByCode.mockResolvedValue(makeInvitationRow());
        repo.joinWithInvitation.mockResolvedValue(true);
        await joinHousehold("u1", { inviteCode: " k7q2-9xma " });
        expect(repo.findInvitationByCode).toHaveBeenCalledWith("K7Q29XMA");
        expect(repo.joinWithInvitation).toHaveBeenCalledWith({
          invitationId: "i1",
          householdId: "h9",
          userId: "u1",
          now: NOW,
        });
      });
    });

    describe("すでに所属しているとき", () => {
      it("何も調べず・何も変えずに終わる", async () => {
        repo.findMembershipByUserId.mockResolvedValue(makeMembershipRow());
        await expect(joinHousehold("u1", { inviteCode: "" })).resolves.toBeUndefined();
        expect(repo.findInvitationByCode).not.toHaveBeenCalled();
        expect(repo.joinWithInvitation).not.toHaveBeenCalled();
      });
    });

    describe("コードが空のとき", () => {
      it("AppError(VALIDATION_ERROR) を「入力してください」の文言で投げ、DB は見ない", async () => {
        await expect(catchAppError(joinHousehold("u1", { inviteCode: " - " }))).resolves.toEqual({
          code: "VALIDATION_ERROR",
          userMessage: INVITATION_MESSAGES.required,
        });
        expect(repo.findInvitationByCode).not.toHaveBeenCalled();
      });
    });

    describe("コードの形が違うとき", () => {
      it("AppError(VALIDATION_ERROR) を「見つかりません」の文言で投げ、DB は見ない", async () => {
        await expect(catchAppError(joinHousehold("u1", { inviteCode: "ABC" }))).resolves.toEqual({
          code: "VALIDATION_ERROR",
          userMessage: INVITATION_MESSAGES.notFound,
        });
        expect(repo.findInvitationByCode).not.toHaveBeenCalled();
      });
    });

    describe("コードが DB に無いとき", () => {
      it("AppError(INVITATION_NOT_FOUND) を「見つかりません」の文言で投げる", async () => {
        repo.findInvitationByCode.mockResolvedValue(null);
        await expect(
          catchAppError(joinHousehold("u1", { inviteCode: "K7Q2-9XMA" })),
        ).resolves.toEqual({
          code: "INVITATION_NOT_FOUND",
          userMessage: INVITATION_MESSAGES.notFound,
        });
        expect(repo.joinWithInvitation).not.toHaveBeenCalled();
      });
    });

    describe("コードが使用済みのとき", () => {
      it("AppError(INVITATION_USED) を「すでに使われています」の文言で投げる", async () => {
        repo.findInvitationByCode.mockResolvedValue(makeInvitationRow({ usedByUserId: "u8" }));
        await expect(
          catchAppError(joinHousehold("u1", { inviteCode: "K7Q2-9XMA" })),
        ).resolves.toEqual({ code: "INVITATION_USED", userMessage: INVITATION_MESSAGES.used });
        expect(repo.joinWithInvitation).not.toHaveBeenCalled();
      });

      it("期限も切れていたら、使用済みの文言を優先する", async () => {
        repo.findInvitationByCode.mockResolvedValue(
          makeInvitationRow({ usedByUserId: "u8", expiresAt: new Date("2026-09-01T00:00:00Z") }),
        );
        await expect(
          catchAppError(joinHousehold("u1", { inviteCode: "K7Q2-9XMA" })),
        ).resolves.toMatchObject({ code: "INVITATION_USED" });
      });
    });

    describe("コードの有効期限が切れているとき", () => {
      it("期限の時刻ちょうどなら、AppError(INVITATION_EXPIRED) を「有効期限が切れています」の文言で投げる", async () => {
        repo.findInvitationByCode.mockResolvedValue(makeInvitationRow({ expiresAt: NOW }));
        await expect(
          catchAppError(joinHousehold("u1", { inviteCode: "K7Q2-9XMA" })),
        ).resolves.toEqual({
          code: "INVITATION_EXPIRED",
          userMessage: INVITATION_MESSAGES.expired,
        });
        expect(repo.joinWithInvitation).not.toHaveBeenCalled();
      });

      it("期限の 1 ミリ秒前なら参加できる", async () => {
        repo.findInvitationByCode.mockResolvedValue(
          makeInvitationRow({ expiresAt: new Date(NOW.getTime() + 1) }),
        );
        repo.joinWithInvitation.mockResolvedValue(true);
        await expect(joinHousehold("u1", { inviteCode: "K7Q2-9XMA" })).resolves.toBeUndefined();
      });
    });

    describe("確かめた後に、別の人が先に同じコードで参加したとき", () => {
      it("AppError(INVITATION_USED) を「すでに使われています」の文言で投げる", async () => {
        repo.findInvitationByCode.mockResolvedValue(makeInvitationRow());
        repo.joinWithInvitation.mockResolvedValue(false);
        await expect(
          catchAppError(joinHousehold("u1", { inviteCode: "K7Q2-9XMA" })),
        ).resolves.toEqual({ code: "INVITATION_USED", userMessage: INVITATION_MESSAGES.used });
      });
    });
  });

  describe("createHousehold", () => {
    beforeEach(() => {
      repo.findMembershipByUserId.mockResolvedValue(null);
    });

    describe("世帯名が正しいとき", () => {
      it("前後の空白を除いた名前で世帯を作り、自分をオーナーにする", async () => {
        await createHousehold("u1", { name: " 山田家 " });
        expect(repo.createHouseholdWithOwner).toHaveBeenCalledWith({
          name: "山田家",
          userId: "u1",
        });
      });
    });

    describe("すでに所属しているとき", () => {
      it("何も変えずに終わる", async () => {
        repo.findMembershipByUserId.mockResolvedValue(makeMembershipRow());
        await createHousehold("u1", { name: "山田家" });
        expect(repo.createHouseholdWithOwner).not.toHaveBeenCalled();
      });
    });

    describe("世帯名が空のとき", () => {
      it("AppError(VALIDATION_ERROR) を投げ、作らない", async () => {
        await expect(catchAppError(createHousehold("u1", { name: "  " }))).resolves.toEqual({
          code: "VALIDATION_ERROR",
          userMessage: "世帯名を入力してください。",
        });
        expect(repo.createHouseholdWithOwner).not.toHaveBeenCalled();
      });
    });
  });

  describe("getHouseholdSettings", () => {
    describe("世帯があるとき", () => {
      it("世帯名・自分の役割・メンバー・招待コード（ハイフンつき・日本時間の期限）を返す", async () => {
        repo.findHouseholdById.mockResolvedValue({ id: "h1", name: "山田家" });
        repo.findMembersByHouseholdId.mockResolvedValue([
          makeMembershipRow({ user: { name: "山田 太郎", email: "taro@example.com" } }),
          makeMembershipRow({
            id: "m2",
            userId: "u2",
            role: "MEMBER",
            user: { name: "山田 花子", email: "hanako@example.com" },
          }),
        ]);
        repo.findUsableInvitations.mockResolvedValue([
          // UTC の 10/1 15:00 は、日本時間で 10/2。
          makeInvitationRow({ expiresAt: new Date("2026-10-01T15:00:00.000Z") }),
        ]);

        await expect(getHouseholdSettings(makeMembership({ role: "MEMBER" }))).resolves.toEqual({
          householdName: "山田家",
          myRole: "MEMBER",
          members: [
            { userId: "u1", name: "山田 太郎", email: "taro@example.com", role: "OWNER" },
            { userId: "u2", name: "山田 花子", email: "hanako@example.com", role: "MEMBER" },
          ],
          invitations: [{ id: "i1", code: "K7Q2-9XMA", expiresOn: "2026/10/02" }],
        });
        // データは所属している世帯の分だけを読み、コードは今の時刻で期限内のものに絞る。
        expect(repo.findMembersByHouseholdId).toHaveBeenCalledWith("h1");
        expect(repo.findUsableInvitations).toHaveBeenCalledWith("h1", NOW);
      });
    });

    describe("世帯が見つからないとき", () => {
      it("AppError(NOT_FOUND) を投げる", async () => {
        repo.findHouseholdById.mockResolvedValue(null);
        repo.findMembersByHouseholdId.mockResolvedValue([]);
        repo.findUsableInvitations.mockResolvedValue([]);
        await expect(catchAppError(getHouseholdSettings(makeMembership()))).resolves.toMatchObject({
          code: "NOT_FOUND",
        });
      });
    });
  });

  describe("renameHousehold", () => {
    describe("世帯名が正しいとき", () => {
      it("所属している世帯の名前を、前後の空白を除いて変える", async () => {
        await renameHousehold(makeMembership(), { name: " 佐藤家　" });
        expect(repo.updateHouseholdName).toHaveBeenCalledWith("h1", "佐藤家");
      });
    });

    describe("世帯名が 21 文字以上のとき", () => {
      it("AppError(VALIDATION_ERROR) を投げ、変えない", async () => {
        await expect(
          catchAppError(renameHousehold(makeMembership(), { name: "あ".repeat(21) })),
        ).resolves.toEqual({
          code: "VALIDATION_ERROR",
          userMessage: "世帯名は20文字以内で入力してください。",
        });
        expect(repo.updateHouseholdName).not.toHaveBeenCalled();
      });
    });
  });

  describe("issueInvitation", () => {
    describe("コードが重ならないとき", () => {
      it("所属している世帯に、発行者を自分・期限を 7 日後としてコードを 1 つ作る", async () => {
        repo.existsInvitationCode.mockResolvedValue(false);
        await issueInvitation(makeMembership());
        expect(repo.createInvitation).toHaveBeenCalledTimes(1);
        const created = repo.createInvitation.mock.calls[0][0];
        expect(created).toMatchObject({
          householdId: "h1",
          createdByUserId: "u1",
          expiresAt: new Date("2026-10-05T03:00:00.000Z"),
        });
        expect(created.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
      });
    });

    describe("作ったコードが既存のものと重なったとき", () => {
      it("作り直して、重ならなかったコードで作る", async () => {
        repo.existsInvitationCode.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        await issueInvitation(makeMembership());
        expect(repo.existsInvitationCode).toHaveBeenCalledTimes(2);
        expect(repo.createInvitation).toHaveBeenCalledTimes(1);
        expect(repo.createInvitation.mock.calls[0][0].code).toBe(
          repo.existsInvitationCode.mock.calls[1][0],
        );
      });
    });

    describe("5 回続けて重なったとき", () => {
      it("AppError(INVITATION_CODE_EXHAUSTED) を更新失敗の共通の文言で投げ、作らない", async () => {
        repo.existsInvitationCode.mockResolvedValue(true);
        await expect(catchAppError(issueInvitation(makeMembership()))).resolves.toEqual({
          code: "INVITATION_CODE_EXHAUSTED",
          userMessage: "保存できませんでした。通信状態を確認して、もう一度お試しください。",
        });
        expect(repo.existsInvitationCode).toHaveBeenCalledTimes(5);
        expect(repo.createInvitation).not.toHaveBeenCalled();
      });
    });
  });

  describe("leaveHousehold", () => {
    describe("一般のメンバーのとき", () => {
      it("自分の所属の行を消す", async () => {
        await leaveHousehold(makeMembership({ role: "MEMBER" }));
        expect(repo.deleteMembershipByUserId).toHaveBeenCalledWith("u1");
      });
    });

    describe("オーナーのとき", () => {
      it("AppError(FORBIDDEN) を「オーナーは退出できません」の文言で投げ、消さない", async () => {
        await expect(catchAppError(leaveHousehold(makeMembership()))).resolves.toEqual({
          code: "FORBIDDEN",
          userMessage: OWNER_CANNOT_LEAVE_MESSAGE,
        });
        expect(repo.deleteMembershipByUserId).not.toHaveBeenCalled();
      });
    });
  });
});
