// S06 グラフの年間タブ。今年の合計・前年比・月平均と、年ごとの合計の表を表示する（切り替えは無いので Server Component）。
import { formatYen } from "@/shared/format/amount";
import { Delta } from "@/shared/ui/delta";
import { UTILITY_TYPES, UTILITY_TYPE_LABELS } from "@/shared/ui/utility-dot";
import type { AnnualView } from "../types";

// 金額をカンマ区切りで返す。表の各欄には「円」を付けず、見出しに付ける。検針票が無いときは「—」。
function formatCell(amount: number | null): string {
  return amount === null ? "—" : amount.toLocaleString("ja-JP");
}

// 年間タブの全体。
export function AnnualTab({ view }: { view: AnnualView }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <section aria-label="今年の合計" className="rounded-lg border bg-card p-4">
          <h2 className="text-xs text-muted-foreground">今年の合計</h2>
          <p className="text-xl font-bold">{formatYen(view.thisYearTotal)}</p>
          <p className="text-sm">
            前年比 <Delta rate={view.changeRate} />
          </p>
        </section>
        <section aria-label="月平均" className="rounded-lg border bg-card p-4">
          <h2 className="text-xs text-muted-foreground">月平均</h2>
          <p className="text-xl font-bold">
            {view.monthlyAverage === null ? "—" : formatYen(view.monthlyAverage)}
          </p>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">年ごとの合計（円）</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="py-2 font-normal">
                年
              </th>
              {UTILITY_TYPES.map((type) => (
                <th key={type} scope="col" className="py-2 text-right font-normal">
                  {UTILITY_TYPE_LABELS[type]}
                </th>
              ))}
              <th scope="col" className="py-2 text-right font-normal">
                合計
              </th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.year} className="border-b">
                <th scope="row" className="py-2 text-left font-normal">
                  {row.year}
                  {/* 今年の行だけ、集計した期間を年の下に添える。 */}
                  {row.periodLabel && (
                    <span className="block text-xs text-muted-foreground">{row.periodLabel}</span>
                  )}
                </th>
                {UTILITY_TYPES.map((type) => (
                  <td key={type} className="py-2 text-right">
                    {formatCell(row.amounts[type])}
                  </td>
                ))}
                <td className="py-2 text-right font-bold">{formatCell(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
