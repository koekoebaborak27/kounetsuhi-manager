// 画面操作の失敗を、入力欄の下かトーストに出し分ける関数。世帯の機能のフォームで共通に使う。
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "@/shared/observability/with-action";
import { FIELD_ERROR_CODES } from "../validation";

// 画面操作の結果が失敗なら、文言を出す。成功（または画面が移って結果が無い）ときは何もしない。
// 入力チェックと招待コードの照合の失敗は field の入力欄の下に、通信やサーバーの問題はトーストで知らせる。
// 失敗しても入力内容は消さない（設計書「共通のエラー表示」）。
export function showActionError<T extends FieldValues>(
  result: ActionResult<unknown> | undefined,
  form: UseFormReturn<T>,
  field: Path<T>,
): void {
  if (!result || result.ok) return;
  if (FIELD_ERROR_CODES.includes(result.code)) {
    form.setError(field, { message: result.message });
  } else {
    toast.error(result.message);
  }
}
