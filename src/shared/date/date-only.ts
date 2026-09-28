// 時刻を持たない日付を扱う共通の関数。画面・DB・カレンダーの間で日付がずれないよう、YYYY-MM-DD を基準にする。

// YYYY-MM-DD が実在する日付かどうかを返す。月末やうるう年以外の日は受け付けない。
export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

// 現在時刻から、日本時間の今日を YYYY-MM-DD で返す。
export function todayInJapan(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

// YYYY-MM-DD を、DB の date 列へ渡せる UTC 午前 0 時の Date に変える。
export function dateOnlyToDbDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

// DB の date 列から、UTC の年月日を YYYY-MM-DD として取り出す。
export function dbDateToDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// YYYY-MM-DD を画面用の YYYY/MM/DD に変える。
export function formatDateOnly(value: string): string {
  return value.replaceAll("-", "/");
}

// YYYY-MM-DD を、ブラウザのカレンダーに渡せるローカル時刻の Date に変える。
export function dateOnlyToLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// カレンダーが返すローカル時刻の Date を YYYY-MM-DD に変える。
export function localDateToDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
