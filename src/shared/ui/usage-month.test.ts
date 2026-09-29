/**
 * 対象: shared/ui/usage-month formatUsageMonth
 * 目的: 使用月の表示（水道の 2 か月分・年をまたぐ場合を含む）が画面ごとにずれないことを担保する
 */
import { describe, expect, it } from "vitest";
import { formatUsageMonth } from "./usage-month";

describe("shared/ui/usage-month formatUsageMonth", () => {
  describe("電気・ガスのとき", () => {
    it("年なしは「8月分」にする", () => expect(formatUsageMonth("GAS", "2026-08")).toBe("8月分"));
    it("年付きは「2026年8月分」にする", () =>
      expect(formatUsageMonth("ELECTRICITY", "2026-08", { withYear: true })).toBe("2026年8月分"));
  });

  describe("水道のとき", () => {
    it("年なしは前月を含めて「7-8月分」にする", () =>
      expect(formatUsageMonth("WATER", "2026-08")).toBe("7-8月分"));
    it("年付きは「2026年7-8月分」にする", () =>
      expect(formatUsageMonth("WATER", "2026-08", { withYear: true })).toBe("2026年7-8月分"));
  });

  describe("水道で使用月が 1 月のとき", () => {
    it("年なしは「12-1月分」にする", () =>
      expect(formatUsageMonth("WATER", "2027-01")).toBe("12-1月分"));
    it("年付きは両方の年を書いて「2026年12月-2027年1月分」にする", () =>
      expect(formatUsageMonth("WATER", "2027-01", { withYear: true })).toBe(
        "2026年12月-2027年1月分",
      ));
  });
});
