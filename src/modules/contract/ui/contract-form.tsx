"use client";
// S08 の契約フォーム。入力チェック・重なりの警告・保存中の状態を画面で管理する。
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { ja } from "react-day-picker/locale";
import { createContractAction, deleteContractAction, updateContractAction } from "../actions";
import { findOverlappingContracts, formatContractName } from "../contract-rules";
import type { ContractFormData } from "../types";
import { contractFormSchema } from "../validation";
import { dateOnlyToLocalDate, formatDateOnly, localDateToDateOnly } from "@/shared/date/date-only";
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
import { Calendar } from "@/shared/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { showActionError } from "@/shared/ui/show-action-error";
import { Textarea } from "@/shared/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { UTILITY_TYPES, UTILITY_TYPE_LABELS } from "@/shared/ui/utility-dot";

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

// 日付入力とカレンダーを結ぶ部品。空の終了日は「空欄＝契約中」を表示する。
function DatePicker({
  value,
  onChange,
  placeholder,
  yearRange,
  clearable = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  yearRange: { from: number; to: number };
  clearable?: boolean;
}) {
  const startMonth = new Date(yearRange.from, 0, 1);
  const endMonth = new Date(yearRange.to, 11, 1);
  return (
    <div className="flex gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between font-normal">
            <span className={value ? "" : "text-muted-foreground"}>
              {value ? formatDateOnly(value) : placeholder}
            </span>
            <CalendarIcon aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? dateOnlyToLocalDate(value) : undefined}
            onSelect={(date) => date && onChange(localDateToDateOnly(date))}
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            locale={ja}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="終了日を消す"
          onClick={() => onChange("")}
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  );
}

// S08 の入力欄・警告・保存ボタン。内訳項目は②で作るまで準備中の表示にする。
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
    },
  });
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
                      onValueChange={(value) => value && field.onChange(value)}
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
                        clearable
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
            <p className="text-sm text-muted-foreground">準備中です。</p>
          </section>
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
