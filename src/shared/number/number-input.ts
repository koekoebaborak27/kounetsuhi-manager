// 金額・使用量などの数字の入力を、確かめられる形に整える共通の関数。
// 入力欄の値は文字列のまま受け取り、小数は計算の誤差を避けるため数値にせず文字列で返す。

// 全角の数字・記号を半角に直し、マイナス記号をそろえ、3 桁ごとのカンマと前後の空白を取り除く。
// 「−」（全角のマイナス）「－」（全角のハイフン）「-」のどれもマイナスとして受け付ける。
export function normalizeNumberInput(value: string): string {
  return value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[．]/g, ".")
    .replace(/[−－‐]/g, "-")
    .replace(/[,，]/g, "")
    .trim();
}

// 数値として受け付ける条件。最小・最大と、小数点より下の桁数の上限（0 なら整数だけ）。
export type NumberInputRule = { min: number; max: number; scale: number };

// 入力を整えたうえで条件を満たすかを確かめ、満たせば「余分な 0 を除いた数字の文字列」を返す。
// 満たさないときは null を返す。空の入力をどう扱うかは呼び出し側で決める。
export function parseNumberInput(value: string, rule: NumberInputRule): string | null {
  const normalized = normalizeNumberInput(value);
  const match = /^-?\d+(?:\.(\d+))?$/.exec(normalized);
  if (!match) return null;
  // 小数点より下の桁数が上限を超えるものは、丸めずに誤りとして扱う。
  if ((match[1]?.length ?? 0) > rule.scale) return null;
  const number = Number(normalized);
  if (number < rule.min || number > rule.max) return null;
  // 桁数が少ない（7 桁程度）ので、数値を経由しても元の 10 進数の値のまま文字列に戻せる。
  // 「019.40」を「19.4」、「-0」を「0」のようにそろえるために使う。
  return String(number);
}
