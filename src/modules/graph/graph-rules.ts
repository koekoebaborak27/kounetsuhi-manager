// グラフに表示する値を計算する純粋関数。DB や今日の日付はここでは取得せず、引数で受け取る。
// 画面とサービスの両方で同じ基準を使い、単体テストで計算だけを確かめるため、DB・日時に依存させない。
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { addMonths, splitYearMonth } from "@/shared/date/year-month";
import { formatUsageMonth } from "@/shared/ui/usage-month";
import { UTILITY_TYPE_LABELS, UTILITY_TYPE_UNITS, UTILITY_TYPES } from "@/shared/ui/utility-dot";
import type { MeterReadingForGraph } from "@/modules/meter-reading";
import type {
  TrendCard,
  TrendChart,
  TrendFilter,
  TrendPeriod,
  TrendPoint,
  TrendView,
} from "./types";

// グラフ画面のタブ。URL の ?tab= の値と、画面に表示する名前。並びは左から順。
export type GraphTab = "trend" | "compare" | "annual";
export const GRAPH_TABS: readonly { value: GraphTab; label: string }[] = [
  { value: "trend", label: "推移" },
  { value: "compare", label: "年比較" },
  { value: "annual", label: "年間" },
];

// URL の ?tab= の値から、表示するタブを決める。無い・知らない値のときは最初のタブ（推移）にする。
export function parseGraphTab(value: string | string[] | undefined): GraphTab {
  return GRAPH_TABS.find((tab) => tab.value === value)?.value ?? "trend";
}

// 推移タブで選べる期間。
export const TREND_PERIODS: readonly TrendPeriod[] = [12, 24];

// 推移タブの種別の切り替えの並び。
export const TREND_FILTERS: readonly TrendFilter[] = ["ALL", ...UTILITY_TYPES];

// 検針票を「種別と使用月」からすぐ引けるようにした対応表。
type ReadingIndex = Map<string, MeterReadingForGraph>;

// 対応表の鍵。種別と使用月を組み合わせて 1 つの文字列にする。
function indexKey(utilityType: UtilityType, month: string): string {
  return `${utilityType}|${month}`;
}

// 検針票の一覧から、種別と使用月で引ける対応表を作る。同じ種別・使用月の検針票は 1 件しか無い。
function buildIndex(readings: readonly MeterReadingForGraph[]): ReadingIndex {
  return new Map(
    readings.map((reading) => [indexKey(reading.utilityType, reading.usageMonth), reading]),
  );
}

// 前月までの count か月の使用月を、古い順に返す。「前月」は今月の 1 つ前の月。
export function recentMonths(currentMonth: string, count: number): string[] {
  const last = addMonths(currentMonth, -1);
  return Array.from({ length: count }, (_, i) => addMonths(last, i - (count - 1)));
}

// 水道の 2 か月の区切りで、後ろの月の偶数・奇数を返す（0 = 偶数の月、1 = 奇数の月）。
// 世帯の最新の水道の検針票の使用月に合わせる。水道の検針票が無いときは偶数の月（2・4・…・12 月）にする。
export function waterEndParity(readings: readonly MeterReadingForGraph[]): 0 | 1 {
  const latest = readings
    .filter((reading) => reading.utilityType === "WATER")
    // YYYY-MM は文字列のまま大小を比べても、年月の前後と一致する。
    .reduce<string | null>(
      (max, reading) => (max === null || reading.usageMonth > max ? reading.usageMonth : max),
      null,
    );
  if (latest === null) return 0;
  return (splitYearMonth(latest).month % 2) as 0 | 1;
}

// 水道の区切りの後ろの月を、前月以前のものから新しい順に count 個とり、古い順に返す。
export function waterBucketEnds(currentMonth: string, count: number, parity: 0 | 1): string[] {
  let end = addMonths(currentMonth, -1);
  // 前月が区切りの後ろの月でなければ、1 つ前の月から始める。
  if (splitYearMonth(end).month % 2 !== parity) end = addMonths(end, -1);
  return Array.from({ length: count }, (_, i) => addMonths(end, -2 * (count - 1 - i)));
}

// 水道の区切りの横軸の文字。「5-6月」の形で、区切りが年をまたぐときは「12-1月」になる。
export function waterBucketLabel(endMonth: string): string {
  const start = splitYearMonth(addMonths(endMonth, -1)).month;
  return `${start}-${splitYearMonth(endMonth).month}月`;
}

// 使用量の文字列を、グラフに描くための数値にする。空なら null。
// 小数は本来 number にしないが、折れ線の位置を決めるために数値が要るので、ここだけで変換する（表示には使わない）。
function usageToNumber(usage: string | null | undefined): number | null {
  return usage === null || usage === undefined ? null : Number(usage);
}

// 棒 1 本分を作る。水道のときの month は区切りの後ろの月。単独の種別のときだけ使用量も入れる。
function buildPoint(
  index: ReadingIndex,
  month: string,
  label: string,
  filter: TrendFilter,
): TrendPoint {
  const amounts = { ELECTRICITY: null, GAS: null, WATER: null } as TrendPoint["amounts"];
  for (const type of UTILITY_TYPES) {
    // 「すべて」は 3 種別とも、単独のときは選んだ種別だけ請求額を載せる。
    if (filter === "ALL" || filter === type) {
      amounts[type] = index.get(indexKey(type, month))?.amount ?? null;
    }
  }
  const usage = filter === "ALL" ? null : usageToNumber(index.get(indexKey(filter, month))?.usage);
  return { month, label, amounts, usage };
}

// 推移タブのグラフ 1 つ分を作る。水道だけのときは 2 か月の区切りごと、それ以外は使用月ごとに棒を並べる。
export function buildTrendChart(
  readings: readonly MeterReadingForGraph[],
  currentMonth: string,
  period: TrendPeriod,
  filter: TrendFilter,
): TrendChart {
  const index = buildIndex(readings);
  if (filter === "WATER") {
    // 12 か月なら 6 個、24 か月なら 12 個の区切りにする。
    const ends = waterBucketEnds(currentMonth, period / 2, waterEndParity(readings));
    return {
      points: ends.map((end) => buildPoint(index, end, waterBucketLabel(end), filter)),
      usageUnit: UTILITY_TYPE_UNITS.WATER,
    };
  }
  return {
    points: recentMonths(currentMonth, period).map((month) =>
      buildPoint(index, month, String(splitYearMonth(month).month), filter),
    ),
    usageUnit: filter === "ALL" ? null : UTILITY_TYPE_UNITS[filter],
  };
}

// 選んだ月のカードを作る。見出しは 3 種別の合計、行は電気・ガス・水道の順。
export function buildTrendCard(index: ReadingIndex, month: string): TrendCard {
  const rows = UTILITY_TYPES.map((utilityType) => {
    const amount = index.get(indexKey(utilityType, month))?.amount ?? null;
    // 水道は 2 か月分をまとめた検針票なので、「水道（7-8月分）」と範囲を添える。
    const label =
      utilityType === "WATER"
        ? `${UTILITY_TYPE_LABELS.WATER}（${formatUsageMonth("WATER", month)}）`
        : UTILITY_TYPE_LABELS[utilityType];
    return { utilityType, label, amount };
  });
  const { year, month: monthNumber } = splitYearMonth(month);
  return {
    title: `${year}年${monthNumber}月分`,
    // 検針票が 1 件も無い月は、合計を 0 円にする。
    total: rows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    rows,
  };
}

// 推移タブに表示する内容全体を作る。期間・種別のすべての組み合わせと、選べる月ごとのカードを用意する。
export function buildTrendView(
  readings: readonly MeterReadingForGraph[],
  currentMonth: string,
): TrendView {
  const index = buildIndex(readings);
  const maxPeriod = Math.max(...TREND_PERIODS);
  const cards = Object.fromEntries(
    // 選べる月は、最も長い期間（24 か月）に入る月。水道の区切りの後ろの月もこの中に入る。
    recentMonths(currentMonth, maxPeriod).map((month) => [month, buildTrendCard(index, month)]),
  );
  const charts = Object.fromEntries(
    TREND_PERIODS.map((period) => [
      period,
      Object.fromEntries(
        TREND_FILTERS.map((filter) => [
          filter,
          buildTrendChart(readings, currentMonth, period, filter),
        ]),
      ),
    ]),
  ) as TrendView["charts"];
  return { charts, cards };
}
