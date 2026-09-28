/**
 * テストの目的（大項目）
 * 1. formatDate: 日時を日本時間の「YYYY/MM/DD」にすること（UTC では前日でも、日本時間の日付になること）
 */
import { describe, it, expect } from "vitest";
import { formatDate } from "./date";

describe("shared/format formatDate", () => {
  it("月・日が 1 桁でも 2 桁にそろえる", () => {
    expect(formatDate(new Date("2026-07-03T03:00:00.000Z"))).toBe("2026/07/03");
  });

  it("UTC で 15 時以降（日本時間で翌日）なら、日本時間の日付にする", () => {
    expect(formatDate(new Date("2026-12-31T15:00:00.000Z"))).toBe("2027/01/01");
  });

  it("UTC で 15 時より前なら、同じ日付のままにする", () => {
    expect(formatDate(new Date("2026-12-31T14:59:59.999Z"))).toBe("2026/12/31");
  });
});
