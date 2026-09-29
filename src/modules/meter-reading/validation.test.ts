/**
 * 対象: meter-reading/validation meterReadingFormSchema
 * 目的: S04 の入力チェック（必須・範囲・小数の桁数・使用期間・内訳の金額の要否）と、保存する形への変換を担保する
 */
import { describe, expect, it } from "vitest";
import { meterReadingFormSchema, METER_READING_MESSAGES } from "./validation";

// 正しい入力。テストごとに変える項目だけ上書きする。
const valid = {
  usageMonth: "2026-08",
  billingMonth: "2026-09",
  contractId: "c1",
  amount: "3,850",
  periodStart: "2026-07-13",
  periodEnd: "2026-08-12",
  usage: "19.4",
  memo: " メモ ",
  items: [
    { contractItemId: "i1", name: "基本料金", amount: "1,056", quantity: "", unitPrice: "" },
    { contractItemId: "i2", name: "従量料金", amount: "", quantity: "", unitPrice: "" },
  ],
};

// 入力チェックを行い、エラーの文言と場所（path）を取り出す。
const issuesOf = (override: Record<string, unknown>) => {
  const result = meterReadingFormSchema.safeParse({ ...valid, ...override });
  return result.success
    ? []
    : result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
};

// 内訳の 1 行を上書きした入力を作る。
const withItem = (item: Record<string, string>) => ({
  items: [
    { contractItemId: "i1", name: "基本料金", amount: "", quantity: "", unitPrice: "", ...item },
  ],
});

describe("meter-reading/validation meterReadingFormSchema", () => {
  describe("正常系", () => {
    it("数値を保存する形に変え、メモの前後の空白を除く", () => {
      const result = meterReadingFormSchema.parse(valid);
      expect(result.amount).toBe(3850);
      expect(result.usage).toBe("19.4");
      expect(result.memo).toBe("メモ");
      expect(result.items).toEqual([
        { contractItemId: "i1", name: "基本料金", amount: "1056", quantity: null, unitPrice: null },
        { contractItemId: "i2", name: "従量料金", amount: null, quantity: null, unitPrice: null },
      ]);
    });
    it("任意の項目（請求月・使用期間・使用量・メモ）は空でも通る", () =>
      expect(
        issuesOf({ billingMonth: "", periodStart: "", periodEnd: "", usage: "", memo: "" }),
      ).toEqual([]));
  });

  describe("使用月・請求月・契約", () => {
    it("使用月の形が正しくないときは範囲の文言を出す", () =>
      expect(issuesOf({ usageMonth: "2026-13" })).toEqual([
        { path: "usageMonth", message: METER_READING_MESSAGES.usageMonthOutOfRange },
      ]));
    it("請求月の形が正しくないときは止める", () =>
      expect(issuesOf({ billingMonth: "2026/09" })[0]?.path).toBe("billingMonth"));
    it("契約が未選択なら「契約を選択してください。」", () =>
      expect(issuesOf({ contractId: "" })).toEqual([
        { path: "contractId", message: METER_READING_MESSAGES.contractRequired },
      ]));
  });

  describe("請求額", () => {
    it("空なら「請求額を入力してください。」", () =>
      expect(issuesOf({ amount: " " })).toEqual([
        { path: "amount", message: METER_READING_MESSAGES.amountRequired },
      ]));
    it("0 と 999,999 は通る", () => {
      expect(issuesOf({ amount: "0" })).toEqual([]);
      expect(issuesOf({ amount: "999,999" })).toEqual([]);
    });
    it("小数・負の数・1,000,000 は範囲の文言を出す", () => {
      for (const amount of ["10.5", "-1", "1000000"]) {
        expect(issuesOf({ amount })).toEqual([
          { path: "amount", message: METER_READING_MESSAGES.amountInvalid },
        ]);
      }
    });
  });

  describe("使用期間", () => {
    it("片方だけ入力したときは、空の側に文言を出す", () => {
      expect(issuesOf({ periodStart: "" })).toEqual([
        { path: "periodStart", message: METER_READING_MESSAGES.periodBothRequired },
      ]);
      expect(issuesOf({ periodEnd: "" })).toEqual([
        { path: "periodEnd", message: METER_READING_MESSAGES.periodBothRequired },
      ]);
    });
    it("日付として正しくないときは「正しい日付を入力してください。」", () =>
      expect(issuesOf({ periodEnd: "2026-02-30" })).toEqual([
        { path: "periodEnd", message: METER_READING_MESSAGES.invalidDate },
      ]));
    it("終了日が開始日より前なら止め、同じ日なら通す", () => {
      expect(issuesOf({ periodEnd: "2026-07-12" })).toEqual([
        { path: "periodEnd", message: METER_READING_MESSAGES.periodEndBeforeStart },
      ]);
      expect(issuesOf({ periodEnd: "2026-07-13" })).toEqual([]);
    });
  });

  describe("使用量", () => {
    it("小数 1 桁・上限ちょうどは通る", () => expect(issuesOf({ usage: "99,999.9" })).toEqual([]));
    it("小数 2 桁・負の数は止める", () => {
      for (const usage of ["19.45", "-1"]) {
        expect(issuesOf({ usage })).toEqual([
          { path: "usage", message: METER_READING_MESSAGES.usageInvalid },
        ]);
      }
    });
  });

  describe("内訳", () => {
    it("金額は負の数も通り、範囲の外は止める", () => {
      expect(issuesOf(withItem({ amount: "−999,999" }))).toEqual([]);
      expect(issuesOf(withItem({ amount: "1000000" }))).toEqual([
        { path: "items.0.amount", message: METER_READING_MESSAGES.itemAmountInvalid },
      ]);
    });
    it("数量は小数 2 桁を止める", () =>
      expect(issuesOf(withItem({ amount: "1", quantity: "1.25" }))).toEqual([
        { path: "items.0.quantity", message: METER_READING_MESSAGES.itemQuantityInvalid },
      ]));
    it("単価は負の数・小数 3 桁を通し、小数 4 桁を止める", () => {
      expect(issuesOf(withItem({ amount: "1", unitPrice: "-9,999.999" }))).toEqual([]);
      expect(issuesOf(withItem({ amount: "1", unitPrice: "152.1234" }))).toEqual([
        { path: "items.0.unitPrice", message: METER_READING_MESSAGES.itemUnitPriceInvalid },
      ]);
    });
    it("数量か単価を入れて金額が空なら、その行の金額の下に文言を出す", () =>
      expect(issuesOf(withItem({ unitPrice: "152.17" }))).toEqual([
        { path: "items.0.amount", message: METER_READING_MESSAGES.itemAmountRequired },
      ]));
    it("同じ内訳項目が 2 行あれば止める", () =>
      expect(
        issuesOf({
          items: [
            { contractItemId: "i1", name: "基本料金", amount: "1", quantity: "", unitPrice: "" },
            { contractItemId: "i1", name: "基本料金", amount: "2", quantity: "", unitPrice: "" },
          ],
        }),
      ).toEqual([{ path: "items", message: METER_READING_MESSAGES.itemDuplicate }]));
  });

  describe("メモ", () => {
    it("前後の空白を除いて 200 文字なら通り、201 文字なら止める", () => {
      expect(issuesOf({ memo: ` ${"あ".repeat(200)} ` })).toEqual([]);
      expect(issuesOf({ memo: "あ".repeat(201) })).toEqual([
        { path: "memo", message: METER_READING_MESSAGES.memoTooLong },
      ]);
    });
  });
});
