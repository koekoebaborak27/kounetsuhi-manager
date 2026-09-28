/**
 * テストの目的（大項目）
 * 1. getCurrentUser: Better Auth のログイン状態から、ログイン中の人の ID・名前・メールアドレスだけを返すこと
 * 2. requireUser: ログインしていなければ UNAUTHORIZED の AppError を投げること
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// server-only は Next.js の外で import すると例外を投げるため、テストでは空のものに差し替える。
vi.mock("server-only", () => ({}));

// Better Auth の本体は DB につなぐため、ログイン状態を返す関数だけを持つ偽物に差し替える。
const getSession = vi.fn();
vi.mock("./auth", () => ({ auth: { api: { getSession, signOut: vi.fn() } } }));

// next/headers の headers() は Next.js の中でしか動かないため、空のヘッダーを返す偽物に差し替える。
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { getCurrentUser, requireUser } = await import("./service");

// Better Auth が返すログイン状態の見本。画面に使わない項目も含めておく。
const session = {
  session: { id: "s1", token: "t1" },
  user: {
    id: "u1",
    name: "山田太郎",
    email: "taro@example.com",
    emailVerified: true,
    image: "https://example.com/a.png",
  },
};

describe("auth/service", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  describe("getCurrentUser", () => {
    it("ログインしているときは ID・名前・メールアドレスだけを返す", async () => {
      getSession.mockResolvedValue(session);
      await expect(getCurrentUser(new Headers())).resolves.toEqual({
        id: "u1",
        name: "山田太郎",
        email: "taro@example.com",
      });
    });

    it("渡したヘッダーで Better Auth にログイン状態を問い合わせる", async () => {
      getSession.mockResolvedValue(null);
      const requestHeaders = new Headers({ cookie: "a=b" });
      await getCurrentUser(requestHeaders);
      expect(getSession).toHaveBeenCalledWith({ headers: requestHeaders });
    });

    it("ログインしていないときは null を返す", async () => {
      getSession.mockResolvedValue(null);
      await expect(getCurrentUser(new Headers())).resolves.toBeNull();
    });
  });

  describe("requireUser", () => {
    it("ログインしているときはその人を返す", async () => {
      getSession.mockResolvedValue(session);
      await expect(requireUser()).resolves.toMatchObject({ id: "u1" });
    });

    it("ログインしていないときは UNAUTHORIZED の AppError を投げる", async () => {
      getSession.mockResolvedValue(null);
      await expect(requireUser()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        httpStatus: 401,
      });
    });
  });
});
