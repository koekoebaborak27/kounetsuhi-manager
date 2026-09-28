// 画面操作（Server Action）の入口を包み、エラーのログと画面への返し方をまとめて受け持つ。
// 業務のコードは try/catch やログを書かず、失敗したら AppError を throw するだけにする。
import "server-only";
import { unstable_rethrow } from "next/navigation";
import { AppError } from "../errors/app-error";
import { logFailure } from "./logger";

// 想定外のエラーのときに画面へ出す文言。画面操作は保存などの更新が中心なので、設計書「共通のエラー表示」の更新失敗の文言を使う。
export const UNEXPECTED_ACTION_ERROR_MESSAGE =
  "保存できませんでした。通信状態を確認して、もう一度お試しください。";

// 画面操作の結果。成功ならデータを、失敗なら画面に出す文言を返す。
// Next.js は本番で throw されたエラーの文言を画面側へ渡さないため、失敗も return で返す。
export type ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

// 画面操作の関数を包んで、失敗しても例外を画面側へ投げず ActionResult で返す関数にする。
// op はログで操作を見分けるための名前（例: "contract.create"）。
export function withAction<Args extends unknown[], T>(
  op: string,
  action: (...args: Args) => Promise<T>,
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args: Args) => {
    try {
      return { ok: true, data: await action(...args) };
    } catch (error) {
      // redirect() や notFound() は Next.js が画面を切り替えるために投げる合図なので、受け止めずにそのまま投げ直す。
      unstable_rethrow(error);
      // ログは入口のここで 1 回だけ出す。
      logFailure("画面操作", op, error);
      // AppError は業務のコードが用意した文言をそのまま画面に出す。
      if (error instanceof AppError) {
        return { ok: false, code: error.code, message: error.userMessage };
      }
      // 想定外のエラーは中身を画面に出さず、共通の文言だけを返す。
      return { ok: false, code: "INTERNAL_ERROR", message: UNEXPECTED_ACTION_ERROR_MESSAGE };
    }
  };
}
