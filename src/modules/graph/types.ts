// グラフの画面に渡す型。金額・使用量は数値のまま持ち、表示の形（円・単位）への変換は画面で行う。
import type { UtilityType } from "@/shared/db/generated/prisma/enums";

// 推移タブの期間（何か月分を表示するか）。
export type TrendPeriod = 12 | 24;

// 推移タブの種別の切り替え。「すべて」か、種別を 1 つ選ぶ。
export type TrendFilter = "ALL" | UtilityType;

// 推移タブの棒 1 本分。水道だけを表示するときは、2 か月の区切り 1 つ分になる。
export type TrendPoint = {
  // 使用月（YYYY-MM）。水道の区切りでは後ろの月。選んだ月の目印になり、カードを引く鍵にもなる。
  month: string;
  // 横軸の文字。月の数字（「9」）、または水道の区切り（「5-6月」）。
  label: string;
  // 種別ごとの請求額。その月（区切り）の検針票が無い種別は null（棒を描かない）。
  amounts: Record<UtilityType, number | null>;
  // 種別を 1 つ選んだときの使用量。検針票が無い、または使用量が空なら null（折れ線を途切れさせる）。
  usage: number | null;
};

// 推移タブのグラフ 1 つ分。左から右へ古い順に並べる。
export type TrendChart = {
  points: TrendPoint[];
  // 右の目盛りに添える使用量の単位。「すべて」のときは使用量を描かないので null。
  usageUnit: string | null;
};

// 選んだ月のカードの種別ごとの行。
export type TrendCardRow = {
  utilityType: UtilityType;
  // 「電気」「水道（7-8月分）」の形。
  label: string;
  // 請求額。検針票が無いときは null（「未登録」と表示する）。
  amount: number | null;
};

// 選んだ月のカード。3 種別の合計と、種別ごとの行。
export type TrendCard = {
  // 「2026年8月分」の形。
  title: string;
  total: number;
  rows: TrendCardRow[];
};

// 推移タブに表示する内容全体。切り替えのたびに計算し直さないよう、すべての組み合わせを先に作っておく。
export type TrendView = {
  // charts[期間][種別の切り替え] の順に引く。
  charts: Record<TrendPeriod, Record<TrendFilter, TrendChart>>;
  // 使用月（YYYY-MM）ごとのカード。表示できる最も古い月（24 か月前）から前月まで。
  cards: Record<string, TrendCard>;
};
