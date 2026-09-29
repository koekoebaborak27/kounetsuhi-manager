// 検針票の入力チェック。画面とサーバーで同じスキーマを使い、数値の入力もここで保存する形に整える。
import { z } from "zod";
import { isValidDateOnly } from "@/shared/date/date-only";
import { isValidYearMonth } from "@/shared/date/year-month";
import { parseNumberInput, type NumberInputRule } from "@/shared/number/number-input";
import {
  AMOUNT_RULE,
  ITEM_AMOUNT_RULE,
  ITEM_QUANTITY_RULE,
  ITEM_UNIT_PRICE_RULE,
  USAGE_RULE,
} from "./reading-rules";

// メモの上限の文字数。
export const METER_READING_MEMO_MAX_LENGTH = 200;

// 検針票の入力チェックと保存で表示する文言。
export const METER_READING_MESSAGES = {
  usageMonthOutOfRange: "使用月は2000年1月から翌月までの範囲で選択してください。",
  billingMonthInvalid: "請求月を選び直してください。",
  contractRequired: "契約を選択してください。",
  contractNotFound: "契約が見つかりません。選び直してください。",
  amountRequired: "請求額を入力してください。",
  amountInvalid: "請求額は0〜999,999の整数で入力してください。",
  periodBothRequired: "使用期間は開始日と終了日の両方を入力してください。",
  invalidDate: "正しい日付を入力してください。",
  periodEndBeforeStart: "終了日は開始日以降の日付を入力してください。",
  usageInvalid: "使用量は0〜99,999.9の数値（小数1桁まで）で入力してください。",
  itemAmountInvalid: "金額は−999,999〜999,999の整数で入力してください。",
  itemQuantityInvalid: "数量は0〜99,999.9の数値（小数1桁まで）で入力してください。",
  itemUnitPriceInvalid: "単価は−9,999.999〜9,999.999の数値（小数3桁まで）で入力してください。",
  itemAmountRequired: "数量・単価を入力した項目は、金額も入力してください。",
  itemDuplicate: "同じ内訳項目が 2 つあります。画面を再読み込みしてください。",
  memoTooLong: "メモは200文字以内で入力してください。",
} as const;

// 保存の失敗を知らせるエラーのコード。画面とサーバーの両方で使い、画面はこのコードを見て文言を出す入力欄を決める。
export const METER_READING_ERROR_CODES = {
  duplicate: "METER_READING_DUPLICATE",
  usageMonthOutOfRange: "METER_READING_USAGE_MONTH_OUT_OF_RANGE",
  contractNotFound: "METER_READING_CONTRACT_NOT_FOUND",
} as const;

// 任意の数値の入力。空なら null、条件を満たせば余分な 0 を除いた数字の文字列にする。
const optionalNumber = (rule: NumberInputRule, message: string) =>
  z.string().transform((value, context) => {
    if (value.trim() === "") return null;
    const parsed = parseNumberInput(value, rule);
    if (parsed === null) {
      context.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return parsed;
  });

// 任意の日付（YYYY-MM-DD）。空は空文字のまま通し、日付として正しくないものは止める。
const optionalDateOnly = z
  .string()
  .trim()
  .refine((value) => value === "" || isValidDateOnly(value), METER_READING_MESSAGES.invalidDate);

// 内訳の 1 行分。name は画面に項目名を出すためだけに持ち、保存にはサーバーが控えた値を使う。
const itemSchema = z.object({
  contractItemId: z.string().min(1),
  name: z.string(),
  amount: optionalNumber(ITEM_AMOUNT_RULE, METER_READING_MESSAGES.itemAmountInvalid),
  quantity: optionalNumber(ITEM_QUANTITY_RULE, METER_READING_MESSAGES.itemQuantityInvalid),
  unitPrice: optionalNumber(ITEM_UNIT_PRICE_RULE, METER_READING_MESSAGES.itemUnitPriceInvalid),
});

// S04 の検針票の入力。使用月の範囲は今日の日付が要るため、ここでは形だけを確かめ、範囲はサービスで確かめる。
export const meterReadingFormSchema = z
  .object({
    usageMonth: z.string().refine(isValidYearMonth, METER_READING_MESSAGES.usageMonthOutOfRange),
    billingMonth: z
      .string()
      .refine(
        (value) => value === "" || isValidYearMonth(value),
        METER_READING_MESSAGES.billingMonthInvalid,
      ),
    contractId: z.string().min(1, METER_READING_MESSAGES.contractRequired),
    amount: z.string().transform((value, context) => {
      if (value.trim() === "") {
        context.addIssue({ code: "custom", message: METER_READING_MESSAGES.amountRequired });
        return z.NEVER;
      }
      const parsed = parseNumberInput(value, AMOUNT_RULE);
      if (parsed === null) {
        context.addIssue({ code: "custom", message: METER_READING_MESSAGES.amountInvalid });
        return z.NEVER;
      }
      return Number(parsed);
    }),
    periodStart: optionalDateOnly,
    periodEnd: optionalDateOnly,
    usage: optionalNumber(USAGE_RULE, METER_READING_MESSAGES.usageInvalid),
    memo: z.string().trim().max(METER_READING_MEMO_MAX_LENGTH, METER_READING_MESSAGES.memoTooLong),
    items: z.array(itemSchema),
  })
  .superRefine((value, context) => {
    // 使用期間は両方とも入っているか、両方とも空かのどちらか。空の側の下に文言を出す。
    const { periodStart, periodEnd } = value;
    if ((periodStart === "") !== (periodEnd === "")) {
      context.addIssue({
        code: "custom",
        path: [periodStart === "" ? "periodStart" : "periodEnd"],
        message: METER_READING_MESSAGES.periodBothRequired,
      });
    } else if (
      periodStart !== "" &&
      isValidDateOnly(periodStart) &&
      isValidDateOnly(periodEnd) &&
      periodEnd < periodStart
    ) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: METER_READING_MESSAGES.periodEndBeforeStart,
      });
    }
    value.items.forEach((item, index) => {
      // 数量か単価だけを入れて金額を空にした行は、その行の金額の下に文言を出す。
      if (item.amount === null && (item.quantity !== null || item.unitPrice !== null)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "amount"],
          message: METER_READING_MESSAGES.itemAmountRequired,
        });
      }
      // 画面では起きないが、改ざんされた入力でも同じ内訳項目を 2 行保存させない。
      if (
        value.items.slice(0, index).some((other) => other.contractItemId === item.contractItemId)
      ) {
        context.addIssue({
          code: "custom",
          path: ["items"],
          message: METER_READING_MESSAGES.itemDuplicate,
        });
      }
    });
  });

// フォームへ渡す、入力チェック前の値の型。
export type MeterReadingInput = z.input<typeof meterReadingFormSchema>;

// 入力チェックを通った後の値の型。
export type MeterReadingParsed = z.output<typeof meterReadingFormSchema>;
