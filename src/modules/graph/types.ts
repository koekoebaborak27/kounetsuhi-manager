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

// 年比較タブの種別の切り替え。電気・ガス・水道のどれか 1 つか、3 種別を足した「合計」。
export type CompareFilter = UtilityType | "TOTAL";

// 年比較タブの折れ線 1 本分の点（横軸の 1 つ分）。
export type ComparePoint = {
  // 横軸の文字。月の数字（「9」）、または水道の区切り（「5-6月」）。
  label: string;
  // 年ごとの値。その年のその月（区切り）に検針票が無い、または使用量が空なら null（線を途切れさせる）。
  values: Record<number, number | null>;
};

// 年比較タブのグラフ 1 つ分。
export type CompareChart = {
  // 折れ線を描く年。新しい年から順に並べる（凡例もこの順）。検針票が 1 件も無い年は入れない。
  years: number[];
  // 横軸の並び（1 月から 12 月、水道は区切り 6 つ）。
  points: ComparePoint[];
  // 縦の目盛りに添える使用量の単位。金額のグラフでは null。
  usageUnit: string | null;
};

// 年比較タブの 1 つの種別分。「合計」は使用量が無いので usage は null。
export type CompareSet = {
  amount: CompareChart;
  usage: CompareChart | null;
};

// 年比較タブに表示する内容全体。切り替えのたびに計算し直さないよう、種別ごとに先に作っておく。
export type CompareView = {
  // 今年（太線で描く年）。
  currentYear: number;
  charts: Record<CompareFilter, CompareSet>;
};

// 年間タブの「年ごとの合計」の表の 1 行。
export type AnnualRow = {
  year: number;
  // 今年の行だけに付ける集計した期間。「（1〜8月）」「（1月）」の形。ほかの年は null。
  periodLabel: string | null;
  // 種別ごとの請求額の合計。その年にその種別の検針票が無いときは null（「—」と表示する）。
  amounts: Record<UtilityType, number | null>;
  // 3 種別の合計。
  total: number;
};

// 年間タブに表示する内容全体。
export type AnnualView = {
  // 今年の合計。今年の検針票が無いときは 0。
  thisYearTotal: number;
  // 前年比（%。小数 1 桁に四捨五入済み）。表示できないときは null。
  changeRate: number | null;
  // 月平均（円未満は四捨五入）。今年の検針票が無いときは null。
  monthlyAverage: number | null;
  // 検針票が 1 件でもある年を、新しい年から順に並べた表。
  rows: AnnualRow[];
};
