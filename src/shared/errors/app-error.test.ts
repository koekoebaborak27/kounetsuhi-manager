/**
 * テストの目的（大項目）
 * 1. Errors の各関数が、決まった code と HTTP ステータスの AppError を作ること
 * 2. 文言を省略したときは既定の文言に、渡したときはその文言になること
 */
import { describe, it, expect } from "vitest";
import { AppError, Errors } from "./app-error";

describe("Errors", () => {
  describe("各関数を呼んだとき", () => {
    it.each([
      ["NOT_FOUND", Errors.NOT_FOUND, 404],
      ["UNAUTHORIZED", Errors.UNAUTHORIZED, 401],
      ["FORBIDDEN", Errors.FORBIDDEN, 403],
      ["VALIDATION_ERROR", Errors.VALIDATION_ERROR, 400],
      ["CONFLICT", Errors.CONFLICT, 409],
    ] as const)(
      "%s は code と HTTP ステータスが決まった AppError になる",
      (code, create, status) => {
        const error = create();
        expect(error).toBeInstanceOf(AppError);
        expect(error.code).toBe(code);
        expect(error.httpStatus).toBe(status);
      },
    );
  });

  describe("文言を省略したとき", () => {
    it("NOT_FOUND は設計書どおりの文言になる", () => {
      expect(Errors.NOT_FOUND().userMessage).toBe("データが見つかりません。");
    });
  });

  describe("文言と補足情報を渡したとき", () => {
    it("渡した文言と補足情報を持つ", () => {
      const error = Errors.VALIDATION_ERROR("請求額を入力してください。", { field: "amount" });
      expect(error.userMessage).toBe("請求額を入力してください。");
      expect(error.context).toEqual({ field: "amount" });
    });
  });
});
