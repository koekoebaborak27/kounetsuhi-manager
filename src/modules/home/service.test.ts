/**
 * 対象: home/service getHomeView
 * 目的: 所属する世帯の検針票を読み、日本時間の今月を基準にホームの表示内容を作ることを担保する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentMembership } from "@/modules/household";

vi.mock("server-only", () => ({}));
const meterReadingApi = { listMeterReadingsForHome: vi.fn(), usageMonthMax: vi.fn() };
vi.mock("@/modules/meter-reading", () => meterReadingApi);

const { getHomeView } = await import("./service");

const membership = { householdId: "h1" } as CurrentMembership;

describe("home/service getHomeView", () => {
  beforeEach(() => {
    // 日本時間の 2026-09-29 とする（UTC でも同じ日）。
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T03:00:00.000Z"));
    meterReadingApi.usageMonthMax.mockReturnValue("2026-10");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("所属する世帯の検針票を読み、今年の合計とカードを返す", async () => {
    meterReadingApi.listMeterReadingsForHome.mockResolvedValue([
      {
        utilityType: "ELECTRICITY",
        usageMonth: "2026-08",
        amount: 12_640,
        periodStart: "2026-07-15",
        periodEnd: "2026-08-14",
      },
    ]);
    const view = await getHomeView(membership);
    expect(meterReadingApi.listMeterReadingsForHome).toHaveBeenCalledWith(membership);
    expect(view.totalTitle).toBe("今年の合計（1〜9月分）");
    expect(view.totalAmount).toBe(12_640);
    expect(view.cards[0].latest?.amount).toBe(12_640);
    expect(view.cards[0].latest?.dailyAmount).toBe(408);
    // 検針票が無い種別は「未登録」の扱いになり、作成の使用月は前月になる。
    expect(view.cards[1].latest).toBeNull();
    expect(view.cards[1].createMonth).toBe("2026-08");
  });

  it("日本時間で月が変わっていれば、UTC ではまだ前の月でも新しい月を今月とする", async () => {
    // UTC 8/31 15:30 は日本時間の 9/1 0:30。
    vi.setSystemTime(new Date("2026-08-31T15:30:00.000Z"));
    meterReadingApi.listMeterReadingsForHome.mockResolvedValue([]);
    const view = await getHomeView(membership);
    expect(view.totalTitle).toBe("今年の合計（1〜9月分）");
  });

  it("使用月にできる最後の月は、検針票の機能に今月を渡して決める", async () => {
    meterReadingApi.listMeterReadingsForHome.mockResolvedValue([]);
    await getHomeView(membership);
    expect(meterReadingApi.usageMonthMax).toHaveBeenCalledWith("2026-09");
  });
});
