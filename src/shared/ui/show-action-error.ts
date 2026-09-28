// 画面操作の失敗を、入力欄の下かトーストに出し分ける関数。フォームごとの入力エラーコードを呼び出し側から受け取る。
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "@/shared/observability/with-action";

// 画面操作の失敗を表示する。入力内容の誤りは指定した入力欄の下、それ以外はトーストで知らせる。
export function showActionError<T extends FieldValues>(
  result: ActionResult<unknown> | undefined,
  form: UseFormReturn<T>,
  field: Path<T>,
  fieldErrorCodes: readonly string[],
): void {
  if (!result || result.ok) return;
  if (fieldErrorCodes.includes(result.code)) {
    form.setError(field, { message: result.message });
  } else {
    toast.error(result.message);
  }
}
