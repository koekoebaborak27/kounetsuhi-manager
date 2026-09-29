// 契約の入力チェック。画面とサーバーで同じスキーマを使い、保存する文字列もここで整える。
import { z } from "zod";
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { isValidDateOnly } from "@/shared/date/date-only";
import { ITEM_CATEGORIES } from "./item-catalog";
import { findCustomItemNameProblem } from "./item-rules";

// 各文字入力の上限。
export const CONTRACT_COMPANY_NAME_MAX_LENGTH = 30;
export const CONTRACT_PLAN_NAME_MAX_LENGTH = 30;
export const CONTRACT_MEMO_MAX_LENGTH = 200;
export const CONTRACT_ITEM_NAME_MAX_LENGTH = 30;

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
  itemNameRequired: "項目名を入力してください。",
  itemNameTooLong: "項目名は30文字以内で入力してください。",
  itemNameDuplicate: "同じ名前の項目がすでにあります。",
  itemNameIsCandidate: "候補にある項目です。候補から追加してください。",
  itemCategoryRequired: "分類を選択してください。",
} as const;

// 内訳項目の項目名。前後の空白を除いて 1〜30 文字。
const itemName = z
  .string()
  .trim()
  .min(1, CONTRACT_MESSAGES.itemNameRequired)
  .max(CONTRACT_ITEM_NAME_MAX_LENGTH, CONTRACT_MESSAGES.itemNameTooLong);

// 保存する内訳項目の 1 件分。画面の一覧の並び順のまま配列で受け取る。
const contractItemSchema = z.object({
  name: itemName,
  category: z.enum(ITEM_CATEGORIES),
  isCustom: z.boolean(),
});

// 「その他」の「追加」を押したときの入力チェック。
// 一覧との重なり・候補との重なりは一覧と種別が要るため、画面で findCustomItemNameProblem を使って確かめる。
export const customItemSchema = z.object({
  name: itemName,
  category: z
    .enum([...ITEM_CATEGORIES, ""])
    .refine((value) => value !== "", CONTRACT_MESSAGES.itemCategoryRequired),
});

// 「その他」の入力欄へ渡す、入力チェック前の値の型。
export type CustomItemInput = z.input<typeof customItemSchema>;

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
    items: z.array(contractItemSchema),
  })
  .superRefine((value, context) => {
    // 画面では起きないが、改ざんされた入力でも同じ名前の項目や、候補と同じ名前の「その他」を保存させない。
    // 種別が未選択でもほかの項目のチェックは続くため、未選択の空文字も考えて扱う。
    const utilityType: string = value.utilityType;
    value.items.forEach((item, index) => {
      const before = value.items.slice(0, index);
      const problem =
        item.isCustom && utilityType !== ""
          ? findCustomItemNameProblem(utilityType as UtilityType, item.name, before)
          : before.some((other) => other.name === item.name)
            ? "duplicate"
            : null;
      if (problem) {
        context.addIssue({
          code: "custom",
          path: ["items"],
          message:
            problem === "duplicate"
              ? CONTRACT_MESSAGES.itemNameDuplicate
              : CONTRACT_MESSAGES.itemNameIsCandidate,
        });
      }
    });
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
