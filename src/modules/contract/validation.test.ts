/**
 * 対象: contract/validation
 * 目的: 契約の必須項目・文字数・日付の前後関係を設計書の文言で確認する
 */
import { describe, expect, it } from "vitest";
import { contractFormSchema, CONTRACT_MESSAGES } from "./validation";

const valid = {
  utilityType: "ELECTRICITY",
  companyName: " さくら電力 ",
  planName: " 従量電灯B ",
  startDate: "2024-04-01",
  endDate: "",
  memo: " メモ ",
};
const messages = (value: unknown) => {
  const result = contractFormSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("contract/validation", () => {
  describe("正しい入力のとき", () => {
    it("前後の空白を除いた値を返す", () =>
      expect(contractFormSchema.parse(valid)).toEqual({
        ...valid,
        companyName: "さくら電力",
        planName: "従量電灯B",
        memo: "メモ",
      }));
  });
  describe("必須項目が空のとき", () => {
    it.each([
      ["種別", { ...valid, utilityType: "" }, CONTRACT_MESSAGES.utilityTypeRequired],
      ["会社名", { ...valid, companyName: " " }, CONTRACT_MESSAGES.companyNameRequired],
      ["開始日", { ...valid, startDate: "" }, CONTRACT_MESSAGES.startDateRequired],
    ])("%sは指定の文言を出す", (_label, value, message) =>
      expect(messages(value)).toContain(message),
    );
  });
  describe("文字数と日付が正しくないとき", () => {
    it.each([
      [
        "会社名31文字",
        { ...valid, companyName: "あ".repeat(31) },
        CONTRACT_MESSAGES.companyNameTooLong,
      ],
      [
        "プラン名31文字",
        { ...valid, planName: "あ".repeat(31) },
        CONTRACT_MESSAGES.planNameTooLong,
      ],
      ["メモ201文字", { ...valid, memo: "あ".repeat(201) }, CONTRACT_MESSAGES.memoTooLong],
      ["存在しない日付", { ...valid, startDate: "2026-02-29" }, CONTRACT_MESSAGES.invalidDate],
      [
        "終了日が開始日より前",
        { ...valid, endDate: "2024-03-31" },
        CONTRACT_MESSAGES.endDateBeforeStart,
      ],
    ])("%sは指定の文言を出す", (_label, value, message) =>
      expect(messages(value)).toContain(message),
    );
  });
  it("任意項目が null でも空文字として受け取る", () =>
    expect(
      contractFormSchema.parse({ ...valid, planName: null, endDate: null, memo: null }),
    ).toMatchObject({ planName: "", endDate: "", memo: "" }));
});
