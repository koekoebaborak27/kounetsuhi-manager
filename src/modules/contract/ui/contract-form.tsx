"use client";
// S08 の契約フォーム。入力チェック・重なりの警告・保存中の状態を画面で管理する。
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { createContractAction, deleteContractAction, updateContractAction } from "../actions";
import { findOverlappingContracts, formatContractName } from "../contract-rules";
import type { ContractFormData } from "../types";
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { contractFormSchema } from "../validation";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { DatePicker } from "@/shared/ui/date-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { showActionError } from "@/shared/ui/show-action-error";
import { Textarea } from "@/shared/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { UTILITY_TYPES, UTILITY_TYPE_LABELS } from "@/shared/ui/utility-dot";
import { ContractItemsSection } from "./contract-items-section";

// 「キャンセル」で戻る設定の画面（S07）の URL。
const SETTINGS_PATH = "/settings";

// 必須項目のラベルに付ける印。文字色を薄くして、エラー表示と区別する。
function RequiredLabel({ children }: { children: string }) {
  return (
    <FormLabel>
      {children}
      <span className="text-muted-foreground"> *</span>
    </FormLabel>
  );
}

// S08 の入力欄・警告・内訳項目・保存ボタン。
export function ContractForm({
  data,
  currentYear,
}: {
  data: ContractFormData;
  currentYear: number;
}) {
  const [pending, startTransition] = useTransition();
  // 「キャンセル」で設定の画面へ戻るために使う。
  const router = useRouter();
  // 新規登録では未選択を空文字で持ち、スキーマで保存時に必須として確かめる。
  const defaultUtilityType = data.contract?.utilityType ?? ("" as const);
  const form = useForm({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      utilityType: defaultUtilityType,
      companyName: data.contract?.companyName ?? "",
      planName: data.contract?.planName ?? "",
      startDate: data.contract?.startDate ?? "",
      endDate: data.contract?.endDate ?? "",
      memo: data.contract?.memo ?? "",
      items: data.items,
    },
  });
  // 内訳項目の一覧。追加・並べ替え・外すは画面の中だけで行い、「保存」で契約と一緒に送る。
  const itemsArray = useFieldArray({ control: form.control, name: "items" });
  // 種別を変える確認で、押された種別を覚えておく。null のときは確認を閉じている。
  const [pendingUtilityType, setPendingUtilityType] = useState<UtilityType | null>(null);
  // 種別のボタンが押されたときの動き。内訳項目が 1 件以上あるときは、すぐには変えず確認を出す。
  function handleUtilityTypeChange(value: string, current: string) {
    // 選択中のボタンをもう一度押したときは、未選択に戻さずそのままにする。
    if (!value || value === current) return;
    const next = value as UtilityType;
    if (itemsArray.fields.length > 0) {
      setPendingUtilityType(next);
      return;
    }
    form.setValue("utilityType", next, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  }
  // 確認で「変更する」を押したときは、種別を切り替え、選んだ内訳項目をすべて外す。
  function confirmUtilityTypeChange() {
    if (!pendingUtilityType) return;
    form.setValue("utilityType", pendingUtilityType, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
    itemsArray.replace([]);
    setPendingUtilityType(null);
  }
  // 種別・開始日・終了日が変わるたび、同じ世帯の別の契約との重なりを画面で判定する。
  const [utilityType, startDate, endDate] = useWatch({
    control: form.control,
    name: ["utilityType", "startDate", "endDate"],
  });
  const overlapNames =
    utilityType && startDate
      ? findOverlappingContracts(
          {
            id: data.id ?? "",
            utilityType,
            companyName: "",
            planName: null,
            startDate,
            endDate: endDate || null,
          },
          data.contracts,
        ).map(formatContractName)
      : [];
  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = data.id
        ? await updateContractAction(data.id, values)
        : await createContractAction(values);
      // 種別変更のロックだけは種別の下へ、それ以外の入力チェックは最初の入力欄の下へ出す。
      if (result && !result.ok) {
        const field =
          result.code === "CONTRACT_UTILITY_TYPE_LOCKED" ? "utilityType" : "companyName";
        showActionError(result, form, field, ["VALIDATION_ERROR", "CONTRACT_UTILITY_TYPE_LOCKED"]);
      }
    });
  });
  // 削除の確認を通ったときだけ、契約を消す画面操作を呼ぶ。失敗時は入力中の画面を残し、トーストで知らせる。
  function handleDelete() {
    const id = data.id;
    if (!id) return;
    startTransition(async () => {
      const result = await deleteContractAction(id);
      showActionError(result, form, "companyName", []);
    });
  }
  const yearRange = { from: 2000, to: currentYear + 5 };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 px-4 py-4 lg:px-7">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="utilityType"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>種別</RequiredLabel>
                  <FormControl>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={field.value}
                      onValueChange={(value) => handleUtilityTypeChange(value, field.value)}
                      disabled={data.hasMeterReadings}
                    >
                      {UTILITY_TYPES.map((utilityType) => (
                        <ToggleGroupItem key={utilityType} value={utilityType}>
                          {UTILITY_TYPE_LABELS[utilityType]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </FormControl>
                  {data.hasMeterReadings && (
                    <p className="text-xs text-muted-foreground">
                      検針票が登録済みのため、種別は変更できません。
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>会社名</RequiredLabel>
                  <FormControl>
                    <Input autoComplete="organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="planName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>プラン名</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <RequiredLabel>開始日</RequiredLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="日付を選ぶ"
                        yearRange={yearRange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>終了日</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="空欄＝契約中"
                        yearRange={yearRange}
                        clearLabel="終了日を消す"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {overlapNames.length > 0 && (
              <Alert variant="warning">
                <AlertDescription>
                  同じ種別で契約期間が重なる契約があります（{overlapNames.join("、")}
                  ）。このまま保存もできます。
                </AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メモ</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <section aria-labelledby="contract-items-heading" className="flex flex-col gap-2">
            <h2 id="contract-items-heading" className="text-sm font-bold">
              内訳項目
            </h2>
            {/* 種別を変えると候補とひな形が変わるため、区画ごと作り直してひな形の選択を空に戻す。 */}
            <ContractItemsSection
              key={utilityType}
              utilityType={utilityType}
              itemsArray={itemsArray}
              disabled={pending}
            />
            {/* 画面の操作では起きないが、一覧の入力チェックに通らなかったときの文言をここに出す。 */}
            {form.formState.errors.items?.message && (
              <p className="text-xs text-destructive">{form.formState.errors.items.message}</p>
            )}
          </section>
          {/* 種別を変えると選んだ内訳項目がすべて外れるため、内訳項目があるときだけ確認する。 */}
          <AlertDialog
            open={pendingUtilityType !== null}
            onOpenChange={(open) => !open && setPendingUtilityType(null)}
          >
            {/* 設計書の文言は 1 文だけなので見出しに置き、補足の説明文は付けない。 */}
            <AlertDialogContent size="sm" aria-describedby={undefined}>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  種別を変更すると、選んだ内訳項目がすべて外れます。変更しますか？
                </AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">キャンセル</AlertDialogCancel>
                <AlertDialogAction type="button" onClick={confirmUtilityTypeChange}>
                  変更する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {/* ボタンの並び。スマホでは上から「保存」「契約を削除」「キャンセル」を幅いっぱいに縦に並べる。
            PC では左端に「契約を削除」、右下に「キャンセル」「保存」を同じ幅で横に並べる。 */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <Button type="submit" disabled={pending} className="w-full lg:order-3 lg:w-40">
            保存
          </Button>
          {data.id && (
            <div className="flex flex-col gap-1 lg:order-1 lg:mr-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending || data.hasMeterReadings}
                  >
                    契約を削除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>契約を削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      削除すると元に戻せません。検針票が登録されている契約は削除できません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button" disabled={pending}>
                      キャンセル
                    </AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      variant="destructive"
                      disabled={pending}
                      onClick={handleDelete}
                    >
                      削除する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {data.hasMeterReadings && (
                <p className="text-xs text-muted-foreground">
                  検針票が登録済みのため、契約は削除できません。
                </p>
              )}
            </div>
          )}
          {/* 保存せずに設定の画面へ戻る。設計書どおり、入力内容が失われる確認は出さない。
              保存や削除の処理中は、結果を待つために押せなくする。 */}
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => router.push(SETTINGS_PATH)}
            className="w-full lg:order-2 lg:w-40"
          >
            キャンセル
          </Button>
        </div>
      </form>
    </Form>
  );
}
