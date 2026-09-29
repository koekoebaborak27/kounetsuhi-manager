// 増減率（前回や前年同月と比べた割合）を計算し、画面に出す形の文字列にする関数。
// 設計書「00_全体共通.md」の「表示の形式」と、ホームの「増減率の計算と表示」に従う。

// 増減の向き。増えた・減った・変わらない（四捨五入して 0.0%）の 3 通り。
export type ChangeDirection = "increase" | "decrease" | "flat";

// 増減率（%）を小数 1 桁に四捨五入して返す。
// 比べる相手の金額が 0 円のときは割合が決まらないため null を返す。
export function calcChangeRate(current: number, base: number): number | null {
  if (base === 0) return null;
  const rate = ((current - base) / base) * 100;
  // 負の数でも「0.5 は絶対値が大きいほうへ」丸めたいので、符号を分けて丸める。
  const rounded = (Math.sign(rate) * Math.round(Math.abs(rate) * 10)) / 10;
  // 小さな減少が -0 になると「-0.0%」と表示されかねないので、0 に揃える。
  return rounded === 0 ? 0 : rounded;
}

// 増減率の向きを返す。割合が無い（null）ときは、色を付けないため「変わらない」として扱う。
export function changeDirection(rate: number | null): ChangeDirection {
  if (rate === null || rate === 0) return "flat";
  return rate > 0 ? "increase" : "decrease";
}

// 増減率を「+15.1%」「−5.5%」「0.0%」の形にする。割合が無いときは「—」にする。
export function formatChangeRate(rate: number | null): string {
  if (rate === null) return "—";
  if (rate === 0) return "0.0%";
  return `${rate > 0 ? "+" : "−"}${Math.abs(rate).toFixed(1)}%`;
}
