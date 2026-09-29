/**
 * 対象: graph/service（getTrendView・getCompareView・getAnnualView）
 * 目的: 所属する世帯の検針票を読み、日本時間の今月・今年を基準に各タブの表示内容を作ることを担保する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentMembership } from "@/modules/household";

vi.mock("server-only", () => ({}));
const meterReadingApi = { listMeterReadingsForGraphs: vi.fn() };
vi.mock("@/modules/meter-reading", () => meterReadingApi);

const { getAnnualView, getCompareView, getTrendView } = await import("./service");

const membership = { householdId: "h1" } as CurrentMembership;

describe("graph/service getTrendView", () => {
  beforeEach(() => {
    // 日本時間の 2026-09-29 とする（UTC でも同じ日）。
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T03:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("所属する世帯の検針票を読み、前月を一番右にした 12 か月のグラフを返す", async () => {
    meterReadingApi.listMeterReadingsForGraphs.mockResolvedValue([
      { utilityType: "GAS", usageMonth: "2026-08", amount: 3_850, usage: "12.0" },
    ]);
    const view = await getTrendView(membership);
    expect(meterReadingApi.listMeterReadingsForGraphs).toHaveBeenCalledWith(membership);
    const last = view.charts[12].ALL.points.at(-1);
    expect(last?.month).toBe("2026-08");
    expect(last?.amounts.GAS).toBe(3_850);
  });

  it("日本時間で日付が変わった直後は、翌月を今月として扱う", async () => {
    // UTC では 8/31 だが、日本時間では 9/1 なので、前月は 8 月。
    vi.setSystemTime(new Date("2026-08-31T16:00:00.000Z"));
    meterReadingApi.listMeterReadingsForGraphs.mockResolvedValue([]);
    const view = await getTrendView(membership);
    expect(view.charts[12].ALL.points.at(-1)?.month).toBe("2026-08");
  });
});

describe("graph/service getCompareView・getAnnualView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T03:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("年比較は所属する世帯の検針票を読み、日本時間の今年を太線の年にする", async () => {
    meterReadingApi.listMeterReadingsForGraphs.mockResolvedValue([
      { utilityType: "GAS", usageMonth: "2026-08", amount: 3_850, usage: "12.0" },
    ]);
    const view = await getCompareView(membership);
    expect(meterReadingApi.listMeterReadingsForGraphs).toHaveBeenCalledWith(membership);
    expect(view.currentYear).toBe(2026);
    expect(view.charts.GAS.amount.years).toEqual([2026]);
  });

  it("年間は所属する世帯の検針票を読み、日本時間の今年の合計を返す", async () => {
    // UTC では 2025 年だが、日本時間では 2026 年 1 月 1 日なので、今年は 2026 年。
    vi.setSystemTime(new Date("2025-12-31T16:00:00.000Z"));
    meterReadingApi.listMeterReadingsForGraphs.mockResolvedValue([
      { utilityType: "GAS", usageMonth: "2026-01", amount: 3_850, usage: null },
      { utilityType: "GAS", usageMonth: "2025-12", amount: 9_999, usage: null },
    ]);
    const view = await getAnnualView(membership);
    expect(meterReadingApi.listMeterReadingsForGraphs).toHaveBeenCalledWith(membership);
    expect(view.thisYearTotal).toBe(3_850);
  });
});
