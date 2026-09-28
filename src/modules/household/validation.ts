// 世帯の機能の入力チェック（zod のスキーマ）。
// 画面（react-hook-form）とサーバー（service）の両方で同じスキーマを使い、チェックの内容を 1 か所にまとめる。
// 文言は設計書「20_初回設定.md」「30_設定.md」の「入力チェック」に合わせる。
import { z } from "zod";
import { isInvitationCodeShape, normalizeInvitationCode } from "./invitation-code";

// 世帯名の最大の文字数。
export const HOUSEHOLD_NAME_MAX_LENGTH = 20;

// 招待コードの入力チェックで出す文言。DB での照合（見つからない・使用済み・期限切れ）の文言もここにまとめる。
export const INVITATION_MESSAGES = {
  required: "招待コードを入力してください。",
  notFound: "招待コードが見つかりません。入力した内容を確認してください。",
  used: "この招待コードはすでに使われています。家族に新しいコードを発行してもらってください。",
  expired: "この招待コードは有効期限が切れています。家族に新しいコードを発行してもらってください。",
} as const;

// サーバーから返ったエラーのうち、入力欄の下に出すものの種類（AppError の code）。
// 入力チェックと招待コードの照合の失敗がこれにあたる。ほかの失敗（通信やサーバーの問題）はトーストで知らせる。
export const FIELD_ERROR_CODES: readonly string[] = [
  "VALIDATION_ERROR",
  "INVITATION_NOT_FOUND",
  "INVITATION_USED",
  "INVITATION_EXPIRED",
];

// 世帯名の入力チェックで出す文言。
export const HOUSEHOLD_NAME_MESSAGES = {
  required: "世帯名を入力してください。",
  tooLong: `世帯名は${HOUSEHOLD_NAME_MAX_LENGTH}文字以内で入力してください。`,
} as const;

// 世帯名。前後の空白を除いてから、1〜20 文字かを確かめる。チェックを通った値は前後の空白を除いたものになる。
export const householdNameSchema = z
  .string()
  .trim()
  .min(1, HOUSEHOLD_NAME_MESSAGES.required)
  .max(HOUSEHOLD_NAME_MAX_LENGTH, HOUSEHOLD_NAME_MESSAGES.tooLong);

// 招待コード。ハイフンや空白を取り除いて大文字にしてから、空でないこと・使える文字の 8 文字であることを確かめる。
// チェックを通った値は、DB と照合できる 8 文字の形になる。
export const invitationCodeSchema = z
  .string()
  .transform(normalizeInvitationCode)
  .pipe(
    z
      .string()
      // 空のときは「入力してください」だけを出したいので、ここで止めて次の形のチェックへ進ませない。
      .min(1, { error: INVITATION_MESSAGES.required, abort: true })
      .refine(isInvitationCodeShape, INVITATION_MESSAGES.notFound),
  );

// S02「参加する」のフォーム。
export const joinHouseholdSchema = z.object({ inviteCode: invitationCodeSchema });

// S02「世帯を作成」と S07「世帯名の保存」のフォーム。
export const householdNameFormSchema = z.object({ name: householdNameSchema });

// フォームに入力された値の型（チェックの前）。
export type JoinHouseholdInput = z.input<typeof joinHouseholdSchema>;
export type HouseholdNameInput = z.input<typeof householdNameFormSchema>;
