/**
 * 対象: contract/validation
 * 目的: 契約の必須項目・文字数・日付の前後関係と、内訳項目・「その他」の入力チェックを設計書の文言で確認する
 */
import { describe, expect, it } from "vitest";
import { contractFormSchema, CONTRACT_MESSAGES, customItemSchema } from "./validation";

const valid = {
  utilityType: "ELECTRICITY",
  companyName: " さくら電力 ",
  planName: " 従量電灯B ",
  startDate: "2024-04-01",
  endDate: "",
  memo: " メモ ",
  items: [] as { name: string; category: string; isCustom: boolean }[],
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
  describe("内訳項目", () => {
    const basic = { name: "基本料金", category: "BASIC", isCustom: false };
    it("項目名の前後の空白を除き、並び順のまま返す", () =>
      expect(
        contractFormSchema.parse({
          ...valid,
          items: [basic, { name: " 口座振替割引 ", category: "DISCOUNT", isCustom: true }],
        }).items,
      ).toEqual([basic, { name: "口座振替割引", category: "DISCOUNT", isCustom: true }]));
    it("同じ名前の項目が 2 つあるときは重なりの文言を出す", () =>
      expect(messages({ ...valid, items: [basic, basic] })).toContain(
        CONTRACT_MESSAGES.itemNameDuplicate,
      ));
    it("「その他」の項目名が選んだ種別の候補と同じときは、候補から追加する文言を出す", () =>
      expect(
        messages({ ...valid, items: [{ name: "昼間料金", category: "USAGE", isCustom: true }] }),
      ).toContain(CONTRACT_MESSAGES.itemNameIsCandidate));
    it("「その他」の項目名が別の種別の候補と同じなら受け付ける", () =>
      expect(
        messages({ ...valid, items: [{ name: "上水道", category: "OTHER", isCustom: true }] }),
      ).toEqual([]));
    it("分類が 6 つのどれでもないときは受け付けない", () =>
      expect(
        contractFormSchema.safeParse({ ...valid, items: [{ ...basic, category: "X" }] }).success,
      ).toBe(false));
  });
  describe("「その他」の追加", () => {
    const customMessages = (value: unknown) => {
      const result = customItemSchema.safeParse(value);
      return result.success ? [] : result.error.issues.map((issue) => issue.message);
    };
    describe("正しい入力のとき", () => {
      it("前後の空白を除いた項目名と分類を返す", () =>
        expect(customItemSchema.parse({ name: " 口座振替割引 ", category: "DISCOUNT" })).toEqual({
          name: "口座振替割引",
          category: "DISCOUNT",
        }));
      it("項目名が前後の空白を除いて30文字なら受け付ける", () =>
        expect(customMessages({ name: ` ${"あ".repeat(30)} `, category: "OTHER" })).toEqual([]));
    });
    describe("入力が正しくないとき", () => {
      it.each([
        ["項目名が空", { name: " ", category: "OTHER" }, CONTRACT_MESSAGES.itemNameRequired],
        [
          "項目名が31文字",
          { name: "あ".repeat(31), category: "OTHER" },
          CONTRACT_MESSAGES.itemNameTooLong,
        ],
        [
          "分類が未選択",
          { name: "口座振替割引", category: "" },
          CONTRACT_MESSAGES.itemCategoryRequired,
        ],
      ])("%sなら指定の文言を出す", (_label, value, message) =>
        expect(customMessages(value)).toContain(message),
      );
    });
  });
});
