"use client";
// S07 設定の「世帯名」の区画。表示と、「変更」を押した後の入力を切り替える（設計書 30_設定.md）。
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { renameHouseholdAction } from "../actions";
import { householdNameFormSchema } from "../validation";
import { showActionError } from "./show-action-error";

// 「世帯名」の区画。name は今の世帯名。
export function HouseholdNameSection({ name }: { name: string }) {
  // 入力欄を出しているかどうか。「変更」で true、「保存」の成功と「キャンセル」で false にする。
  const [editing, setEditing] = useState(false);
  // 保存の処理が終わるまで、ボタンを押せなくする。
  const [pending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(householdNameFormSchema),
    defaultValues: { name },
  });

  // 「変更」を押したら、今の世帯名を入れた入力欄に切り替える。前回のエラーの表示も消す。
  function startEditing() {
    form.reset({ name });
    setEditing(true);
  }

  // 入力チェックを通ったら、保存の画面操作を呼ぶ。
  // 成功したらサーバーが画面のデータを読み直し、新しい世帯名が name に入ってくるので、表示に戻すだけでよい。
  // 失敗したら入力欄のまま、入力内容を残して文言を出す。
  const handleSave = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await renameHouseholdAction({ name: values.name });
      if (result.ok) {
        setEditing(false);
      } else {
        showActionError(result, form, "name");
      }
    });
  });

  return (
    <section aria-labelledby="household-name-heading" className="flex flex-col gap-2">
      <h2 id="household-name-heading" className="text-sm font-bold">
        世帯名
      </h2>
      {editing ? (
        <Form {...form}>
          <form onSubmit={handleSave} noValidate className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  {/* 見出しが同じ「世帯名」なので、ラベルは読み上げ用にだけ置く。 */}
                  <FormLabel className="sr-only">世帯名</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setEditing(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={pending}>
                保存
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="flex items-center gap-2">
          <p className="flex-1 rounded-md border border-input px-3 py-2 text-sm">{name}</p>
          <Button variant="secondary" onClick={startEditing}>
            変更
          </Button>
        </div>
      )}
    </section>
  );
}
