/**
 * テストの目的（大項目）
 * 1. 成功したとき、処理が返した応答をそのまま返すこと
 * 2. AppError が投げられたとき、その HTTP ステータスと { error: { code, message } } を返し、warn のログを 1 回出すこと
 * 3. 想定外のエラーのとき、500 と共通の文言を返し、error のログを 1 回出すこと
 * 4. redirect() のような Next.js の合図は受け止めずに投げ直すこと
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { redirect } from "next/navigation";
import { Errors } from "../errors/app-error";
import { UNEXPECTED_ROUTE_ERROR_MESSAGE, withRoute } from "./with-route";

// server-only は Next.js の外で import すると例外を投げるため、テストでは空のものに差し替える。
vi.mock("server-only", () => ({}));

describe("withRoute", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("成功したとき", () => {
    it("処理が返した応答をそのまま返す", async () => {
      const handler = withRoute("test.get", async (request: Request) =>
        Response.json({ url: request.url }),
      );
      const response = await handler(new Request("http://localhost/api/test"));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ url: "http://localhost/api/test" });
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("AppError が投げられたとき", () => {
    it("その HTTP ステータスと code・文言を返し、warn のログを 1 回出す", async () => {
      const handler = withRoute("test.get", async () => {
        throw Errors.FORBIDDEN();
      });
      const response = await handler();
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: { code: "FORBIDDEN", message: "この操作は行えません。" },
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(warnSpy.mock.calls[0][0] as string)).toMatchObject({
        message: "APIで想定内のエラーが発生しました",
        op: "test.get",
        code: "FORBIDDEN",
      });
    });
  });

  describe("想定外のエラーが投げられたとき", () => {
    it("500 と共通の文言を返し、error のログを 1 回出す", async () => {
      const handler = withRoute("test.get", async () => {
        throw new Error("接続先の秘密の情報");
      });
      const response = await handler();
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: { code: "INTERNAL_ERROR", message: UNEXPECTED_ROUTE_ERROR_MESSAGE },
      });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(errorSpy.mock.calls[0][0] as string)).toMatchObject({
        message: "APIで想定外のエラーが発生しました",
        op: "test.get",
      });
    });
  });

  describe("redirect() が呼ばれたとき", () => {
    it("受け止めずに投げ直し、ログも出さない", async () => {
      const handler = withRoute("test.move", async () => {
        redirect("/login");
      });
      await expect(handler()).rejects.toThrow("NEXT_REDIRECT");
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
