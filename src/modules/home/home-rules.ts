// ホームに表示する値を計算する純粋関数。DB や今日の日付はここでは取得せず、引数で受け取る。
// 画面とサービスの両方で同じ基準を使い、単体テストで計算だけを確かめるため、DB・日時に依存させない。
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { daysBetween } from "@/shared/date/date-only";
import { addMonths, splitYearMonth } from "@/shared/date/year-month";
import { calcChangeRate } from "@/shared/format/change-rate";
import { UTILITY_TYPES } from "@/shared/ui/utility-dot";
import type { MeterReadingForHome } from "@/modules/meter-reading";
import type { HomeCard, HomeLatest, HomeView } from "./types";

// 検針票 1 枚が表す月数。水道は 2 か月分をまとめて 1 枚とするため、前回・次の使用月は 2 か月離れる。
export function monthsPerReading(utilityType: UtilityType): number {
  return utilityType === "WATER" ? 2 : 1;
}

// 種別の検針票のうち、使用月が最も新しいものを返す。1 件も無ければ null。
export function pickLatestReading(
  readings: readonly MeterReadingForHome[],
  utilityType: UtilityType,
): MeterReadingForHome | null {
  return readings
    .filter((reading) => reading.utilityType === utilityType)
    .reduce<MeterReadingForHome | null>(
      // YYYY-MM は文字列のまま大小を比べても、年月の前後と一致する。
      (latest, reading) =>
        latest === null || reading.usageMonth > latest.usageMonth ? reading : latest,
      null,
    );
}

// 種別と使用月がちょうど一致する検針票を返す。無ければ null。前回・前年同月の検針票を探すために使う。
function findReading(
  readings: readonly MeterReadingForHome[],
  utilityType: UtilityType,
  usageMonth: string,
): MeterReadingForHome | null {
  return (
    readings.find(
      (reading) => reading.utilityType === utilityType && reading.usageMonth === usageMonth,
    ) ?? null
  );
}

// 1 日あたりの金額を返す。請求額 ÷ 使用期間の日数（開始日も終了日も数える）を円未満で四捨五入する。
// 使用期間が空のとき、または終了日が開始日より前で日数が数えられないときは null を返す。
export function calcDailyAmount(
  amount: number,
  periodStart: string | null,
  periodEnd: string | null,
): number | null {
  if (!periodStart || !periodEnd) return null;
  const days = daysBetween(periodStart, periodEnd) + 1;
  if (days < 1) return null;
  return Math.round(amount / days);
}

// 今年の合計の金額。使用月が今年の 1 月〜当月の検針票の請求額を、3 種別すべて足す。
export function calcYearTotal(
  readings: readonly MeterReadingForHome[],
  currentMonth: string,
): number {
  const year = splitYearMonth(currentMonth).year;
  const first = `${String(year).padStart(4, "0")}-01`;
  return readings
    .filter((reading) => reading.usageMonth >= first && reading.usageMonth <= currentMonth)
    .reduce((sum, reading) => sum + reading.amount, 0);
}

// 「今年の合計」の見出し。当月が 1 月のときは「（1月分）」、それ以外は「（1〜9月分）」の形にする。
export function yearTotalTitle(currentMonth: string): string {
  const { month } = splitYearMonth(currentMonth);
  return month === 1 ? "今年の合計（1月分）" : `今年の合計（1〜${month}月分）`;
}

// 最新の検針票から、カードの表示内容を作る。
function buildLatest(
  readings: readonly MeterReadingForHome[],
  latest: MeterReadingForHome,
  currentMonth: string,
  usageMonthLimit: string,
): HomeLatest {
  const { utilityType, usageMonth, amount } = latest;
  // 前回は 1 か月前（水道は 2 か月前）、前年同月は 12 か月前の使用月の検針票だけと比べる。
  // その使用月の検針票が無いときは、さらに前の月の検針票とは比べず「—」にする。
  const previous = findReading(
    readings,
    utilityType,
    addMonths(usageMonth, -monthsPerReading(utilityType)),
  );
  const lastYear = findReading(readings, utilityType, addMonths(usageMonth, -12));
  const nextMonth = addMonths(usageMonth, monthsPerReading(utilityType));
  return {
    usageMonth,
    showYear: splitYearMonth(usageMonth).year !== splitYearMonth(currentMonth).year,
    amount,
    monthRate: previous ? calcChangeRate(amount, previous.amount) : null,
    yearRate: lastYear ? calcChangeRate(amount, lastYear.amount) : null,
    dailyAmount: calcDailyAmount(amount, latest.periodStart, latest.periodEnd),
    // 次の使用月が扱える範囲（翌月まで）を超えるときは作成させない。
    nextMonth: nextMonth <= usageMonthLimit ? nextMonth : null,
  };
}

// ホームに表示する内容全体を作る。currentMonth は日本時間の今月、usageMonthLimit は使用月にできる最後の月。
export function buildHomeView(
  readings: readonly MeterReadingForHome[],
  currentMonth: string,
  usageMonthLimit: string,
): HomeView {
  const cards: HomeCard[] = UTILITY_TYPES.map((utilityType) => {
    const latest = pickLatestReading(readings, utilityType);
    return {
      utilityType,
      latest: latest ? buildLatest(readings, latest, currentMonth, usageMonthLimit) : null,
      // 検針票が 1 件も無い種別の「作成」は、前月の入力画面を開く。
      createMonth: addMonths(currentMonth, -1),
    };
  });
  return {
    totalTitle: yearTotalTitle(currentMonth),
    totalAmount: calcYearTotal(readings, currentMonth),
    cards,
  };
}
