// 業務のコードが「想定内の失敗」を知らせるためのエラー。
// 業務のコードは try/catch やログを書かず、これを throw するだけにする。
// ログを出すことと画面・API への返し方は、入口のラッパー（shared/observability）がまとめて行う。
export class AppError extends Error {
  constructor(
    // 失敗の種類を表すキー。検索しやすいよう、大文字の英語で書く（例: NOT_FOUND）。
    readonly code: string,
    // API で返すときの HTTP ステータス。
    readonly httpStatus: number,
    // 画面に出す文言。利用者が読むので、平易な日本語で書く。
    readonly userMessage: string,
    // 調査のためにログへ残す補足情報（対象の ID など）。画面には出さない。
    readonly context?: Record<string, unknown>,
  ) {
    super(`${code}: ${userMessage}`);
    this.name = "AppError";
  }
}

// よく使う失敗の種類ごとに AppError を作る関数をまとめたもの。
// 文言は省略すると既定の文言になる。場面に合った文言があれば引数で渡す。
export const Errors = {
  // 世帯のデータに無い ID を開いたときなど、対象が見つからない。文言は設計書「共通のエラー表示」に合わせる。
  NOT_FOUND: (userMessage = "データが見つかりません。", context?: Record<string, unknown>) =>
    new AppError("NOT_FOUND", 404, userMessage, context),
  // ログインしていない。
  UNAUTHORIZED: (userMessage = "ログインしてください。", context?: Record<string, unknown>) =>
    new AppError("UNAUTHORIZED", 401, userMessage, context),
  // ログインはしているが、その操作をしてよい立場ではない。
  FORBIDDEN: (userMessage = "この操作は行えません。", context?: Record<string, unknown>) =>
    new AppError("FORBIDDEN", 403, userMessage, context),
  // 入力内容に誤りがある。
  VALIDATION_ERROR: (
    userMessage = "入力内容を確認してください。",
    context?: Record<string, unknown>,
  ) => new AppError("VALIDATION_ERROR", 400, userMessage, context),
  // すでに同じデータがあるなど、今のデータの状態と食い違っている。
  CONFLICT: (
    userMessage = "ほかの操作と重なったため、処理できませんでした。画面を再読み込みしてください。",
    context?: Record<string, unknown>,
  ) => new AppError("CONFLICT", 409, userMessage, context),
};
