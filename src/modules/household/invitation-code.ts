// 招待コードの生成・入力の整え方・表示の形をまとめた関数。DB や画面には触れない。
// 決まりは設計書「00_認証と世帯共通.md」の「招待コード」に従う。

// 招待コードに使う 32 文字。英大文字と数字から、見分けにくい 0・O・1・I を除いている。
export const INVITATION_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// 招待コードの文字数。DB にはハイフンを除いたこの長さで保存する。
export const INVITATION_CODE_LENGTH = 8;

// 招待コードの有効期間（日数）。発行した時刻からこの日数後まで使える。
export const INVITATION_VALID_DAYS = 7;

// 使える文字だけで 8 文字になっているかを確かめるための形。
const CODE_SHAPE = new RegExp(`^[${INVITATION_CODE_CHARS}]{${INVITATION_CODE_LENGTH}}$`);

// 招待コードを 1 つ作る。
// randomInt は 0 以上 max 未満の整数を返す関数。偏りの無い乱数を使うため、呼び出し側から node:crypto の randomInt を渡す。
export function generateInvitationCode(randomInt: (max: number) => number): string {
  let code = "";
  for (let i = 0; i < INVITATION_CODE_LENGTH; i++) {
    code += INVITATION_CODE_CHARS[randomInt(INVITATION_CODE_CHARS.length)];
  }
  return code;
}

// 入力された招待コードを、DB と照合できる形に整える。
// 前後の空白とハイフンを取り除き、英小文字を大文字にする（「k7q2-9xma」→「K7Q29XMA」）。
// ハイフンは 4 文字目の後ろにも入るので、前後だけでなくすべて取り除く。
export function normalizeInvitationCode(input: string): string {
  return input.replaceAll("-", "").trim().toUpperCase();
}

// 整えた後の招待コードが、使える文字だけの 8 文字になっているかを返す。
export function isInvitationCodeShape(normalized: string): boolean {
  return CODE_SHAPE.test(normalized);
}

// DB に保存した 8 文字のコードを、画面に出す「K7Q2-9XMA」の形にする。
export function formatInvitationCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// 発行した時刻から、招待コードの有効期限を求める。
export function invitationExpiresAt(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000);
}
