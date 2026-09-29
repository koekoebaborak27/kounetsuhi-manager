/**
 * 対象: shared/date/date-only
 * 目的: 時刻を持たない日付を、DB・画面・カレンダーの間でずらさず扱えることを担保する
 */
import { describe, expect, it } from "vitest";
import {
  addDays,
  dateOnlyToDbDate,
  dateOnlyToLocalDate,
  dbDateToDateOnly,
  formatDateOnly,
  isValidDateOnly,
  localDateToDateOnly,
  todayInJapan,
} from "./date-only";

describe("shared/date/date-only", () => {
  describe("isValidDateOnly", () => {
    it.each([
      ["うるう年の2月29日", "2024-02-29"],
      ["月末", "2026-09-30"],
    ])("%sは true を返す", (_label, value) => expect(isValidDateOnly(value)).toBe(true));
    it.each([
      ["存在しない2月29日", "2026-02-29"],
      ["月が13", "2026-13-01"],
      ["区切りの形が違う", "2026/09/28"],
    ])("%sは false を返す", (_label, value) => expect(isValidDateOnly(value)).toBe(false));
  });
  describe("todayInJapan", () => {
    it("UTCでは前日でも日本では翌日なら、日本時間の日付を返す", () =>
      expect(todayInJapan(new Date("2026-09-28T15:00:00.000Z"))).toBe("2026-09-29"));
  });
  describe("DBと画面の変換", () => {
    it("YYYY-MM-DDをUTC午前0時のDateへ変え、UTCの日付として戻す", () => {
      const date = dateOnlyToDbDate("2026-09-28");
      expect(date.toISOString()).toBe("2026-09-28T00:00:00.000Z");
      expect(dbDateToDateOnly(date)).toBe("2026-09-28");
    });
    it("画面用にはスラッシュ区切りにする", () =>
      expect(formatDateOnly("2026-09-28")).toBe("2026/09/28"));
    it("カレンダーとの受け渡しではブラウザの年月日を保つ", () =>
      expect(localDateToDateOnly(dateOnlyToLocalDate("2026-09-28"))).toBe("2026-09-28"));
  });

  describe("addDays", () => {
    it("月末から 1 日足すと翌月 1 日になる", () =>
      expect(addDays("2026-08-31", 1)).toBe("2026-09-01"));
    it("年末から 1 日足すと翌年 1 月 1 日になる", () =>
      expect(addDays("2026-12-31", 1)).toBe("2027-01-01"));
    it("うるう年の 2 月 28 日から 1 日足すと 29 日になる", () =>
      expect(addDays("2028-02-28", 1)).toBe("2028-02-29"));
    it("負の数を渡すと前の日になる", () => expect(addDays("2026-03-01", -1)).toBe("2026-02-28"));
  });
});
