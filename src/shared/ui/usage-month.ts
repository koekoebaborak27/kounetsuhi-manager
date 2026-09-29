// 検針票の使用月の表示を作る共通の関数。画面ごとに書き方がずれないよう、表示の文字列はここだけで作る。
// 水道は 2 か月分をまとめた検針票なので、使用月（後ろの月）と前月を「7-8月分」の形で表示する。
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { addMonths, splitYearMonth } from "@/shared/date/year-month";

// 使用月を「8月分」「7-8月分」、年付きなら「2026年8月分」「2026年7-8月分」の形にする。
// 水道で前月が前の年になるとき（使用月が 1 月）は、年なしは「12-1月分」、年付きは「2026年12月-2027年1月分」とする。
export function formatUsageMonth(
  utilityType: UtilityType,
  usageMonth: string,
  options: { withYear?: boolean } = {},
): string {
  const { year, month } = splitYearMonth(usageMonth);
  if (utilityType !== "WATER") {
    return options.withYear ? `${year}年${month}月分` : `${month}月分`;
  }
  const previous = splitYearMonth(addMonths(usageMonth, -1));
  if (!options.withYear) return `${previous.month}-${month}月分`;
  // 年をまたぐときだけ、どちらの月がどの年かを書き分ける。
  if (previous.year !== year) {
    return `${previous.year}年${previous.month}月-${year}年${month}月分`;
  }
  return `${year}年${previous.month}-${month}月分`;
}
