// 検針票の判定と初期値の計算に使う純粋関数。画面・サービスで同じ基準を使うため、DB や日時の取得はここでは行わない。
// 画面とサーバーの両方から読むため、server-only は付けない。
import type { ItemCategory, UtilityType } from "@/shared/db/generated/prisma/enums";
import { addDays, isValidDateOnly } from "@/shared/date/date-only";
import {
  addMonths,
  firstDayOfYearMonth,
  isValidYearMonth,
  lastDayOfYearMonth,
  monthsBetween,
  splitYearMonth,
  toYearMonth,
} from "@/shared/date/year-month";
import { parseNumberInput, type NumberInputRule } from "@/shared/number/number-input";

// 記録画面で表示でき、検針票の使用月にできる最初の月。
export const USAGE_MONTH_MIN = "2000-01";

// 数値の入力で受け付ける範囲と、小数点より下の桁数。設計書「00_検針票の記録共通.md」の「数値の入力」の表のとおり。
export const AMOUNT_RULE: NumberInputRule = { min: 0, max: 999_999, scale: 0 };
export const USAGE_RULE: NumberInputRule = { min: 0, max: 99_999.9, scale: 1 };
export const ITEM_AMOUNT_RULE: NumberInputRule = { min: -999_999, max: 999_999, scale: 0 };
export const ITEM_QUANTITY_RULE: NumberInputRule = { min: 0, max: 99_999.9, scale: 1 };
export const ITEM_UNIT_PRICE_RULE: NumberInputRule = { min: -9_999.999, max: 9_999.999, scale: 3 };

// 使用月にできる最後の月。今日が属する月（日本時間）の翌月。
export function usageMonthMax(currentMonth: string): string {
  return addMonths(currentMonth, 1);
}

// 請求月で選べる最後の月。翌年の 12 月。
export function billingMonthMax(currentMonth: string): string {
  return toYearMonth(splitYearMonth(currentMonth).year + 1, 12);
}

// 使用月が扱える範囲（2000 年 1 月〜翌月）に入っているかを返す。
export function isUsageMonthInRange(usageMonth: string, currentMonth: string): boolean {
  // YYYY-MM は文字列のまま大小を比べても、年月の前後と一致する。
  return (
    isValidYearMonth(usageMonth) &&
    usageMonth >= USAGE_MONTH_MIN &&
    usageMonth <= usageMonthMax(currentMonth)
  );
}

// 記録画面に表示する月を決める。URL の月が正しくない、または範囲の外のときは前月にする。
export function resolveRecordsMonth(param: string | undefined, currentMonth: string): string {
  if (param && isUsageMonthInRange(param, currentMonth)) return param;
  return addMonths(currentMonth, -1);
}

// URL で使う種別の書き方（小文字）。画面の URL を短く読みやすくするため、DB の値とは分ける。
const UTILITY_TYPE_PARAMS: Record<UtilityType, string> = {
  ELECTRICITY: "electricity",
  GAS: "gas",
  WATER: "water",
};

// URL の種別（electricity・gas・water）を DB の値に変える。知らない値なら null を返す。
export function parseUtilityTypeParam(param: string | undefined): UtilityType | null {
  const entry = Object.entries(UTILITY_TYPE_PARAMS).find(([, value]) => value === param);
  return entry ? (entry[0] as UtilityType) : null;
}

// 記録画面（S05）の URL。month を渡すと、その月を表示する。
export function recordsHref(month?: string): string {
  return month ? `/records?month=${month}` : "/records";
}

// 検針票の作成画面（S04）の URL。ホームから開くときは from に "home" を渡す。
export function newMeterReadingHref(
  utilityType: UtilityType,
  usageMonth: string,
  from: "home" | null = null,
): string {
  const base = `/records/new?type=${UTILITY_TYPE_PARAMS[utilityType]}&month=${usageMonth}`;
  return from ? `${base}&from=${from}` : base;
}

// 検針票の編集画面（S04）の URL。ホームから開くときは from に "home" を渡す。
export function editMeterReadingHref(id: string, from: "home" | null = null): string {
  return from ? `/records/${id}?from=${from}` : `/records/${id}`;
}

// 契約中かどうかの判定に使う契約の値。
type ContractPeriod = { id: string; startDate: string; endDate: string | null };

// 使用月の時点で契約中の契約を選ぶ。開始日が使用月の末日以前で、終了日が空または使用月の 1 日以降の契約が対象。
// 対象が複数あるときは、開始日が最も新しい契約にする。無ければ null を返す。
export function pickActiveContract<T extends ContractPeriod>(
  contracts: readonly T[],
  usageMonth: string,
): T | null {
  const first = firstDayOfYearMonth(usageMonth);
  const last = lastDayOfYearMonth(usageMonth);
  const candidates = contracts.filter(
    (contract) =>
      contract.startDate <= last && (contract.endDate === null || contract.endDate >= first),
  );
  // 開始日が新しいものを先頭にする。YYYY-MM-DD は文字列のまま比べられる。
  candidates.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return candidates[0] ?? null;
}

// 初期値の計算に使う、直前の検針票の値。
export type PreviousReading = {
  usageMonth: string;
  billingMonth: string | null;
  periodEnd: string | null;
};

// 直前の検針票を選ぶ。同じ契約の検針票のうち、使用月がその検針票より前で最も新しいもの。
// 1 つの契約の検針票は多くても年に 12 件なので、契約の検針票をすべて読んでからここで選ぶ。
export function pickPreviousReading<T extends { usageMonth: string }>(
  readings: readonly T[],
  usageMonth: string,
): T | null {
  return readings
    .filter((reading) => reading.usageMonth < usageMonth)
    .reduce<T | null>(
      (latest, reading) =>
        latest === null || reading.usageMonth > latest.usageMonth ? reading : latest,
      null,
    );
}

// 請求月の初期値。直前の検針票と同じ「使用月から請求月までの月数」を、使用月に足した月にする。
// 直前の検針票が無い、または直前の検針票の請求月が空のときは未選択（空文字）にする。
export function initialBillingMonth(previous: PreviousReading | null, usageMonth: string): string {
  if (!previous?.billingMonth) return "";
  return addMonths(usageMonth, monthsBetween(previous.usageMonth, previous.billingMonth));
}

// 使用期間の終了日の初期値。開始日の months か月後の前日にする。
// months か月後に同じ日が無いとき（1 月 31 日の 1 か月後など）は、その月の末日にする。
export function initialPeriodEnd(periodStart: string, months: number): string {
  const targetMonth = addMonths(periodStart.slice(0, 7), months);
  const sameDay = `${targetMonth}-${periodStart.slice(8, 10)}`;
  if (!isValidDateOnly(sameDay)) return lastDayOfYearMonth(targetMonth);
  return addDays(sameDay, -1);
}

// 使用期間の初期値。開始日は直前の検針票の終了日の翌日、終了日は開始日の 1 か月後（水道は 2 か月後）の前日。
// 直前の検針票が無い、または直前の検針票の使用期間が空のときは、どちらも空にする。
export function initialPeriod(
  previous: PreviousReading | null,
  utilityType: UtilityType,
): { periodStart: string; periodEnd: string } {
  if (!previous?.periodEnd) return { periodStart: "", periodEnd: "" };
  const periodStart = addDays(previous.periodEnd, 1);
  // 水道は 2 か月分をまとめた検針票なので、期間も 2 か月にする。
  const months = utilityType === "WATER" ? 2 : 1;
  return { periodStart, periodEnd: initialPeriodEnd(periodStart, months) };
}

// 入力画面の内訳の 1 行分。数値は入力欄の文字列のまま持つ。name は画面に出す項目名。
export type MeterReadingItemRow = {
  contractItemId: string;
  name: string;
  amount: string;
  quantity: string;
  unitPrice: string;
};

// 契約の内訳項目から、値が空の内訳の行を作る。
export function toEmptyItemRows(
  contractItems: readonly { id: string; name: string }[],
): MeterReadingItemRow[] {
  return contractItems.map((item) => ({
    contractItemId: item.id,
    name: item.name,
    amount: "",
    quantity: "",
    unitPrice: "",
  }));
}

// 保存済みの内訳の 1 件分。数値は画面に渡せるよう文字列にしてある。
export type SavedItemValue = {
  contractItemId: string;
  name: string;
  amount: number;
  quantity: string | null;
  unitPrice: string | null;
};

// 編集画面の内訳の行を並べる。保存済みの内訳を保存した順に並べ、その後に契約の内訳項目のうちまだ並んでいないものを表示順に並べる。
export function buildEditItemRows(
  savedItems: readonly SavedItemValue[],
  contractItems: readonly { id: string; name: string }[],
): MeterReadingItemRow[] {
  const savedRows = savedItems.map((item) => ({
    contractItemId: item.contractItemId,
    name: item.name,
    amount: String(item.amount),
    quantity: item.quantity ?? "",
    unitPrice: item.unitPrice ?? "",
  }));
  const savedIds = new Set(savedItems.map((item) => item.contractItemId));
  return [...savedRows, ...toEmptyItemRows(contractItems.filter((item) => !savedIds.has(item.id)))];
}

// 内訳のどれかに、金額・数量・単価のいずれかが入力されているかを返す。契約を選び直すときの確認に使う。
export function hasItemInput(
  items: readonly Pick<MeterReadingItemRow, "amount" | "quantity" | "unitPrice">[],
): boolean {
  return items.some(
    (item) =>
      item.amount.trim() !== "" || item.quantity.trim() !== "" || item.unitPrice.trim() !== "",
  );
}

// 内訳の合計。金額を正しく入力した行だけを足す。count は足した行の数で、0 なら不一致の警告を出さない。
export function sumItemAmounts(items: readonly Pick<MeterReadingItemRow, "amount">[]): {
  total: number;
  count: number;
} {
  let total = 0;
  let count = 0;
  for (const item of items) {
    const parsed =
      item.amount.trim() === "" ? null : parseNumberInput(item.amount, ITEM_AMOUNT_RULE);
    if (parsed === null) continue;
    total += Number(parsed);
    count += 1;
  }
  return { total, count };
}

// 内訳の合計と請求額を比べる。billed は請求額の数値（空または正しくないときは null）。
// 内訳の金額が 1 つも入っていないとき、請求額が空または正しくないときは比べられないので mismatched を false にする。
export function checkItemTotal(
  amount: string,
  items: readonly Pick<MeterReadingItemRow, "amount">[],
): { total: number; billed: number | null; mismatched: boolean } {
  const { total, count } = sumItemAmounts(items);
  const parsed = amount.trim() === "" ? null : parseNumberInput(amount, AMOUNT_RULE);
  const billed = parsed === null ? null : Number(parsed);
  return { total, billed, mismatched: count > 0 && billed !== null && billed !== total };
}

// 保存する内訳の入力 1 件分（入力チェックを通った後の値）。
export type ItemInputForSave = {
  contractItemId: string;
  amount: string | null;
  quantity: string | null;
  unitPrice: string | null;
};

// 保存する内訳の 1 行分。
export type ItemForSave = {
  contractItemId: string;
  name: string;
  category: ItemCategory;
  amount: number;
  quantity: string | null;
  unitPrice: string | null;
  sortOrder: number;
};

// 画面の内訳を、保存する行に変える。金額を入力した行だけを、画面の並び順のまま sortOrder = 1 から並べる。
// 項目名・分類は、保存済みの内訳にある項目ならその控えを、無ければ選んだ契約の内訳項目の値を使う。
// どちらにも無い項目（画面を開いた後に外された項目など）があれば null を返し、保存を止める。
export function resolveItemsForSave(
  inputs: readonly ItemInputForSave[],
  contractItems: readonly { id: string; name: string; category: ItemCategory }[],
  savedItems: readonly { contractItemId: string; name: string; category: ItemCategory }[],
): ItemForSave[] | null {
  const result: ItemForSave[] = [];
  for (const input of inputs) {
    // 金額を空にした項目の行は残さない。
    if (input.amount === null) continue;
    const saved = savedItems.find((item) => item.contractItemId === input.contractItemId);
    const contractItem = contractItems.find((item) => item.id === input.contractItemId);
    const source =
      saved ?? (contractItem && { name: contractItem.name, category: contractItem.category });
    if (!source) return null;
    result.push({
      contractItemId: input.contractItemId,
      name: source.name,
      category: source.category,
      amount: Number(input.amount),
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      sortOrder: result.length + 1,
    });
  }
  return result;
}
