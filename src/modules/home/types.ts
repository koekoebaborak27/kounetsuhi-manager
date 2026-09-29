// ホームの画面に渡す型。金額・割合は数値のまま持ち、表示の形（円・%）への変換は画面で行う。
import type { UtilityType } from "@/shared/db/generated/prisma/enums";

// 検針票が 1 件以上ある種別の、最新の検針票の表示内容。
// 前回比・前年同月比は、比べる検針票が無い・0 円のとき null（画面では「—」）。1 日あたりの金額は使用期間が空のとき null。
export type HomeLatest = {
  usageMonth: string;
  // 使用月が今年でないときだけ true。使用月に年を付けて表示する。
  showYear: boolean;
  amount: number;
  monthRate: number | null;
  yearRate: number | null;
  dailyAmount: number | null;
  // 「次を作成」で開く使用月。翌月より先になるとき null（ボタンを押せなくする）。
  nextMonth: string | null;
};

// 種別ごとのカード。latest が null なら検針票が 1 件も無い（「未登録」と「作成」だけを出す）。
export type HomeCard = {
  utilityType: UtilityType;
  latest: HomeLatest | null;
  // 検針票が 1 件も無いときの「作成」で開く使用月（前月）。
  createMonth: string;
};

// ホームに表示する内容全体。
export type HomeView = {
  // 「今年の合計（1〜9月分）」の見出しと、3 種別の請求額の合計。
  totalTitle: string;
  totalAmount: number;
  cards: HomeCard[];
};
