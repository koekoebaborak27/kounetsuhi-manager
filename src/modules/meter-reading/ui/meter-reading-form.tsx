"use client";
// S04 検針票の入力フォーム。入力チェック・契約の選び直し・離れる前の確認・保存中の状態を画面で管理する。
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { splitYearMonth } from "@/shared/date/year-month";
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
import { useLeaveGuard } from "@/shared/ui/leave-guard";
import { MonthPicker } from "@/shared/ui/month-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { showActionError } from "@/shared/ui/show-action-error";
import { Textarea } from "@/shared/ui/textarea";
import { formatUsageMonth } from "@/shared/ui/usage-month";
import { UTILITY_TYPE_LABELS, UTILITY_TYPE_UNITS } from "@/shared/ui/utility-dot";
import {
  createMeterReadingAction,
  deleteMeterReadingAction,
  updateMeterReadingAction,
} from "../actions";
import { hasItemInput, toEmptyItemRows, USAGE_MONTH_MIN } from "../reading-rules";
import type { MeterReadingFormData } from "../types";
import { meterReadingFormSchema, METER_READING_ERROR_CODES } from "../validation";
import { MeterReadingItemsSection } from "./meter-reading-items-section";

// 請求月の選択欄で選べる最初の月。
const BILLING_MONTH_MIN = "2000-01";

// 必須項目のラベルに付ける印。赤色にして、必須の項目だと一目で分かるようにする。
function RequiredLabel({ children }: { children: string }) {
  return (
    <FormLabel>
      {children}
      <span className="text-destructive"> *</span>
    </FormLabel>
  );
}

// 変更できない値の表示欄（種別・作成時の使用月）。入力欄と同じ大きさで、muted の面にする。
function FixedValue({ children }: { children: string }) {
  return <div className="rounded-md border bg-muted px-3 py-2 text-sm">{children}</div>;
}

// 年月を「2026年9月」の形にする。請求月の表示に使う。
function formatBillingMonth(value: string): string {
  const { year, month } = splitYearMonth(value);
  return `${year}年${month}月`;
}

// サーバーから返ったエラーのコードと、文言を出す入力欄の対応。ここに無いコードはトーストで知らせる。
const FIELD_BY_ERROR_CODE = {
  [METER_READING_ERROR_CODES.duplicate]: "usageMonth",
  [METER_READING_ERROR_CODES.usageMonthOutOfRange]: "usageMonth",
  [METER_READING_ERROR_CODES.contractNotFound]: "contractId",
  VALIDATION_ERROR: "amount",
} as const;

// S04 の入力欄・内訳・保存ボタン。
export function MeterReadingForm({ data }: { data: MeterReadingFormData }) {
  const [pending, startTransition] = useTransition();
  // 「キャンセル」で元の画面へ戻るために使う。
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(meterReadingFormSchema),
    defaultValues: data.values,
  });
  // 内訳の行。契約を選び直したときは、選び直した契約の内訳項目で置き換える。
  const itemsArray = useFieldArray({ control: form.control, name: "items" });
  // 入力を変えた後は、タブで移るとき・再読み込みするときに確認を出す。保存中は画面が切り替わるので出さない。
  useLeaveGuard(form.formState.isDirty && !pending);
  // 契約を選び直す確認で、選ばれた契約の ID を覚えておく。null のときは確認を閉じている。
  const [pendingContractId, setPendingContractId] = useState<string | null>(null);
  const utilityLabel = UTILITY_TYPE_LABELS[data.utilityType];
  const hasContracts = data.contracts.length > 0;
  // 内訳の文言（契約を選んでいるかどうか）の出し分けに使う。
  const contractId = useWatch({ control: form.control, name: "contractId" });

  // 契約を変え、選んだ契約の内訳項目を表示順に並べ直す。入力した内訳の値は消える。
  function applyContract(nextId: string) {
    form.setValue("contractId", nextId, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
    const contract = data.contracts.find((item) => item.id === nextId);
    itemsArray.replace(toEmptyItemRows(contract?.items ?? []));
  }

  // 契約の選択が変わったときの動き。内訳に入力済みの値があるときは、すぐには変えず確認を出す。
  function handleContractChange(nextId: string, currentId: string) {
    if (nextId === currentId) return;
    if (hasItemInput(form.getValues("items"))) {
      setPendingContractId(nextId);
      return;
    }
    applyContract(nextId);
  }

  // 確認で「変更する」を押したときは、契約を変えて内訳を並べ直す。
  function confirmContractChange() {
    if (pendingContractId === null) return;
    applyContract(pendingContractId);
    setPendingContractId(null);
  }

  // 保存の画面操作を呼ぶ。入力チェックを通ったときだけ呼ばれ、サーバーでは入力前の値からもう一度確かめる。
  const handleSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = data.id
        ? await updateMeterReadingAction(data.id, values)
        : await createMeterReadingAction(data.utilityType, values);
      // 使用月の重なり・範囲は使用月の下へ、契約の誤りは契約の下へ出し、それ以外（通信など）はトーストで知らせる。
      if (result && !result.ok) {
        const field =
          FIELD_BY_ERROR_CODE[result.code as keyof typeof FIELD_BY_ERROR_CODE] ?? "amount";
        showActionError(result, form, field, Object.keys(FIELD_BY_ERROR_CODE));
      }
    });
  });

  // 削除の確認を通ったときだけ、検針票を消す画面操作を呼ぶ。失敗時は入力中の画面を残し、トーストで知らせる。
  function handleDelete() {
    const id = data.id;
    if (!id) return;
    startTransition(async () => {
      const result = await deleteMeterReadingAction(id);
      showActionError(result, form, "amount", []);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 px-4 py-4 lg:px-7">
        {/* スマホでは上から「基本の項目・内訳・メモ」、PC では左に基本の項目とメモ、右に内訳を並べる。 */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-x-10">
          <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  種別<span className="text-destructive"> *</span>
                </span>
                <FixedValue>{utilityLabel}</FixedValue>
              </div>
              <FormField
                control={form.control}
                name="usageMonth"
                render={({ field }) => (
                  <FormItem>
                    <RequiredLabel>使用月</RequiredLabel>
                    {/* 作成では変更できない表示だけ、編集では年月を選び直せる。 */}
                    {data.id ? (
                      <FormControl>
                        <MonthPicker
                          value={field.value}
                          onChange={field.onChange}
                          min={USAGE_MONTH_MIN}
                          max={data.usageMonthMax}
                          placeholder="使用月を選ぶ"
                          format={(value) =>
                            formatUsageMonth(data.utilityType, value, { withYear: true })
                          }
                          disabled={pending}
                        />
                      </FormControl>
                    ) : (
                      <FixedValue>
                        {formatUsageMonth(data.utilityType, field.value, { withYear: true })}
                      </FixedValue>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="billingMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>請求月</FormLabel>
                  <FormControl>
                    <MonthPicker
                      value={field.value}
                      onChange={field.onChange}
                      min={BILLING_MONTH_MIN}
                      max={data.billingMonthMax}
                      placeholder="未選択"
                      format={formatBillingMonth}
                      clearable
                      disabled={pending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>契約</RequiredLabel>
                  {hasContracts ? (
                    <Select
                      value={field.value}
                      onValueChange={(value) => handleContractChange(value, field.value)}
                      disabled={pending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="契約を選ぶ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {data.contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {utilityLabel}
                      の契約が登録されていません。設定から契約を登録してください。
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>請求額（税込）</RequiredLabel>
                  <div className="flex items-center gap-1">
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        autoComplete="off"
                        className="text-right"
                        disabled={pending}
                        {...field}
                      />
                    </FormControl>
                    <span className="text-sm text-muted-foreground">円</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">使用期間</legend>
              <div className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name="periodStart"
                  render={({ field }) => (
                    <FormItem className="min-w-0 flex-1">
                      <FormLabel className="sr-only">使用期間の開始日</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="開始日"
                          yearRange={{ from: 2000, to: splitYearMonth(data.billingMonthMax).year }}
                          clearLabel="開始日を消す"
                          disabled={pending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span className="pt-2 text-sm">〜</span>
                <FormField
                  control={form.control}
                  name="periodEnd"
                  render={({ field }) => (
                    <FormItem className="min-w-0 flex-1">
                      <FormLabel className="sr-only">使用期間の終了日</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="終了日"
                          yearRange={{ from: 2000, to: splitYearMonth(data.billingMonthMax).year }}
                          clearLabel="終了日を消す"
                          disabled={pending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </fieldset>
            <FormField
              control={form.control}
              name="usage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>使用量</FormLabel>
                  <div className="flex items-center gap-1">
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        autoComplete="off"
                        className="text-right"
                        disabled={pending}
                        {...field}
                      />
                    </FormControl>
                    <span className="w-8 text-sm text-muted-foreground">
                      {UTILITY_TYPE_UNITS[data.utilityType]}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <section
            aria-labelledby="meter-reading-items-heading"
            className="flex flex-col gap-2 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
            <h2 id="meter-reading-items-heading" className="text-sm font-bold">
              内訳
            </h2>
            <MeterReadingItemsSection
              control={form.control}
              fields={itemsArray.fields}
              hasContract={contractId !== ""}
              disabled={pending}
            />
            {/* 画面の操作では起きないが、内訳の一覧の入力チェックに通らなかったときの文言をここに出す。 */}
            {form.formState.errors.items?.message && (
              <p className="text-xs text-destructive">{form.formState.errors.items.message}</p>
            )}
          </section>
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem className="lg:col-start-1 lg:row-start-2">
                <FormLabel>メモ</FormLabel>
                <FormControl>
                  <Textarea disabled={pending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* 契約を選び直すと入力した内訳が消えるため、内訳に入力済みの値があるときだけ確認する。 */}
        <AlertDialog
          open={pendingContractId !== null}
          onOpenChange={(open) => !open && setPendingContractId(null)}
        >
          {/* 設計書の文言は 1 文だけなので見出しに置き、補足の説明文は付けない。 */}
          <AlertDialogContent size="sm" aria-describedby={undefined}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                契約を変更すると、入力した内訳が消えます。変更しますか？
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">キャンセル</AlertDialogCancel>
              <AlertDialogAction type="button" onClick={confirmContractChange}>
                変更する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* ボタンの並び。スマホでは「キャンセル」「保存」を同じ幅で横に並べ、その下に「検針票を削除」（編集時だけ）を幅いっぱいに置く。
            PC では左下に「検針票を削除」、右下に「キャンセル」「保存」を 160px 前後で並べる。 */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="flex gap-3 lg:order-2 lg:ml-auto">
            {/* 保存せずに元の画面へ戻る。設計書どおり、入力内容が失われる確認は出さない。 */}
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => router.push(data.cancelHref)}
              className="flex-1 lg:w-40 lg:flex-none"
            >
              キャンセル
            </Button>
            {/* 同じ種別の契約が無いときは保存できない。保存中は二重に送らないよう押せなくする。 */}
            <Button
              type="submit"
              disabled={pending || !hasContracts}
              className="flex-1 lg:w-40 lg:flex-none"
            >
              保存
            </Button>
          </div>
          {data.id && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  className="lg:order-1"
                >
                  検針票を削除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>検針票を削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>削除すると元に戻せません。</AlertDialogDescription>
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
          )}
        </div>
      </form>
    </Form>
  );
}
