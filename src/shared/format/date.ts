// 日付を画面に出す形の文字列にする関数。
// 設計書「00_全体共通.md」の「表示の形式」に従い、日本時間の「YYYY/MM/DD」にする。

// 日本時間で年・月・日を 2 桁（年は 4 桁）ずつ取り出すための書式。
// サーバーは UTC で動くことがあるため、時間帯を日本に固定する。
const JAPAN_DATE_FORMAT = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// 日時を、日本時間の「YYYY/MM/DD」にする（例: 2026/07/13）。
export function formatDate(date: Date): string {
  const parts = JAPAN_DATE_FORMAT.formatToParts(date);
  // 書式の区切り文字は実行環境によって違うことがあるため、年・月・日の値だけを取り出して自分でつなぐ。
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}/${value("month")}/${value("day")}`;
}
