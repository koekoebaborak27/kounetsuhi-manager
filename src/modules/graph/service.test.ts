/**
 * 対象: graph/service getTrendView
 * 目的: 所属する世帯の検針票を読み、日本時間の今月を基準に推移タブの表示内容を作ることを担保する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentMembership } from "@/modules/household";

vi.mock("server-only", () => ({}));
const meterReadingApi = { listMeterReadingsForGraphs: vi.fn() };
vi.mock("@/modules/meter-reading", () => meterReadingApi);

const { getTrendView } = await import("./service");

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
