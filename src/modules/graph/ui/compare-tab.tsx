"use client";
// S06 グラフの年比較タブ。種別・金額 / 使用量の切り替えと、年ごとの折れ線の表示を行う。
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { UTILITY_TYPES, UTILITY_TYPE_LABELS } from "@/shared/ui/utility-dot";
import type { CompareFilter, CompareView } from "../types";
import { Segmented } from "./segmented";

// 値の切り替え。
type Metric = "amount" | "usage";

// 折れ線の見た目。今年は太線、前年・前々年は細線。色だけに頼らないよう、前々年は点線にする。
function lineStyle(year: number, currentYear: number) {
  if (year === currentYear) return { stroke: "var(--primary)", width: 3.5, dash: undefined };
  if (year === currentYear - 1)
    return { stroke: "var(--muted-foreground)", width: 1.5, dash: undefined };
  return { stroke: "var(--muted-foreground)", width: 1.5, dash: "4 3" };
}

// 金額の縦の目盛りの文字。「2万」「1.5万」「0」の形にする。
function formatManYen(value: number): string {
  return value === 0 ? "0" : `${value / 10_000}万`;
}

// 金額の縦の目盛りの位置を返す。0 から、最大値が入るキリのよい刻み（5千・1万・2万・5万…円）で 4 本以内に収める。
// 自動任せだと「0.45万」のような中途半端な目盛りになるので、こちらで決める。
function amountTicks(max: number): number[] {
  const step =
    [5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000].find((s) => max / s <= 4) ??
    1_000_000;
  const count = Math.max(1, Math.ceil(max / step));
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

// 年比較タブの全体。
export function CompareTab({ view }: { view: CompareView }) {
  // 表示する種別と値。最初は「電気」「金額」。画面を開くたびに初期の状態に戻す（URL には持たせない）。
  const [filter, setFilter] = useState<CompareFilter>("ELECTRICITY");
  const [metric, setMetric] = useState<Metric>("amount");

  // 「合計」には使用量が無いので、使用量を選んでいても金額のグラフを使う。
  const set = view.charts[filter];
  const chart = metric === "usage" && set.usage ? set.usage : set.amount;
  const isUsage = chart === set.usage;

  // Recharts に渡すデータ。年ごとの値を「y2026」のような項目名を付けた 1 行にする。
  const data = chart.points.map((point) => ({
    label: point.label,
    ...Object.fromEntries(chart.years.map((year) => [`y${year}`, point.values[year]])),
  }));

  // 金額の目盛り。描く値のうち一番大きいものが収まるように決める。
  const maxAmount = Math.max(
    0,
    ...chart.points.flatMap((point) => Object.values(point.values)).filter((v) => v !== null),
  );
  const ticks = amountTicks(maxAmount);

  const filterOptions: readonly { value: CompareFilter; label: string }[] = [
    ...UTILITY_TYPES.map((type) => ({ value: type, label: UTILITY_TYPE_LABELS[type] })),
    { value: "TOTAL", label: "合計" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Segmented
          label="表示する種別"
          value={filter}
          options={filterOptions}
          onChange={(value) => {
            setFilter(value);
            // 「合計」を選んだときは使用量を押せなくするので、使用量を選んでいたら金額に戻す。
            if (value === "TOTAL") setMetric("amount");
          }}
        />
        <Segmented
          label="表示する値"
          value={metric}
          options={[
            { value: "amount", label: "金額" },
            { value: "usage", label: "使用量", disabled: filter === "TOTAL" },
          ]}
          onChange={setMetric}
        />
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-1">
          {isUsage && <span className="text-xs text-muted-foreground">（{chart.usageUnit}）</span>}
          <div role="img" aria-label="年ごとの光熱費の折れ線グラフ">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} interval={0} fontSize={12} />
                <YAxis
                  width={isUsage ? 44 : 40}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  // 金額のときは、キリのよい目盛りを指定して 0 から始める。使用量は自動に任せる。
                  ticks={isUsage ? undefined : ticks}
                  domain={isUsage ? [0, "auto"] : [0, ticks[ticks.length - 1]]}
                  // 金額は万円単位、使用量はそのままの数値で目盛りを表示する。
                  tickFormatter={(value: number) =>
                    isUsage ? value.toLocaleString("ja-JP") : formatManYen(value)
                  }
                />
                {/* 新しい年を最後に描いて、太線の今年が細線の下に隠れないようにする。 */}
                {[...chart.years].reverse().map((year) => {
                  const style = lineStyle(year, view.currentYear);
                  return (
                    <Line
                      key={year}
                      dataKey={`y${year}`}
                      stroke={style.stroke}
                      strokeWidth={style.width}
                      strokeDasharray={style.dash}
                      dot={year === view.currentYear ? { r: 3 } : false}
                      // 検針票が無い月（区切り）では線を途切れさせ、前後の点を直接つながない。
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* 水道の横軸は「1-2月」のように月が入っているので、「（月）」は月ごとのときだけ添える。 */}
          {filter !== "WATER" && (
            <span className="text-right text-xs text-muted-foreground">（月）</span>
          )}
        </div>

        <ul
          aria-label="凡例"
          className="flex flex-wrap gap-x-4 gap-y-1 text-sm lg:flex-col lg:gap-y-2"
        >
          {chart.years.map((year) => {
            const style = lineStyle(year, view.currentYear);
            return (
              <li key={year} className="flex items-center gap-2">
                <svg aria-hidden width="24" height="8">
                  <line
                    x1="0"
                    y1="4"
                    x2="24"
                    y2="4"
                    stroke={style.stroke}
                    strokeWidth={style.width}
                    strokeDasharray={style.dash}
                  />
                </svg>
                {year}年
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
