// API（Route Handler）の入口を包み、エラーのログと応答の返し方をまとめて受け持つ。
// 業務のコードは try/catch やログを書かず、失敗したら AppError を throw するだけにする。
import "server-only";
import { unstable_rethrow } from "next/navigation";
import { AppError } from "../errors/app-error";
import { logFailure } from "./logger";

// 想定外のエラーのときに返す文言。
export const UNEXPECTED_ROUTE_ERROR_MESSAGE =
  "処理できませんでした。時間をおいてもう一度お試しください。";

// API の関数を包んで、失敗したときに JSON のエラー応答を返す関数にする。
// 失敗時の応答は { error: { code, message } } の形で、HTTP ステータスは AppError の httpStatus（想定外なら 500）にする。
// op はログで操作を見分けるための名前（例: "keepalive.ping"）。
export function withRoute<Args extends unknown[]>(
  op: string,
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      // redirect() や notFound() は Next.js が応答を切り替えるために投げる合図なので、受け止めずにそのまま投げ直す。
      unstable_rethrow(error);
      // ログは入口のここで 1 回だけ出す。
      logFailure("API", op, error);
      // AppError は業務のコードが決めたステータスと文言で返す。
      if (error instanceof AppError) {
        return Response.json(
          { error: { code: error.code, message: error.userMessage } },
          { status: error.httpStatus },
        );
      }
      // 想定外のエラーは中身を返さず、共通の文言だけを返す。
      return Response.json(
        { error: { code: "INTERNAL_ERROR", message: UNEXPECTED_ROUTE_ERROR_MESSAGE } },
        { status: 500 },
      );
    }
  };
}
