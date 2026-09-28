/**
 * テストの目的（大項目）
 * 1. 成功したとき、結果を { ok: true, data } で返し、ログを出さないこと
 * 2. AppError が投げられたとき、その code と文言で { ok: false } を返し、warn のログを 1 回出すこと
 * 3. 想定外のエラーのとき、共通の文言で { ok: false } を返し、中身を画面に出さず error のログを 1 回出すこと
 * 4. redirect() のような Next.js の合図は受け止めずに投げ直すこと
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { redirect } from "next/navigation";
import { Errors } from "../errors/app-error";
import { UNEXPECTED_ACTION_ERROR_MESSAGE, withAction } from "./with-action";

// server-only は Next.js の外で import すると例外を投げるため、テストでは空のものに差し替える。
vi.mock("server-only", () => ({}));

// 出力されたログの 1 行（JSON）を読み取る。
function parseLog(spy: ReturnType<typeof vi.spyOn>) {
  return JSON.parse(spy.mock.calls[0][0] as string);
}

describe("withAction", () => {
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
    it("引数を渡して呼び、結果を ok: true で返す", async () => {
      const action = withAction("test.add", async (a: number, b: number) => a + b);
      await expect(action(1, 2)).resolves.toEqual({ ok: true, data: 3 });
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("AppError が投げられたとき", () => {
    it("その code と文言を ok: false で返す", async () => {
      const action = withAction("test.find", async () => {
        throw Errors.NOT_FOUND(undefined, { id: "x" });
      });
      await expect(action()).resolves.toEqual({
        ok: false,
        code: "NOT_FOUND",
        message: "データが見つかりません。",
      });
    });

    it("warn のログを 1 回だけ、操作名と補足情報つきで出す", async () => {
      const action = withAction("test.find", async () => {
        throw Errors.NOT_FOUND(undefined, { id: "x" });
      });
      await action();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(parseLog(warnSpy)).toMatchObject({
        level: "warn",
        message: "画面操作で想定内のエラーが発生しました",
        op: "test.find",
        code: "NOT_FOUND",
        context: { id: "x" },
      });
    });
  });

  describe("想定外のエラーが投げられたとき", () => {
    it("エラーの中身ではなく共通の文言を ok: false で返す", async () => {
      const action = withAction("test.save", async () => {
        throw new Error("接続先の秘密の情報");
      });
      await expect(action()).resolves.toEqual({
        ok: false,
        code: "INTERNAL_ERROR",
        message: UNEXPECTED_ACTION_ERROR_MESSAGE,
      });
    });

    it("error のログを 1 回だけ、エラーの中身つきで出す", async () => {
      const action = withAction("test.save", async () => {
        throw new Error("接続できない");
      });
      await action();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(parseLog(errorSpy)).toMatchObject({
        level: "error",
        message: "画面操作で想定外のエラーが発生しました",
        op: "test.save",
        error: { name: "Error", message: "接続できない" },
      });
    });
  });

  describe("redirect() が呼ばれたとき", () => {
    it("受け止めずに投げ直し、ログも出さない", async () => {
      const action = withAction("test.move", async () => {
        redirect("/login");
      });
      await expect(action()).rejects.toThrow("NEXT_REDIRECT");
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
