"use client";
// S04 の内訳の区画。各行に金額・数量・単価の入力欄を並べ、内訳の合計と、請求額と合わないときの警告を出す。
import type { Control, FieldArrayWithId } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { formatYen } from "@/shared/format/amount";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { checkItemTotal } from "../reading-rules";
import type { MeterReadingInput, MeterReadingParsed } from "../validation";

// 行の並び。スマホでは「項目名・金額」の下に「数量・単価」を並べ、PC では 4 列の表にする。
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_9rem] gap-x-2 lg:grid-cols-[minmax(0,1fr)_8rem_6rem_7rem]";

// 内訳の区画。行は親のフォームの items を useFieldArray で持ち、ここでは表示と入力だけを受け持つ。
export function MeterReadingItemsSection({
  control,
  fields,
  hasContract,
  disabled,
}: {
  control: Control<MeterReadingInput, unknown, MeterReadingParsed>;
  fields: FieldArrayWithId<MeterReadingInput, "items">[];
  hasContract: boolean;
  disabled: boolean;
}) {
  // 請求額と内訳の金額が変わるたびに、合計と不一致の判定をやり直す。
  const [amount, items] = useWatch({ control, name: ["amount", "items"] });
  const { total, billed, mismatched } = checkItemTotal(amount, items);

  return (
    <div className="flex flex-col gap-2">
      {fields.length === 0 ? (
        // 契約を選んでいないときは行が無いのが当たり前なので、文言は契約を選んでいるときだけ出す。
        hasContract && (
          <p className="text-sm text-muted-foreground">この契約には内訳項目が選ばれていません。</p>
        )
      ) : (
        <div>
          {/* PC だけ列の見出しを出す。スマホでは各入力欄の横に「数量」「単価」を出す。 */}
          <div
            aria-hidden
            className={`${ROW_GRID} hidden border-b pb-2 text-xs text-muted-foreground lg:grid`}
          >
            <span>項目</span>
            <span>金額</span>
            <span>数量</span>
            <span>単価</span>
          </div>
          <ul>
            {fields.map((field, index) => (
              <li key={field.id} className={`${ROW_GRID} items-start gap-y-1 border-b py-2`}>
                <span className="pt-2 text-sm break-words">{field.name}</span>
                <FormField
                  control={control}
                  name={`items.${index}.amount`}
                  render={({ field: input }) => (
                    <FormItem className="gap-1">
                      <FormLabel className="sr-only">{field.name}の金額</FormLabel>
                      <div className="flex items-center gap-1">
                        <FormControl>
                          {/* 割引は負の数を入れるため、マイナスを打てる通常のキーボードを出す。 */}
                          <Input
                            className="text-right"
                            autoComplete="off"
                            disabled={disabled}
                            {...input}
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground">円</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* スマホでは 2 行目に 2 つを横に並べ、PC では表の列にそのまま並べる。 */}
                <div className="col-span-2 flex gap-2 lg:contents">
                  <FormField
                    control={control}
                    name={`items.${index}.quantity`}
                    render={({ field: input }) => (
                      <FormItem className="flex-1 gap-1">
                        <div className="flex items-center gap-1">
                          <FormLabel className="shrink-0 text-xs text-muted-foreground lg:sr-only">
                            数量
                          </FormLabel>
                          <FormControl>
                            <Input
                              inputMode="decimal"
                              placeholder="任意"
                              autoComplete="off"
                              className="h-8 text-right"
                              disabled={disabled}
                              aria-label={`${field.name}の数量`}
                              {...input}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`items.${index}.unitPrice`}
                    render={({ field: input }) => (
                      <FormItem className="flex-1 gap-1">
                        <div className="flex items-center gap-1">
                          <FormLabel className="shrink-0 text-xs text-muted-foreground lg:sr-only">
                            単価
                          </FormLabel>
                          <FormControl>
                            {/* 単価も負の数があり得るため、通常のキーボードを出す。 */}
                            <Input
                              placeholder="任意"
                              autoComplete="off"
                              className="h-8 text-right"
                              disabled={disabled}
                              aria-label={`${field.name}の単価`}
                              {...input}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center justify-between py-1 text-sm">
        <span className="font-bold">内訳の合計</span>
        <span className="font-bold">{formatYen(total)}</span>
      </div>
      {/* 保存は止めない警告。金額を入れ直すたびに出し直す。 */}
      {mismatched && billed !== null && (
        <Alert variant="warning">
          <AlertDescription>
            内訳の合計（{formatYen(total)}）が請求額（{formatYen(billed)}
            ）と一致しません。このまま保存もできます。
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
