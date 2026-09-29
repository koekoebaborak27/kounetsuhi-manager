// 年月（YYYY-MM）を扱う共通の関数。使用月・請求月のように「日」を持たない値を、画面・DB の間でずれなく受け渡す。
import { todayInJapan } from "./date-only";

// YYYY-MM が正しい年月（1〜12 月）かどうかを返す。
export function isValidYearMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

// YYYY-MM の年と月を数値で取り出す。
export function splitYearMonth(value: string): { year: number; month: number } {
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
}

// 年と月の数値から YYYY-MM を作る。
export function toYearMonth(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

// YYYY-MM に月数を足す（負の数なら引く）。年をまたぐときも正しく繰り上げ・繰り下げる。
export function addMonths(value: string, months: number): string {
  const { year, month } = splitYearMonth(value);
  // 0 月始まりの通し番号にしてから足すと、年の繰り上げを割り算だけで扱える。
  const index = year * 12 + (month - 1) + months;
  return toYearMonth(Math.floor(index / 12), (index % 12) + 1);
}

// 2 つの年月の差を月数で返す（to − from）。
export function monthsBetween(from: string, to: string): number {
  const a = splitYearMonth(from);
  const b = splitYearMonth(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

// 日本時間の今日が属する年月を返す。
export function currentYearMonthInJapan(now = new Date()): string {
  return todayInJapan(now).slice(0, 7);
}

// YYYY-MM の 1 日を YYYY-MM-DD で返す。
export function firstDayOfYearMonth(value: string): string {
  return `${value}-01`;
}

// YYYY-MM の末日を YYYY-MM-DD で返す。
export function lastDayOfYearMonth(value: string): string {
  const { year, month } = splitYearMonth(value);
  // 翌月の 0 日目は、その月の末日になる。
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${value}-${String(day).padStart(2, "0")}`;
}

// YYYY-MM を、DB の date 列へ渡せるその月の 1 日（UTC 午前 0 時）の Date に変える。
export function yearMonthToDbDate(value: string): Date {
  return new Date(`${value}-01T00:00:00.000Z`);
}

// DB の date 列から、UTC の年月を YYYY-MM として取り出す。
export function dbDateToYearMonth(date: Date): string {
  return date.toISOString().slice(0, 7);
}
