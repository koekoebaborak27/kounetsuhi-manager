/**
 * 対象: graph-rules（タブの判定・水道の 2 か月の区切り・推移タブ・年比較タブ・年間タブの計算）
 * 目的: 使用月を基準にした並べ方、水道の区切り方、データが無い月の扱い、選んだ月のカードの内容を担保する
 */
import { describe, expect, it } from "vitest";
import type { MeterReadingForGraph } from "@/modules/meter-reading";
import {
  annualPeriodLabel,
  buildAnnualView,
  buildCompareChart,
  buildCompareView,
  buildTrendCard,
  buildTrendChart,
  buildTrendView,
  parseGraphTab,
  recentMonths,
  waterBucketEnds,
  waterBucketLabel,
  waterEndParity,
} from "./graph-rules";

// 検針票 1 件分のテストデータを作る。
function reading(
  utilityType: MeterReadingForGraph["utilityType"],
  usageMonth: string,
  amount: number,
  usage: string | null = null,
): MeterReadingForGraph {
  return { utilityType, usageMonth, amount, usage };
}

describe("graph-rules parseGraphTab", () => {
  it("正しい値ならそのタブ、無い・知らない値なら推移にする", () => {
    expect(parseGraphTab("compare")).toBe("compare");
    expect(parseGraphTab("annual")).toBe("annual");
    expect(parseGraphTab(undefined)).toBe("trend");
    expect(parseGraphTab("foo")).toBe("trend");
    expect(parseGraphTab(["compare", "annual"])).toBe("trend");
  });
});

describe("graph-rules recentMonths", () => {
  it("今月の前月までの N か月を古い順に返す（年をまたぐ）", () => {
    const months = recentMonths("2026-09", 12);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2025-09");
    expect(months[11]).toBe("2026-08");
  });
});

describe("graph-rules 水道の 2 か月の区切り", () => {
  it("最新の水道の検針票が 8 月分なら、後ろの月は偶数", () => {
    expect(waterEndParity([reading("WATER", "2026-06", 1), reading("WATER", "2026-08", 1)])).toBe(
      0,
    );
  });
  it("最新の水道の検針票が 7 月分なら、後ろの月は奇数", () => {
    expect(waterEndParity([reading("WATER", "2026-05", 1), reading("WATER", "2026-07", 1)])).toBe(
      1,
    );
  });
  it("水道の検針票が無いときは偶数。ほかの種別の検針票は見ない", () => {
    expect(waterEndParity([])).toBe(0);
    expect(waterEndParity([reading("GAS", "2026-07", 1)])).toBe(0);
  });
  it("前月が区切りの後ろの月なら前月から、そうでなければ 1 つ前の月から新しい順にとる", () => {
    // 前月は 2026-08（偶数）。
    expect(waterBucketEnds("2026-09", 6, 0)).toEqual([
      "2025-10",
      "2025-12",
      "2026-02",
      "2026-04",
      "2026-06",
      "2026-08",
    ]);
    expect(waterBucketEnds("2026-09", 6, 1).at(-1)).toBe("2026-07");
  });
  it("区切りの文字は「5-6月」の形で、年をまたぐときは「12-1月」", () => {
    expect(waterBucketLabel("2026-06")).toBe("5-6月");
    expect(waterBucketLabel("2026-01")).toBe("12-1月");
  });
});

describe("graph-rules buildTrendChart", () => {
  const readings = [
    reading("ELECTRICITY", "2026-08", 12_640, "412.0"),
    reading("ELECTRICITY", "2026-06", 9_000, null),
    reading("GAS", "2026-08", 3_000, "10.5"),
    reading("WATER", "2026-08", 11_860, "20.0"),
  ];

  it("すべて: 前月までの 12 か月を並べ、3 種別の請求額を載せる。使用量は載せない", () => {
    const chart = buildTrendChart(readings, "2026-09", 12, "ALL");
    expect(chart.points).toHaveLength(12);
    expect(chart.usageUnit).toBeNull();
    const last = chart.points[11];
    expect(last.month).toBe("2026-08");
    expect(last.label).toBe("8");
    expect(last.amounts).toEqual({ ELECTRICITY: 12_640, GAS: 3_000, WATER: 11_860 });
    expect(last.usage).toBeNull();
  });

  it("すべて: 検針票が無い月と種別は null（棒を描かない）。水道は使用月にだけ載る", () => {
    const chart = buildTrendChart(readings, "2026-09", 12, "ALL");
    const july = chart.points.find((p) => p.month === "2026-07");
    expect(july?.amounts).toEqual({ ELECTRICITY: null, GAS: null, WATER: null });
  });

  it("電気: 請求額に使用量を重ねる。使用量が空・検針票が無い月は null で、単位は kWh", () => {
    const chart = buildTrendChart(readings, "2026-09", 12, "ELECTRICITY");
    expect(chart.usageUnit).toBe("kWh");
    expect(chart.points[11].usage).toBe(412);
    const june = chart.points.find((p) => p.month === "2026-06");
    expect(june?.amounts.ELECTRICITY).toBe(9_000);
    expect(june?.usage).toBeNull();
    expect(chart.points.find((p) => p.month === "2026-07")?.usage).toBeNull();
    // 選んだ種別以外の請求額は載せない。
    expect(chart.points[11].amounts.GAS).toBeNull();
  });

  it("水道: 12 か月は 6 個、24 か月は 12 個の区切り。文字は「7-8月」の形", () => {
    const chart12 = buildTrendChart(readings, "2026-09", 12, "WATER");
    expect(chart12.points).toHaveLength(6);
    expect(chart12.points[5].month).toBe("2026-08");
    expect(chart12.points[5].label).toBe("7-8月");
    expect(chart12.points[5].amounts.WATER).toBe(11_860);
    expect(chart12.points[5].usage).toBe(20);
    expect(chart12.usageUnit).toBe("㎥");
    expect(buildTrendChart(readings, "2026-09", 24, "WATER").points).toHaveLength(12);
  });

  it("水道: 検針票の使用月が区切りの後ろの月と偶奇が違うときは、その検針票は載せない", () => {
    // 最新が 8 月分なので後ろの月は偶数。7 月分は載らない。
    const chart = buildTrendChart(
      [...readings, reading("WATER", "2026-05", 9_999)],
      "2026-09",
      12,
      "WATER",
    );
    expect(chart.points.some((p) => p.amounts.WATER === 9_999)).toBe(false);
  });
});

describe("graph-rules buildTrendCard / buildTrendView", () => {
  const readings = [reading("ELECTRICITY", "2026-08", 12_640), reading("WATER", "2026-08", 11_860)];

  it("カード: 見出しは年月と 3 種別の合計、行は電気・ガス・水道の順で、無い種別は null", () => {
    const view = buildTrendView(readings, "2026-09");
    const card = view.cards["2026-08"];
    expect(card.title).toBe("2026年8月分");
    expect(card.total).toBe(24_500);
    expect(card.rows.map((row) => [row.label, row.amount])).toEqual([
      ["電気", 12_640],
      ["ガス", null],
      ["水道（7-8月分）", 11_860],
    ]);
  });

  it("カード: 検針票が 1 件も無い月は合計 0 円、すべて null", () => {
    const view = buildTrendView(readings, "2026-09");
    const card = view.cards["2026-07"];
    expect(card.total).toBe(0);
    expect(card.rows.every((row) => row.amount === null)).toBe(true);
  });

  it("カード: 水道が 1 月分のとき、範囲は「12-1月」", () => {
    const card = buildTrendCard(new Map(), "2026-01");
    expect(card.rows[2].label).toBe("水道（12-1月分）");
  });

  it("全体: 12・24 か月と 4 つの切り替えをすべて用意し、カードは 24 か月分ある", () => {
    const view = buildTrendView(readings, "2026-09");
    expect(Object.keys(view.charts)).toEqual(["12", "24"]);
    expect(Object.keys(view.charts[12])).toEqual(["ALL", "ELECTRICITY", "GAS", "WATER"]);
    expect(Object.keys(view.cards)).toHaveLength(24);
    // 水道の区切りの後ろの月は、どの期間でもカードが引ける。
    for (const point of view.charts[24].WATER.points) expect(view.cards[point.month]).toBeDefined();
  });
});

describe("graph-rules buildCompareChart", () => {
  // 電気は 2026 年 1・2 月と 2025 年 1 月、ガスは 2024 年だけ、水道は 2026 年 8 月（偶数月）にある世帯。
  const readings = [
    reading("ELECTRICITY", "2026-01", 10_000, "300.0"),
    reading("ELECTRICITY", "2026-02", 12_000, null),
    reading("ELECTRICITY", "2025-01", 9_000, "280.5"),
    reading("GAS", "2024-03", 4_000, "10.0"),
    reading("WATER", "2026-08", 5_000, "20.0"),
    reading("WATER", "2025-02", 4_500, "18.0"),
  ];

  it("電気は 1〜12 月を並べ、今年・前年の順に金額を載せる。検針票が無い月は null", () => {
    const chart = buildCompareChart(readings, 2026, "ELECTRICITY", "amount");
    expect(chart.years).toEqual([2026, 2025]);
    expect(chart.points.map((p) => p.label)).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i + 1)),
    );
    expect(chart.points[0].values).toEqual({ 2026: 10_000, 2025: 9_000 });
    expect(chart.points[1].values).toEqual({ 2026: 12_000, 2025: null });
    expect(chart.points[2].values).toEqual({ 2026: null, 2025: null });
    expect(chart.usageUnit).toBeNull();
  });

  it("使用量は単位を添え、使用量が空の月は null にする", () => {
    const chart = buildCompareChart(readings, 2026, "ELECTRICITY", "usage");
    expect(chart.usageUnit).toBe("kWh");
    expect(chart.points[0].values).toEqual({ 2026: 300, 2025: 280.5 });
    expect(chart.points[1].values[2026]).toBeNull();
  });

  it("選んだ種別に検針票が 1 件も無い年は、折れ線に入れない（3 年より前の年も入れない）", () => {
    // ガスは 2024 年（前々年）だけにある。
    expect(buildCompareChart(readings, 2026, "GAS", "amount").years).toEqual([2024]);
    // 2023 年は 3 年の範囲の外なので入れない。
    expect(
      buildCompareChart([reading("GAS", "2023-05", 1_000)], 2026, "GAS", "amount").years,
    ).toEqual([]);
  });

  it("水道は 2 か月の区切り 6 つを並べ、最新の水道の検針票（8 月）に合わせて偶数月を後ろの月にする", () => {
    const chart = buildCompareChart(readings, 2026, "WATER", "amount");
    expect(chart.points.map((p) => p.label)).toEqual([
      "1-2月",
      "3-4月",
      "5-6月",
      "7-8月",
      "9-10月",
      "11-12月",
    ]);
    expect(chart.points[0].values).toEqual({ 2026: null, 2025: 4_500 });
    expect(chart.points[3].values).toEqual({ 2026: 5_000, 2025: null });
    expect(chart.usageUnit).toBeNull();
  });

  it("水道の最新の検針票が奇数月なら、最初の区切りは「12-1月」で後ろの月（1 月）の年の点にする", () => {
    const chart = buildCompareChart(
      [reading("WATER", "2026-01", 3_000), reading("WATER", "2025-11", 2_800)],
      2026,
      "WATER",
      "amount",
    );
    expect(chart.points.map((p) => p.label)).toEqual([
      "12-1月",
      "2-3月",
      "4-5月",
      "6-7月",
      "8-9月",
      "10-11月",
    ]);
    expect(chart.points[0].values[2026]).toBe(3_000);
    expect(chart.points[5].values[2025]).toBe(2_800);
  });

  it("合計は使用月ごとに 3 種別を足し、水道も使用月にそのまま載せる。検針票が 1 件も無い月は null", () => {
    const chart = buildCompareChart(
      [
        reading("ELECTRICITY", "2026-02", 12_000),
        reading("GAS", "2026-02", 3_000),
        reading("WATER", "2026-02", 4_500),
        reading("GAS", "2026-03", 2_500),
      ],
      2026,
      "TOTAL",
      "amount",
    );
    expect(chart.points[1].values[2026]).toBe(19_500);
    expect(chart.points[2].values[2026]).toBe(2_500);
    expect(chart.points[0].values[2026]).toBeNull();
    expect(chart.points).toHaveLength(12);
  });

  it("buildCompareView は種別ごとに金額・使用量を用意し、合計には使用量を作らない", () => {
    const view = buildCompareView(readings, "2026-09");
    expect(view.currentYear).toBe(2026);
    expect(view.charts.TOTAL.usage).toBeNull();
    expect(view.charts.GAS.usage?.usageUnit).toBe("㎥");
    expect(view.charts.WATER.amount.years).toEqual([2026, 2025]);
  });
});

describe("graph-rules annualPeriodLabel", () => {
  it("最後の月が 2 月以降なら「（1〜N月）」、1 月なら「（1月）」にする", () => {
    expect(annualPeriodLabel(8)).toBe("（1〜8月）");
    expect(annualPeriodLabel(1)).toBe("（1月）");
  });
});

describe("graph-rules buildAnnualView", () => {
  // 今年（2026）は 1 月に電気・ガス、8 月に電気・水道。前年（2025）は 1 月・8 月・9 月にある。
  const readings = [
    reading("ELECTRICITY", "2026-01", 10_000),
    reading("GAS", "2026-01", 5_000),
    reading("ELECTRICITY", "2026-08", 8_000),
    reading("WATER", "2026-08", 7_000),
    reading("ELECTRICITY", "2025-01", 12_000),
    reading("GAS", "2025-08", 6_000),
    // 前年の 9 月以降は、今年の最後の月（8 月）より後なので前年比には含めない。
    reading("ELECTRICITY", "2025-09", 99_000),
    reading("ELECTRICITY", "2024-05", 1_000),
  ];

  it("今年の合計は、使用月が今年の検針票の請求額を 3 種別すべて足す", () => {
    expect(buildAnnualView(readings, "2026-09").thisYearTotal).toBe(30_000);
  });

  it("前年比は、前年の 1 月から今年の記録がある最後の月（8 月）までの同じ期間と比べる", () => {
    // 前年の 1〜8 月の合計は 12,000 + 6,000 = 18,000。（30,000 − 18,000）÷ 18,000 = +66.7%。
    expect(buildAnnualView(readings, "2026-09").changeRate).toBe(66.7);
  });

  it("月平均は、どれか 1 種別でも検針票がある月数（1 月・8 月の 2 か月）で割り、円未満は四捨五入する", () => {
    expect(buildAnnualView(readings, "2026-09").monthlyAverage).toBe(15_000);
    // 3 か月で割り切れない場合は四捨五入する（10,000 ÷ 3 = 3,333.3…）。
    const odd = [
      reading("ELECTRICITY", "2026-01", 3_000),
      reading("ELECTRICITY", "2026-02", 3_000),
      reading("ELECTRICITY", "2026-03", 4_000),
    ];
    expect(buildAnnualView(odd, "2026-09").monthlyAverage).toBe(3_333);
  });

  it("年ごとの合計の表は、検針票がある年を新しい順に並べ、種別ごとの合計と「—」（null）を持つ", () => {
    const { rows } = buildAnnualView(readings, "2026-09");
    expect(rows.map((row) => row.year)).toEqual([2026, 2025, 2024]);
    expect(rows[0]).toEqual({
      year: 2026,
      periodLabel: "（1〜8月）",
      amounts: { ELECTRICITY: 18_000, GAS: 5_000, WATER: 7_000 },
      total: 30_000,
    });
    // 前年の電気は 12,000 + 99,000。水道の検針票は無いので null。
    expect(rows[1].amounts).toEqual({ ELECTRICITY: 111_000, GAS: 6_000, WATER: null });
    expect(rows[1].periodLabel).toBeNull();
  });

  it("今年の最後の月が 1 月のときは、期間が「（1月）」になり、前年の 1 月だけと比べる", () => {
    const view = buildAnnualView(
      [
        reading("ELECTRICITY", "2026-01", 11_000),
        reading("ELECTRICITY", "2025-01", 10_000),
        reading("GAS", "2025-02", 5_000),
      ],
      "2026-02",
    );
    expect(view.rows[0].periodLabel).toBe("（1月）");
    expect(view.changeRate).toBe(10);
  });

  it("今年の検針票が無いときは、合計 0 円・前年比と月平均は null で、今年の行は出さない", () => {
    const view = buildAnnualView([reading("GAS", "2025-03", 4_000)], "2026-09");
    expect(view.thisYearTotal).toBe(0);
    expect(view.changeRate).toBeNull();
    expect(view.monthlyAverage).toBeNull();
    expect(view.rows.map((row) => row.year)).toEqual([2025]);
  });

  it("前年の同じ期間に検針票が無い、または合計が 0 円のときは、前年比を null にする", () => {
    // 前年の検針票は 12 月にしか無く、同じ期間（1〜8 月）には無い。
    expect(
      buildAnnualView([reading("GAS", "2026-08", 1_000), reading("GAS", "2025-12", 500)], "2026-09")
        .changeRate,
    ).toBeNull();
    // 前年の同じ期間の合計が 0 円（割合が決まらない）。
    expect(
      buildAnnualView([reading("GAS", "2026-08", 1_000), reading("GAS", "2025-03", 0)], "2026-09")
        .changeRate,
    ).toBeNull();
  });
});
