/**
 * 対象: graph-rules（タブの判定・水道の 2 か月の区切り・推移タブの計算）
 * 目的: 使用月を基準にした並べ方、水道の区切り方、データが無い月の扱い、選んだ月のカードの内容を担保する
 */
import { describe, expect, it } from "vitest";
import type { MeterReadingForGraph } from "@/modules/meter-reading";
import {
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
