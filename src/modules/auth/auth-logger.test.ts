/**
 * テストの目的（大項目）
 * 1. Better Auth の重要度に合わせて、このアプリのログの重要度と日本語の文言で 1 行の JSON を出すこと
 * 2. Better Auth の元の文言と添えられた値を、調べられるように残すこと
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// server-only は Next.js の外で import すると例外を投げるため、テストでは空のものに差し替える。
vi.mock("server-only", () => ({}));

const { logBetterAuth } = await import("./auth-logger");

// 出力されたログの 1 行（JSON）を読み取る。
function parseLog(spy: ReturnType<typeof vi.spyOn>) {
  return JSON.parse(spy.mock.calls[0][0] as string);
}

describe("logBetterAuth", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("重要度ごと", () => {
    it("warn は warn のログとして、日本語の文言と元の英語の文言つきで出す", () => {
      logBetterAuth("warn", "Base URL is not set.");
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(parseLog(warnSpy)).toMatchObject({
        level: "warn",
        message: "ログインの仕組み（Better Auth）が設定や動作の注意を出しました",
        op: "auth.better-auth",
        detail: "Base URL is not set.",
      });
    });

    it("error は error のログとして出す", () => {
      logBetterAuth("error", "failed");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(parseLog(errorSpy)).toMatchObject({
        level: "error",
        message: "ログインの仕組み（Better Auth）でエラーが発生しました",
      });
    });

    it.each(["debug", "info"] as const)("%s は info のログとして出す", (level) => {
      logBetterAuth(level, "hello");
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(parseLog(infoSpy)).toMatchObject({
        level: "info",
        message: "ログインの仕組み（Better Auth）が動作の記録を出しました",
      });
    });
  });

  describe("添えられた値", () => {
    it("エラーは名前と文言を取り出して args に残す", () => {
      logBetterAuth("error", "failed", new Error("接続できない"), { id: 1 });
      expect(parseLog(errorSpy).args).toEqual([
        expect.objectContaining({ name: "Error", message: "接続できない" }),
        { id: 1 },
      ]);
    });

    it("値が無いときは args を出さない", () => {
      logBetterAuth("warn", "no args");
      expect(parseLog(warnSpy)).not.toHaveProperty("args");
    });
  });
});
