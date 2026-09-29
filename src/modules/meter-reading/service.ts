// 検針票の業務処理。所属する世帯の検針票だけを扱い、画面に渡せる形へ整える。
import "server-only";
import { z } from "zod";
import { dateOnlyToDbDate, dbDateToDateOnly } from "@/shared/date/date-only";
import {
  addMonths,
  currentYearMonthInJapan,
  dbDateToYearMonth,
  yearMonthToDbDate,
} from "@/shared/date/year-month";
import { AppError, Errors } from "@/shared/errors/app-error";
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { UTILITY_TYPES, UTILITY_TYPE_LABELS } from "@/shared/ui/utility-dot";
import { formatUsageMonth } from "@/shared/ui/usage-month";
import type { CurrentMembership } from "@/modules/household";
import { listContractsForMeterReading, type ContractForMeterReading } from "@/modules/contract";
import {
  createMeterReading as createMeterReadingRow,
  deleteMeterReading as deleteMeterReadingRow,
  findMeterReadingIdByMonth,
  findMeterReadingsByContractId,
  findMeterReadingsByMonths,
  findMeterReadingWithItems,
  updateMeterReading as updateMeterReadingRow,
} from "./repository";
import {
  billingMonthMax,
  buildEditItemRows,
  initialBillingMonth,
  initialPeriod,
  isUsageMonthInRange,
  parseUtilityTypeParam,
  pickActiveContract,
  pickPreviousReading,
  recordsHref,
  resolveItemsForSave,
  resolveRecordsMonth,
  toEmptyItemRows,
  usageMonthMax,
  USAGE_MONTH_MIN,
  type ItemForSave,
} from "./reading-rules";
import type { MeterReadingFormData, RecordsMonthView } from "./types";
import {
  meterReadingFormSchema,
  METER_READING_ERROR_CODES,
  METER_READING_MESSAGES,
  type MeterReadingParsed,
} from "./validation";

// 入力をスキーマで確かめ、通れば保存用の値を返す。
function parseInput(input: unknown): MeterReadingParsed {
  const result = meterReadingFormSchema.safeParse(input);
  if (!result.success) throw Errors.VALIDATION_ERROR(result.error.issues[0]?.message);
  return result.data;
}

// 同じ種別・使用月の検針票がすでにあることを知らせるエラー。文言の年月・種別は選んだ使用月と種別に合わせる。
function duplicateError(utilityType: UtilityType, usageMonth: string): AppError {
  const label = formatUsageMonth(utilityType, usageMonth, { withYear: true });
  return new AppError(
    METER_READING_ERROR_CODES.duplicate,
    409,
    `${label}の${UTILITY_TYPE_LABELS[utilityType]}の検針票はすでに登録されています。`,
    { utilityType, usageMonth },
  );
}

// 使用月が扱える範囲（2000 年 1 月〜翌月）の外なら止める。画面を開いた後に月が変わった場合もここで止まる。
function assertUsageMonthInRange(usageMonth: string): void {
  if (!isUsageMonthInRange(usageMonth, currentYearMonthInJapan())) {
    throw new AppError(
      METER_READING_ERROR_CODES.usageMonthOutOfRange,
      400,
      METER_READING_MESSAGES.usageMonthOutOfRange,
      { usageMonth },
    );
  }
}

// 選んだ契約を、世帯の同じ種別の契約から探す。世帯に無い、または種別が違う契約は選び直してもらう。
async function findContract(
  membership: CurrentMembership,
  utilityType: UtilityType,
  contractId: string,
): Promise<ContractForMeterReading> {
  // 同じ種別の契約の中から探すことで、他世帯の契約・別の種別の契約は見つからない扱いにする。
  const contracts = await listContractsForMeterReading(membership, utilityType);
  const contract = contracts.find((item) => item.id === contractId);
  if (!contract) {
    throw new AppError(
      METER_READING_ERROR_CODES.contractNotFound,
      400,
      METER_READING_MESSAGES.contractNotFound,
      { contractId, utilityType, householdId: membership.householdId },
    );
  }
  return contract;
}

// 同じ種別・使用月の、自分以外の検針票がすでにあれば止める。編集では excludeId に自分の ID を渡す。
async function assertNoDuplicate(
  householdId: string,
  utilityType: UtilityType,
  usageMonth: string,
  excludeId: string | null,
): Promise<void> {
  const existingId = await findMeterReadingIdByMonth(
    householdId,
    utilityType,
    yearMonthToDbDate(usageMonth),
  );
  if (existingId !== null && existingId !== excludeId)
    throw duplicateError(utilityType, usageMonth);
}

// 画面の内訳を保存する行に変える。画面を開いた後に外された項目などが含まれていたら、再読み込みしてもらう。
function toItemsForSave(
  parsed: MeterReadingParsed,
  contract: ContractForMeterReading,
  savedItems: readonly {
    contractItemId: string;
    name: string;
    category: ItemForSave["category"];
  }[],
): ItemForSave[] {
  const items = resolveItemsForSave(parsed.items, contract.items, savedItems);
  if (!items) throw Errors.CONFLICT(undefined, { contractId: contract.id });
  return items;
}

// 保存する基本の項目を、DB の列の形へ変える。空のメモは null で保存する。
function toRowValues(parsed: MeterReadingParsed) {
  return {
    contractId: parsed.contractId,
    usageMonth: yearMonthToDbDate(parsed.usageMonth),
    billingMonth: parsed.billingMonth ? yearMonthToDbDate(parsed.billingMonth) : null,
    amount: parsed.amount,
    periodStart: parsed.periodStart ? dateOnlyToDbDate(parsed.periodStart) : null,
    periodEnd: parsed.periodEnd ? dateOnlyToDbDate(parsed.periodEnd) : null,
    usage: parsed.usage,
    memo: parsed.memo || null,
  };
}

// S05 記録に表示する月と、種別ごとの行を返す。URL の月が正しくない、または範囲の外なら前月を表示する。
export async function getRecordsMonth(
  membership: CurrentMembership,
  monthParam: string | undefined,
): Promise<RecordsMonthView> {
  const currentMonth = currentYearMonthInJapan();
  const month = resolveRecordsMonth(monthParam, currentMonth);
  const prevMonth = addMonths(month, -1);
  // 水道の「隔月のため記録なし」を判定するため、前月の検針票も一緒に読む。
  const readings = (
    await findMeterReadingsByMonths(membership.householdId, [
      yearMonthToDbDate(month),
      yearMonthToDbDate(prevMonth),
    ])
  ).map((reading) => ({ ...reading, usageMonth: dbDateToYearMonth(reading.usageMonth) }));
  const find = (utilityType: UtilityType, target: string) =>
    readings.find(
      (reading) => reading.utilityType === utilityType && reading.usageMonth === target,
    );
  const rows = UTILITY_TYPES.map((utilityType) => {
    const reading = find(utilityType, month);
    return {
      utilityType,
      reading: reading ? { id: reading.id, amount: reading.amount } : null,
      bimonthlySkip:
        utilityType === "WATER" && !reading && find(utilityType, prevMonth) !== undefined,
    };
  });
  return {
    month,
    prevMonth: month > USAGE_MONTH_MIN ? prevMonth : null,
    nextMonth: month < usageMonthMax(currentMonth) ? addMonths(month, 1) : null,
    rows,
  };
}

// 作成画面を開いたときの結果。同じ種別・使用月の検針票がすでにあれば、その編集へ移すために ID を返す。
export type MeterReadingCreateResult =
  { kind: "existing"; id: string } | { kind: "form"; data: MeterReadingFormData };

// S04 の作成画面に必要な値を返す。URL の種別・使用月が正しくない、または範囲の外なら null を返す。
export async function getMeterReadingCreateForm(
  membership: CurrentMembership,
  typeParam: string | undefined,
  monthParam: string | undefined,
  fromHome: boolean,
): Promise<MeterReadingCreateResult | null> {
  const utilityType = parseUtilityTypeParam(typeParam);
  const currentMonth = currentYearMonthInJapan();
  if (!utilityType || !monthParam || !isUsageMonthInRange(monthParam, currentMonth)) return null;
  const usageMonth = monthParam;
  // 同じ種別・同じ使用月の検針票がすでにあれば、その検針票の編集として開く。
  const existingId = await findMeterReadingIdByMonth(
    membership.householdId,
    utilityType,
    yearMonthToDbDate(usageMonth),
  );
  if (existingId) return { kind: "existing", id: existingId };
  const contracts = await listContractsForMeterReading(membership, utilityType);
  // 初期値は使用月の時点で契約中の契約と、その契約の直前の検針票から決める。
  const contract = pickActiveContract(contracts, usageMonth);
  const previous = contract
    ? pickPreviousReading(
        (await findMeterReadingsByContractId(membership.householdId, contract.id)).map((row) => ({
          usageMonth: dbDateToYearMonth(row.usageMonth),
          billingMonth: row.billingMonth ? dbDateToYearMonth(row.billingMonth) : null,
          periodEnd: row.periodEnd ? dbDateToDateOnly(row.periodEnd) : null,
        })),
        usageMonth,
      )
    : null;
  return {
    kind: "form",
    data: {
      id: null,
      utilityType,
      cancelHref: fromHome ? "/" : recordsHref(usageMonth),
      usageMonthMax: usageMonthMax(currentMonth),
      billingMonthMax: billingMonthMax(currentMonth),
      contracts,
      values: {
        usageMonth,
        billingMonth: initialBillingMonth(previous, usageMonth),
        contractId: contract?.id ?? "",
        amount: "",
        ...initialPeriod(previous, utilityType),
        usage: "",
        memo: "",
        items: toEmptyItemRows(contract?.items ?? []),
      },
    },
  };
}

// S04 の編集画面に必要な値を返す。他世帯の ID または存在しない ID は null を返す。
export async function getMeterReadingEditForm(
  membership: CurrentMembership,
  id: string,
  fromHome: boolean,
): Promise<MeterReadingFormData | null> {
  const reading = await findMeterReadingWithItems(id, membership.householdId);
  if (!reading) return null;
  const usageMonth = dbDateToYearMonth(reading.usageMonth);
  const currentMonth = currentYearMonthInJapan();
  const contracts = await listContractsForMeterReading(membership, reading.utilityType);
  const contract = contracts.find((item) => item.id === reading.contractId);
  return {
    id: reading.id,
    utilityType: reading.utilityType,
    cancelHref: fromHome ? "/" : recordsHref(usageMonth),
    usageMonthMax: usageMonthMax(currentMonth),
    billingMonthMax: billingMonthMax(currentMonth),
    contracts,
    values: {
      usageMonth,
      billingMonth: reading.billingMonth ? dbDateToYearMonth(reading.billingMonth) : "",
      contractId: reading.contractId,
      amount: String(reading.amount),
      periodStart: reading.periodStart ? dbDateToDateOnly(reading.periodStart) : "",
      periodEnd: reading.periodEnd ? dbDateToDateOnly(reading.periodEnd) : "",
      // Decimal はそのまま画面へ渡せないため、文字列にする。
      usage: reading.usage?.toString() ?? "",
      memo: reading.memo ?? "",
      // 保存済みの内訳を保存した順に並べ、その後に契約の内訳項目のうちまだ無いものを並べる。
      items: buildEditItemRows(
        reading.items.map((item) => ({
          contractItemId: item.contractItemId,
          name: item.name,
          amount: item.amount,
          quantity: item.quantity?.toString() ?? null,
          unitPrice: item.unitPrice?.toString() ?? null,
        })),
        contract?.items ?? [],
      ),
    },
  };
}

// 作成の画面操作で届く種別。URL から画面へ渡った値なので、DB の値として正しいかを確かめる。
const utilityTypeSchema = z.enum(["ELECTRICITY", "GAS", "WATER"]);

// S04 の作成を保存する。保存した検針票の使用月を返し、画面操作の入口がその月の記録画面へ戻す。
export async function createMeterReading(
  membership: CurrentMembership,
  utilityTypeInput: unknown,
  input: unknown,
): Promise<string> {
  const utilityTypeResult = utilityTypeSchema.safeParse(utilityTypeInput);
  if (!utilityTypeResult.success) throw Errors.VALIDATION_ERROR();
  const utilityType = utilityTypeResult.data;
  const parsed = parseInput(input);
  assertUsageMonthInRange(parsed.usageMonth);
  const contract = await findContract(membership, utilityType, parsed.contractId);
  // 画面を開いた後に家族が同じ月を登録した場合も、保存の前に止める。
  await assertNoDuplicate(membership.householdId, utilityType, parsed.usageMonth, null);
  const items = toItemsForSave(parsed, contract, []);
  // 種別は選んだ契約の種別と同じ値を入れる（契約を種別で絞って探しているので一致する）。
  const created = await createMeterReadingRow(
    { ...toRowValues(parsed), householdId: membership.householdId, utilityType },
    items,
  );
  // 事前の確かめの後に同じ月が保存され、DB が断った場合も同じ文言で知らせる。
  if (!created) throw duplicateError(utilityType, parsed.usageMonth);
  return parsed.usageMonth;
}

// S04 の編集を保存する。保存した検針票の使用月を返す。
export async function updateMeterReading(
  membership: CurrentMembership,
  id: string,
  input: unknown,
): Promise<string> {
  const parsed = parseInput(input);
  // 先に世帯の検針票か確かめ、他世帯の ID を更新対象にしない。種別は保存済みの値から決める。
  const existing = await findMeterReadingWithItems(id, membership.householdId);
  if (!existing)
    throw Errors.NOT_FOUND(undefined, { meterReadingId: id, householdId: membership.householdId });
  const utilityType = existing.utilityType;
  assertUsageMonthInRange(parsed.usageMonth);
  const contract = await findContract(membership, utilityType, parsed.contractId);
  // 使用月を変えたときに、別の検針票とぶつからないかを確かめる。
  await assertNoDuplicate(membership.householdId, utilityType, parsed.usageMonth, id);
  // 保存済みの内訳の項目名・分類は、保存済みの控えをそのまま使う。
  const items = toItemsForSave(parsed, contract, existing.items);
  const result = await updateMeterReadingRow(
    id,
    membership.householdId,
    toRowValues(parsed),
    items,
  );
  if (result === "not_found")
    throw Errors.NOT_FOUND(undefined, { meterReadingId: id, householdId: membership.householdId });
  if (result === "duplicate") throw duplicateError(utilityType, parsed.usageMonth);
  return parsed.usageMonth;
}

// S04 の検針票を、内訳とあわせて削除する。消した検針票の使用月を返し、画面操作の入口がその月の記録画面へ戻す。
export async function deleteMeterReading(
  membership: CurrentMembership,
  id: string,
): Promise<string> {
  // householdId も条件にして、他世帯の検針票は見つからない扱いにする。
  const usageMonth = await deleteMeterReadingRow(id, membership.householdId);
  if (!usageMonth)
    throw Errors.NOT_FOUND(undefined, { meterReadingId: id, householdId: membership.householdId });
  return dbDateToYearMonth(usageMonth);
}
