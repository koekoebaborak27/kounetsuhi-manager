// S05 記録の中身。表示中の月の切り替えと、電気・ガス・水道の登録状況を並べる。
// 表示だけで状態を持たないため、サーバーで描画する。
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatYen } from "@/shared/format/amount";
import { Button } from "@/shared/ui/button";
import { formatUsageMonth } from "@/shared/ui/usage-month";
import { UtilityDot, UTILITY_TYPE_LABELS } from "@/shared/ui/utility-dot";
import { editMeterReadingHref, newMeterReadingHref, recordsHref } from "../reading-rules";
import type { RecordsMonthView, RecordsRow } from "../types";
import { RecordsMonthPicker } from "./records-month-picker";

// 前後の月へ移るボタン。範囲の外で移れないときは、押せないボタンだけを置く。
function MonthLink({
  month,
  label,
  children,
}: {
  month: string | null;
  label: string;
  children: ReactNode;
}) {
  if (!month) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant="ghost" size="icon">
      <Link href={recordsHref(month)} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}

// 種別ごとの 1 行。登録済みなら請求額と「編集」、未登録なら「未登録」（水道の隔月は「隔月のため記録なし」）と「作成」。
function RecordsRowItem({ row, month }: { row: RecordsRow; month: string }) {
  const label = UTILITY_TYPE_LABELS[row.utilityType];
  const period = formatUsageMonth(row.utilityType, month);
  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b py-3 lg:grid-cols-[5rem_6rem_minmax(0,1fr)_auto]">
      <span className="flex items-center gap-2 text-sm">
        <UtilityDot utilityType={row.utilityType} />
        {label}
      </span>
      {/* PC では期間を独立した列に出す。スマホでは水道だけ請求額の後ろに添える。 */}
      <span className="hidden text-sm lg:block">{row.reading ? period : ""}</span>
      {row.reading ? (
        <span className="text-sm">
          {formatYen(row.reading.amount)}
          {row.utilityType === "WATER" && (
            <span className="text-xs text-muted-foreground lg:hidden">（{period}）</span>
          )}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">
          {row.bimonthlySkip ? "隔月のため記録なし" : "未登録"}
        </span>
      )}
      {row.reading ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={editMeterReadingHref(row.reading.id)} aria-label={`${label}を編集`}>
            編集
          </Link>
        </Button>
      ) : (
        <Button asChild size="sm">
          <Link href={newMeterReadingHref(row.utilityType, month)} aria-label={`${label}を作成`}>
            作成
          </Link>
        </Button>
      )}
    </li>
  );
}

// S05 記録の中身。行が少ないため、PC でも幅を 640px 程度に収める。
export function RecordsMonth({ view }: { view: RecordsMonthView }) {
  return (
    <main className="px-4 py-4 lg:max-w-2xl lg:px-7">
      <nav aria-label="表示する月" className="mb-4 flex items-center justify-center gap-5">
        <MonthLink month={view.prevMonth} label="前の月">
          <ChevronLeft aria-hidden />
        </MonthLink>
        {/* 見出しを押すと年月を選べる。前後のボタンでは遠い月へ移るのが大変なため。 */}
        <RecordsMonthPicker month={view.month} maxMonth={view.maxMonth} />
        <MonthLink month={view.nextMonth} label="次の月">
          <ChevronRight aria-hidden />
        </MonthLink>
      </nav>
      {/* PC だけ列の見出しを出す。 */}
      <div
        aria-hidden
        className="hidden grid-cols-[5rem_6rem_minmax(0,1fr)_auto] gap-3 border-b pb-2 text-xs text-muted-foreground lg:grid"
      >
        <span>種別</span>
        <span>期間</span>
        <span>請求額</span>
        <span />
      </div>
      <ul>
        {view.rows.map((row) => (
          <RecordsRowItem key={row.utilityType} row={row} month={view.month} />
        ))}
      </ul>
    </main>
  );
}
