// サーバーのログを 1 行の JSON で出す。
// Vercel のログ画面で項目ごとに検索できるよう、JSON にしてから console へ書き出す。
import "server-only";
import { AppError } from "../errors/app-error";

// ログの重要度。info は記録、warn は想定内の失敗、error は想定外の失敗に使う。
export type LogLevel = "info" | "warn" | "error";

// ログに添える項目（操作名・エラーの種類など）。
export type LogFields = Record<string, unknown>;

// ログを 1 件出す。message は日本語で書く。
export function log(level: LogLevel, message: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...fields,
  });
  // 重要度に合った console の関数を使うと、Vercel のログ画面でも重要度が区別される。
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

// 入口で受け止めたエラーのログを 1 件出す。
// entry は入口の種類（「画面操作」「API」）、op は操作名（例: "contract.create"）。
// AppError は業務のコードが意図して投げた想定内の失敗なので warn、それ以外は不具合の可能性があるので error にする。
export function logFailure(entry: string, op: string, error: unknown): void {
  if (error instanceof AppError) {
    log("warn", `${entry}で想定内のエラーが発生しました`, {
      op,
      code: error.code,
      httpStatus: error.httpStatus,
      userMessage: error.userMessage,
      context: error.context,
    });
    return;
  }
  log("error", `${entry}で想定外のエラーが発生しました`, {
    op,
    error: serializeError(error),
  });
}

// エラーをログに載せられる形へ変換する。
// Error をそのまま JSON にすると中身が空の {} になるため、名前・文言・発生場所を取り出す。
export function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: String(error) };
}
