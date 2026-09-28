// Better Auth（ログインの仕組み）が出すログを、このアプリのログの形（1 行の JSON・日本語の文言）にそろえて出す。
// Better Auth の文言は英語なので、日本語の文言を message に置き、元の英語は detail に残して調べられるようにする。
import "server-only";
import { log, serializeError, type LogLevel } from "@/shared/observability/logger";

// Better Auth のログの重要度。
type BetterAuthLogLevel = "debug" | "info" | "warn" | "error";

// Better Auth の重要度ごとの、このアプリのログの重要度と日本語の文言。
// このアプリのログには debug が無いので、debug は info として出す。
const LEVELS: Record<BetterAuthLogLevel, { level: LogLevel; message: string }> = {
  debug: { level: "info", message: "ログインの仕組み（Better Auth）が動作の記録を出しました" },
  info: { level: "info", message: "ログインの仕組み（Better Auth）が動作の記録を出しました" },
  warn: { level: "warn", message: "ログインの仕組み（Better Auth）が設定や動作の注意を出しました" },
  error: { level: "error", message: "ログインの仕組み（Better Auth）でエラーが発生しました" },
};

// Better Auth の設定の logger.log に渡す関数。Better Auth がログを出すたびに呼ばれる。
export function logBetterAuth(
  level: BetterAuthLogLevel,
  message: string,
  ...args: unknown[]
): void {
  const { level: appLevel, message: appMessage } = LEVELS[level];
  log(appLevel, appMessage, {
    op: "auth.better-auth",
    detail: message,
    // 添えられた値にエラーが含まれていると、そのままでは JSON で中身が空になるため、名前・文言・発生場所を取り出す。
    ...(args.length > 0 && {
      args: args.map((arg) => (arg instanceof Error ? serializeError(arg) : arg)),
    }),
  });
}
