// 検針票の画面に渡す型。DB の Date と Decimal は、ここへ来る前に文字列へ変える。
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import type { ContractForMeterReading } from "@/modules/contract";
import type { MeterReadingItemRow } from "./reading-rules";

// S05 記録の種別ごとの 1 行分。reading が null なら未登録。
// bimonthlySkip は、水道で前月の検針票が登録済みかつ表示中の月が未登録のとき true（「隔月のため記録なし」）。
export type RecordsRow = {
  utilityType: UtilityType;
  reading: { id: string; amount: number } | null;
  bimonthlySkip: boolean;
};

// S05 記録に表示する月と、種別ごとの行。前後の月が範囲の外なら null。maxMonth は月を選ぶ小窓で選べる最後の月。
export type RecordsMonthView = {
  month: string;
  maxMonth: string;
  prevMonth: string | null;
  nextMonth: string | null;
  rows: RecordsRow[];
};

// S04 の入力欄の値。数値は入力欄の文字列のまま持ち、未選択・未入力は空文字にする。
export type MeterReadingFormValues = {
  usageMonth: string;
  billingMonth: string;
  contractId: string;
  amount: string;
  periodStart: string;
  periodEnd: string;
  usage: string;
  memo: string;
  items: MeterReadingItemRow[];
};

// S04 に渡す値。id が null のときは作成。
// cancelHref は「キャンセル」で戻る元の画面、usageMonthMax・billingMonthMax は年月の選択欄で選べる最後の月。
export type MeterReadingFormData = {
  id: string | null;
  utilityType: UtilityType;
  cancelHref: string;
  usageMonthMax: string;
  billingMonthMax: string;
  contracts: ContractForMeterReading[];
  values: MeterReadingFormValues;
};

// ホームの計算に渡す検針票 1 件分。日付は DB の Date ではなく、年月は YYYY-MM・日付は YYYY-MM-DD の文字列にする。
export type MeterReadingForHome = {
  utilityType: UtilityType;
  usageMonth: string;
  amount: number;
  periodStart: string | null;
  periodEnd: string | null;
};

// グラフの計算に渡す検針票 1 件分。年月は YYYY-MM の文字列、使用量は小数 1 桁の文字列（空なら null）にする。
export type MeterReadingForGraph = {
  utilityType: UtilityType;
  usageMonth: string;
  amount: number;
  usage: string | null;
};
