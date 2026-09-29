/**
 * 対象: shared/date/year-month
 * 目的: 使用月・請求月のような年月を、年をまたいでも正しく計算し、DB との間でずらさず扱えることを担保する
 */
import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentYearMonthInJapan,
  dbDateToYearMonth,
  firstDayOfYearMonth,
  isValidYearMonth,
  lastDayOfYearMonth,
  monthsBetween,
  yearMonthToDbDate,
} from "./year-month";

describe("shared/date/year-month", () => {
  describe("isValidYearMonth", () => {
    it("YYYY-MM の 1〜12 月を受け付ける", () => {
      expect(isValidYearMonth("2026-01")).toBe(true);
      expect(isValidYearMonth("2026-12")).toBe(true);
    });
    it("0 月・13 月・桁の違う値は受け付けない", () => {
      expect(isValidYearMonth("2026-00")).toBe(false);
      expect(isValidYearMonth("2026-13")).toBe(false);
      expect(isValidYearMonth("2026-8")).toBe(false);
      expect(isValidYearMonth("")).toBe(false);
    });
  });

  describe("addMonths", () => {
    it("同じ年の中で月を足す", () => expect(addMonths("2026-08", 1)).toBe("2026-09"));
    it("12 月に 1 か月足すと翌年 1 月になる", () =>
      expect(addMonths("2026-12", 1)).toBe("2027-01"));
    it("1 月から 1 か月引くと前の年の 12 月になる", () =>
      expect(addMonths("2027-01", -1)).toBe("2026-12"));
    it("12 か月以上足しても年を繰り上げる", () => expect(addMonths("2026-11", 14)).toBe("2028-01"));
  });

  describe("monthsBetween", () => {
    it("後ろの月から前の月を引いた月数を返す", () =>
      expect(monthsBetween("2026-11", "2027-02")).toBe(3));
    it("前後が逆なら負の数を返す", () => expect(monthsBetween("2026-08", "2026-07")).toBe(-1));
  });

  describe("月の 1 日と末日", () => {
    it("1 日は YYYY-MM-01 になる", () => expect(firstDayOfYearMonth("2026-08")).toBe("2026-08-01"));
    it("うるう年の 2 月の末日は 29 日になる", () =>
      expect(lastDayOfYearMonth("2028-02")).toBe("2028-02-29"));
    it("30 日までの月の末日は 30 日になる", () =>
      expect(lastDayOfYearMonth("2026-09")).toBe("2026-09-30"));
  });

  describe("currentYearMonthInJapan", () => {
    it("UTC では前の月でも、日本時間で月が変わっていれば新しい月を返す", () =>
      expect(currentYearMonthInJapan(new Date("2026-08-31T15:00:00.000Z"))).toBe("2026-09"));
  });

  describe("DB との変換", () => {
    it("年月をその月の 1 日の UTC 午前 0 時にし、元の年月へ戻せる", () => {
      const date = yearMonthToDbDate("2026-08");
      expect(date.toISOString()).toBe("2026-08-01T00:00:00.000Z");
      expect(dbDateToYearMonth(date)).toBe("2026-08");
    });
  });
});
