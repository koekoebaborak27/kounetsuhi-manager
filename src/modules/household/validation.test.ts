/**
 * テストの目的（大項目）
 * 1. joinHouseholdSchema: 招待コードの空・形の誤りを設計書の文言で弾き、通ったら 8 文字に整えること
 * 2. householdNameFormSchema: 世帯名の空・21 文字以上を設計書の文言で弾き、通ったら前後の空白を除くこと
 */
import { describe, it, expect } from "vitest";
import {
  HOUSEHOLD_NAME_MESSAGES,
  householdNameFormSchema,
  INVITATION_MESSAGES,
  joinHouseholdSchema,
} from "./validation";

// チェックを通らなかったときの文言を、すべて取り出す。
function messagesOf(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((issue) => issue.message) ?? [];
}

describe("household/validation", () => {
  describe("joinHouseholdSchema", () => {
    describe("正しい形のコードのとき", () => {
      it("ハイフンつき・小文字・前後の空白ありでも通り、8 文字の大文字に整える", () => {
        const result = joinHouseholdSchema.safeParse({ inviteCode: "  k7q2-9xma " });
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ inviteCode: "K7Q29XMA" });
      });
    });

    describe("空のとき", () => {
      it.each([
        ["何も入っていない", ""],
        ["空白だけ", "   "],
        ["ハイフンだけ", "--"],
        ["空白とハイフンだけ", " - "],
      ])("%s場合は「入力してください」だけを出す", (_label, inviteCode) => {
        const result = joinHouseholdSchema.safeParse({ inviteCode });
        expect(messagesOf(result)).toEqual([INVITATION_MESSAGES.required]);
      });
    });

    describe("使える文字の 8 文字の形になっていないとき", () => {
      it.each([
        ["7 文字", "K7Q29XM"],
        ["9 文字", "K7Q29XMAB"],
        ["使えない文字 0 を含む", "K7Q29XM0"],
        ["途中に空白を含む", "K7Q2 9XMA"],
      ])("%sは「見つかりません」を出す", (_label, inviteCode) => {
        const result = joinHouseholdSchema.safeParse({ inviteCode });
        expect(messagesOf(result)).toEqual([INVITATION_MESSAGES.notFound]);
      });
    });
  });

  describe("householdNameFormSchema", () => {
    describe("1〜20 文字のとき", () => {
      it("前後の空白を除いた世帯名を返す", () => {
        const result = householdNameFormSchema.safeParse({ name: "  山田家 " });
        expect(result.data).toEqual({ name: "山田家" });
      });

      it("ちょうど 20 文字なら通る", () => {
        const name = "あ".repeat(20);
        expect(householdNameFormSchema.safeParse({ name }).success).toBe(true);
      });

      it("前後の空白を除いて 20 文字なら、空白込みで 21 文字以上でも通る", () => {
        const name = ` ${"あ".repeat(20)} `;
        expect(householdNameFormSchema.safeParse({ name }).success).toBe(true);
      });
    });

    describe("空のとき", () => {
      it.each([
        ["何も入っていない", ""],
        ["空白だけ", "　 "],
      ])("%s場合は「入力してください」を出す", (_label, name) => {
        const result = householdNameFormSchema.safeParse({ name });
        expect(messagesOf(result)).toEqual([HOUSEHOLD_NAME_MESSAGES.required]);
      });
    });

    describe("前後の空白を除いて 21 文字以上のとき", () => {
      it("「20文字以内で」の文言を出す", () => {
        const result = householdNameFormSchema.safeParse({ name: "あ".repeat(21) });
        expect(messagesOf(result)).toEqual(["世帯名は20文字以内で入力してください。"]);
      });
    });
  });
});
