"use client";
// S06 グラフの推移タブ。期間・種別の切り替えと、棒をタップして選んだ月のカードの表示を行う。
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Rectangle,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { formatYen } from "@/shared/format/amount";
import { Button } from "@/shared/ui/button";
import { UTILITY_TYPES, UTILITY_TYPE_LABELS, UtilityDot } from "@/shared/ui/utility-dot";
import { TREND_PERIODS } from "../graph-rules";
import type { TrendCard, TrendFilter, TrendPeriod, TrendView } from "../types";
import { Segmented } from "./segmented";

// 種別ごとの棒の色。globals.css の色のトークンを使う。
const UTILITY_COLORS: Record<UtilityType, string> = {
  ELECTRICITY: "var(--elec)",
  GAS: "var(--gas)",
  WATER: "var(--water)",
};

// 種別ごとの、Recharts に渡すデータ上の項目名。
const AMOUNT_KEYS: Record<UtilityType, "electricity" | "gas" | "water"> = {
  ELECTRICITY: "electricity",
  GAS: "gas",
  WATER: "water",
};

// 期間の切り替えの選択肢。
const PERIOD_OPTIONS = TREND_PERIODS.map((period) => ({
  value: String(period),
  label: `${period}か月`,
}));

// 種別の切り替えの選択肢。
const FILTER_OPTIONS: readonly { value: TrendFilter; label: string }[] = [
  { value: "ALL", label: "すべて" },
  ...UTILITY_TYPES.map((type) => ({ value: type, label: UTILITY_TYPE_LABELS[type] })),
];

// 選んだ月のカード。見出しに 3 種別の合計、その下に種別ごとの金額（検針票が無い種別は「未登録」）を出す。
// 前の月・次の月のボタンは、棒をタップできない人（キーボードの操作）でも月を選べるようにするために置く。
function MonthCard({
  card,
  onPrevious,
  onNext,
}: {
  card: TrendCard;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
}) {
  return (
    <section aria-label="選んだ月の内訳" className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="前の月を選ぶ"
            disabled={!onPrevious}
            onClick={() => onPrevious?.()}
          >
            <ChevronLeft />
          </Button>
          <h2 className="font-bold">{card.title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="次の月を選ぶ"
            disabled={!onNext}
            onClick={() => onNext?.()}
          >
            <ChevronRight />
          </Button>
        </div>
        <p className="font-bold lg:hidden">{formatYen(card.total)}</p>
      </div>
      {/* PC ではカードが縦長になるので、合計を見出しの下に大きく出す。 */}
      <p className="my-1 hidden text-2xl font-bold lg:block">{formatYen(card.total)}</p>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {card.rows.map((row) => (
          <li key={row.utilityType} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <UtilityDot utilityType={row.utilityType} />
              {row.label}
            </span>
            {row.amount === null ? (
              <span className="text-muted-foreground">未登録</span>
            ) : (
              <span>{formatYen(row.amount)}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// グラフの下に置く凡例。「すべて」は種別の色、種別を選んだときは請求額（棒）と使用量（線）。
function Legend({ filter }: { filter: TrendFilter }) {
  if (filter === "ALL") {
    return (
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {UTILITY_TYPES.map((type) => (
          <li key={type} className="flex items-center gap-1.5">
            <UtilityDot utilityType={type} />
            {UTILITY_TYPE_LABELS[type]}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-2.5 w-3 rounded-sm"
          style={{ background: UTILITY_COLORS[filter] }}
        />
        請求額
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-0.5 w-4 bg-foreground" />
        使用量
      </li>
    </ul>
  );
}

// 推移タブの全体。
export function TrendTab({ view }: { view: TrendView }) {
  // 表示する期間・種別。最初は「12か月」「すべて」。画面を開くたびに初期の状態に戻す（URL には持たせない）。
  const [period, setPeriod] = useState<TrendPeriod>(12);
  const [filter, setFilter] = useState<TrendFilter>("ALL");
  // 選んだ月。null は「一番右の月（区切り）」を選んだ状態を表す。期間・種別を切り替えたら null に戻す。
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const chart = view.charts[period][filter];
  const { points } = chart;
  // 選んだ月が今のグラフに無いとき（未選択・期間の切り替え直後など）は、一番右の月を選んだことにする。
  const foundIndex = points.findIndex((point) => point.month === selectedMonth);
  const activeIndex = foundIndex >= 0 ? foundIndex : points.length - 1;
  const selected = points[activeIndex];
  const card = view.cards[selected.month];

  // Recharts に渡すデータ。種別ごとの請求額を、項目名を付けた 1 行にする。
  const data = points.map((point) => ({
    month: point.month,
    label: point.label,
    electricity: point.amounts.ELECTRICITY,
    gas: point.amounts.GAS,
    water: point.amounts.WATER,
    usage: point.usage,
  }));
  const showUsage = filter !== "ALL";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Segmented
          label="表示する期間"
          value={String(period)}
          options={PERIOD_OPTIONS}
          onChange={(value) => {
            // 期間を切り替えたら、選んだ月は一番右の月に戻す。
            setPeriod(Number(value) as TrendPeriod);
            setSelectedMonth(null);
          }}
        />
        <Segmented
          label="表示する種別"
          value={filter}
          options={FILTER_OPTIONS}
          onChange={(value) => {
            // 種別を切り替えたら、選んだ月は一番右の月（区切り）に戻す。
            setFilter(value);
            setSelectedMonth(null);
          }}
        />
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>（円）</span>
            {showUsage && <span>（{chart.usageUnit}）</span>}
          </div>
          <div role="img" aria-label="光熱費の推移のグラフ">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart
                data={data}
                margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                // 棒（または横軸のその月の位置）をタップしたら、その月を選ぶ。
                onClick={(state) => {
                  const index = Number(state.activeIndex);
                  if (Number.isInteger(index) && points[index])
                    setSelectedMonth(points[index].month);
                }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(month: string) =>
                    points.find((p) => p.month === month)?.label ?? ""
                  }
                  tickLine={false}
                  // 24 か月は文字が重なりやすいので、重なるときは間引いて表示する。
                  interval={period === 24 ? "equidistantPreserveStart" : 0}
                  fontSize={12}
                />
                <YAxis
                  yAxisId="amount"
                  width={showUsage ? 44 : 48}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(value: number) => value.toLocaleString("ja-JP")}
                />
                {showUsage && (
                  <YAxis
                    yAxisId="usage"
                    orientation="right"
                    width={40}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                )}
                {UTILITY_TYPES.filter((type) => filter === "ALL" || filter === type).map((type) => (
                  <Bar
                    key={type}
                    yAxisId="amount"
                    stackId="amount"
                    dataKey={AMOUNT_KEYS[type]}
                    fill={UTILITY_COLORS[type]}
                    isAnimationActive={false}
                    // 選んだ月の棒は縁取りをして濃く、ほかの月の棒は薄くして見分ける。
                    shape={(props) => {
                      const isSelected = props.payload?.month === selected.month;
                      return (
                        <Rectangle
                          x={props.x}
                          y={props.y}
                          width={props.width}
                          height={props.height}
                          fill={props.fill}
                          fillOpacity={isSelected ? 1 : 0.55}
                          stroke={isSelected ? "var(--foreground)" : "none"}
                          strokeWidth={isSelected ? 1.5 : 0}
                        />
                      );
                    }}
                  />
                ))}
                {showUsage && (
                  <Line
                    yAxisId="usage"
                    dataKey="usage"
                    stroke="var(--foreground)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    // 使用量が無い月では線を途切れさせ、前後の点を直接つながない。
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Legend filter={filter} />
          {filter === "ALL" && (
            <p className="text-xs text-muted-foreground">
              水道は 2 か月分をまとめて後ろの月に載せています
            </p>
          )}
        </div>

        <MonthCard
          card={card}
          onPrevious={
            activeIndex > 0 ? () => setSelectedMonth(points[activeIndex - 1].month) : null
          }
          onNext={
            activeIndex < points.length - 1
              ? () => setSelectedMonth(points[activeIndex + 1].month)
              : null
          }
        />
      </div>
    </div>
  );
}
