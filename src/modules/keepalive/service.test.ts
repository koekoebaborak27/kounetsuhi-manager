/**
 * テストの目的（大項目）
 * 1. isValidCronRequest: 「Bearer <CRON_SECRET>」と一致するときだけ true を返し、未設定・短すぎる・違う値・ヘッダー無しは false を返すこと
 * 2. runKeepalive: 認証に成功したときだけ DB へ問い合わせを送り、失敗したときは DB に触れず UNAUTHORIZED を投げること
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// server-only は Next.js の外で import すると例外を投げるため、テストでは空のものに差し替える。
vi.mock("server-only", () => ({}));

// DB へは実際につながず、呼ばれたかどうかだけを見る。
const pingDatabase = vi.fn();
vi.mock("./repository", () => ({ pingDatabase }));

const { isValidCronRequest, runKeepalive } = await import("./service");

// テスト用の秘密の値（16 文字以上）。本物ではない。
const SECRET = "test-cron-secret-0123456789";

describe("isValidCronRequest", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Bearer と秘密の値が一致すれば true", () => {
    expect(isValidCronRequest(`Bearer ${SECRET}`)).toBe(true);
  });

  it("値が違えば false", () => {
    expect(isValidCronRequest("Bearer wrong-secret-0123456789")).toBe(false);
  });

  it("長さが違えば false（例外にならない）", () => {
    expect(isValidCronRequest("Bearer x")).toBe(false);
  });

  it("Bearer を付けていなければ false", () => {
    expect(isValidCronRequest(SECRET)).toBe(false);
  });

  it("ヘッダーが無ければ false", () => {
    expect(isValidCronRequest(null)).toBe(false);
  });

  it("環境変数が未設定なら、空の Bearer でも false", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isValidCronRequest("Bearer ")).toBe(false);
  });

  it("環境変数が 16 文字未満なら、一致していても false", () => {
    vi.stubEnv("CRON_SECRET", "short");
    expect(isValidCronRequest("Bearer short")).toBe(false);
  });
});

describe("runKeepalive", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
    pingDatabase.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("認証に成功したら DB へ問い合わせを 1 回送る", async () => {
    await runKeepalive(`Bearer ${SECRET}`);
    expect(pingDatabase).toHaveBeenCalledTimes(1);
  });

  it("認証に失敗したら DB に触れず、UNAUTHORIZED を投げる", async () => {
    await expect(runKeepalive("Bearer wrong-secret-0123456789")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      httpStatus: 401,
    });
    expect(pingDatabase).not.toHaveBeenCalled();
  });
});
