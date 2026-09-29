// 金額を画面に出す形の文字列にする関数。
// 設計書「00_全体共通.md」の「表示の形式」に従い、3 桁ごとのカンマと「円」を付け、負の数は先頭に「−」を付ける。

// 金額を「12,640 円」「−58 円」の形にする。
export function formatYen(amount: number): string {
  const digits = Math.abs(amount).toLocaleString("ja-JP");
  return `${amount < 0 ? "−" : ""}${digits} 円`;
}
