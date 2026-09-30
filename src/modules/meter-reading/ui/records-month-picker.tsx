"use client";
// S05 記録の月の見出し。押すと年月を選ぶ小窓が開き、離れた月へ 1 回で移れる。
import { useRouter } from "next/navigation";
import { splitYearMonth } from "@/shared/date/year-month";
import { MonthPicker } from "@/shared/ui/month-picker";
import { recordsHref, USAGE_MONTH_MIN } from "../reading-rules";

// 表示中の月を出し、選ばれた月の記録画面へ移る。
export function RecordsMonthPicker({ month, maxMonth }: { month: string; maxMonth: string }) {
  const router = useRouter();
  return (
    <div className="w-40">
      <MonthPicker
        value={month}
        onChange={(next) => {
          // 今と同じ月が選ばれたときは移る必要が無い。
          if (next && next !== month) router.push(recordsHref(next));
        }}
        min={USAGE_MONTH_MIN}
        max={maxMonth}
        placeholder="月を選ぶ"
        format={(value) => {
          const { year, month: m } = splitYearMonth(value);
          return `${year} 年 ${m} 月分`;
        }}
      />
    </div>
  );
}
