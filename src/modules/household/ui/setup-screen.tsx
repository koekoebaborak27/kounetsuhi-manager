"use client";
// S02 初回設定の画面。招待コードで家族の世帯に参加するか、世帯を新しく作る（設計書 20_初回設定.md）。
// スマホでは画面いっぱいに、PC では中央に幅 400px のカードで表示する。タブやメニューは出さない。
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { PageTitle } from "@/shared/ui/page-title";
import { createHouseholdAction, joinHouseholdAction } from "../actions";
import {
  householdNameFormSchema,
  joinHouseholdSchema,
  type HouseholdNameInput,
  type JoinHouseholdInput,
} from "../validation";
import { showActionError } from "./show-action-error";

// S02 初回設定の画面。
export function SetupScreen() {
  // 参加と作成のどちらかを押してから処理が終わるまで、両方のボタンを押せなくする（二重に参加・作成しないため）。
  // 成功したときはホームへ移り終わるまで処理中のままになるので、移る途中で押し直されることもない。
  const [pending, startTransition] = useTransition();

  // 「参加する」と「世帯を作成」は別々のフォームにして、押したほうの入力欄だけをチェックする。
  // 入力前の値の型と、チェックを通った後の値の型（招待コードは 8 文字に、世帯名は前後の空白を除いた形に整う）は、スキーマから決まる。
  const joinForm = useForm({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: { inviteCode: "" } satisfies JoinHouseholdInput,
  });
  const createForm = useForm({
    resolver: zodResolver(householdNameFormSchema),
    defaultValues: { name: "" } satisfies HouseholdNameInput,
  });

  // 入力チェックを通ったら、参加の画面操作を呼ぶ。サーバーでも同じチェックと整える処理をもう一度行う。
  const handleJoin = joinForm.handleSubmit((values) => {
    startTransition(async () => {
      const result = await joinHouseholdAction({ inviteCode: values.inviteCode });
      showActionError(result, joinForm, "inviteCode");
    });
  });

  // 入力チェックを通ったら、世帯を作る画面操作を呼ぶ。
  const handleCreate = createForm.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createHouseholdAction({ name: values.name });
      showActionError(result, createForm, "name");
    });
  });

  return (
    <div className="min-h-dvh lg:flex lg:items-center lg:justify-center lg:bg-sidebar">
      <div className="lg:w-100 lg:overflow-hidden lg:rounded-lg lg:border lg:bg-card">
        <PageTitle>初回設定</PageTitle>
        <main className="flex flex-col px-4 py-4 text-sm lg:px-6 lg:py-6">
          <p>家族から招待コードを受け取った場合は、入力して参加してください。</p>

          <Form {...joinForm}>
            <form onSubmit={handleJoin} noValidate className="mt-4 flex flex-col gap-3">
              <FormField
                control={joinForm.control}
                name="inviteCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>招待コード</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例：K7Q2-9XMA"
                        autoComplete="off"
                        autoCapitalize="characters"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={pending}>
                参加する
              </Button>
            </form>
          </Form>

          <p className="my-5 text-center text-xs text-muted-foreground">または</p>

          <Form {...createForm}>
            <form onSubmit={handleCreate} noValidate className="flex flex-col gap-3">
              <h2>新しく世帯を作成する</h2>
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>世帯名</FormLabel>
                    <FormControl>
                      <Input placeholder="例：山田家" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={pending}
              >
                世帯を作成
              </Button>
            </form>
          </Form>
        </main>
      </div>
    </div>
  );
}
