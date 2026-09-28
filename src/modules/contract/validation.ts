// 契約の入力チェック。画面とサーバーで同じスキーマを使い、保存する文字列もここで整える。
import { z } from "zod";
import { isValidDateOnly } from "@/shared/date/date-only";

// 各文字入力の上限。
export const CONTRACT_COMPANY_NAME_MAX_LENGTH = 30;
export const CONTRACT_PLAN_NAME_MAX_LENGTH = 30;
export const CONTRACT_MEMO_MAX_LENGTH = 200;

// 契約の入力チェックで表示する文言。
export const CONTRACT_MESSAGES = {
  utilityTypeRequired: "種別を選択してください。",
  companyNameRequired: "会社名を入力してください。",
  companyNameTooLong: "会社名は30文字以内で入力してください。",
  planNameTooLong: "プラン名は30文字以内で入力してください。",
  startDateRequired: "開始日を入力してください。",
  invalidDate: "正しい日付を入力してください。",
  endDateBeforeStart: "終了日は開始日以降の日付を入力してください。",
  memoTooLong: "メモは200文字以内で入力してください。",
  utilityTypeLocked: "検針票が登録済みのため、種別は変更できません。",
} as const;

// 空の任意入力は、画面操作で null が渡っても空文字にそろえる。編集済みの古い値や未入力欄で英語の型エラーを出さないため。
const optionalTrimmedString = (max: number, message: string) =>
  z
    .union([z.string(), z.null()])
    .transform((value) => value ?? "")
    .pipe(z.string().trim().max(max, message));

// YYYY-MM-DD の必須日付。空と日付の誤りを別々の文言にする。
const requiredDateOnly = z
  .string()
  .trim()
  .min(1, CONTRACT_MESSAGES.startDateRequired)
  .refine(isValidDateOnly, CONTRACT_MESSAGES.invalidDate);

// YYYY-MM-DD の任意日付。空なら null にする。
const optionalDateOnly = z
  .union([z.string(), z.null()])
  .transform((value) => value ?? "")
  .pipe(
    z
      .string()
      .trim()
      .refine((value) => value === "" || isValidDateOnly(value), CONTRACT_MESSAGES.invalidDate),
  );

// S08 の契約の項目。
export const contractFormSchema = z
  .object({
    utilityType: z
      .enum(["ELECTRICITY", "GAS", "WATER", ""])
      .refine((value) => value !== "", CONTRACT_MESSAGES.utilityTypeRequired),
    companyName: z
      .string()
      .trim()
      .min(1, CONTRACT_MESSAGES.companyNameRequired)
      .max(CONTRACT_COMPANY_NAME_MAX_LENGTH, CONTRACT_MESSAGES.companyNameTooLong),
    planName: optionalTrimmedString(
      CONTRACT_PLAN_NAME_MAX_LENGTH,
      CONTRACT_MESSAGES.planNameTooLong,
    ),
    startDate: requiredDateOnly,
    endDate: optionalDateOnly,
    memo: optionalTrimmedString(CONTRACT_MEMO_MAX_LENGTH, CONTRACT_MESSAGES.memoTooLong),
  })
  .superRefine((value, context) => {
    if (
      value.endDate !== "" &&
      value.startDate &&
      isValidDateOnly(value.startDate) &&
      value.endDate < value.startDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: CONTRACT_MESSAGES.endDateBeforeStart,
      });
    }
  });

// フォームへ渡す、入力チェック前の値の型。
export type ContractInput = z.input<typeof contractFormSchema>;
