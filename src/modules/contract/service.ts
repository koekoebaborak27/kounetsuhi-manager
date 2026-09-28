// 契約の業務処理。所属する世帯の契約だけを扱い、画面に渡せる形へ整える。
import "server-only";
import type { z } from "zod";
import { dateOnlyToDbDate, dbDateToDateOnly, todayInJapan } from "@/shared/date/date-only";
import { Errors, AppError } from "@/shared/errors/app-error";
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import type { CurrentMembership } from "@/modules/household";
import {
  createContract as createContractRow,
  deleteContractByIdAndHouseholdId,
  findContractByIdAndHouseholdId,
  findContractsByHouseholdId,
  hasMeterReadingsByContractId,
  updateContractByIdAndHouseholdId,
} from "./repository";
import {
  findOverlappingContracts,
  formatContractName,
  formatContractPeriod,
  isActiveContract,
  sortContracts,
} from "./contract-rules";
import type { ContractFormData, ContractFormContract, ContractList } from "./types";
import { contractFormSchema, CONTRACT_MESSAGES } from "./validation";

// 入力をスキーマで確かめ、通れば空白を除いた保存用の値を返す。
function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw Errors.VALIDATION_ERROR(result.error.issues[0]?.message);
  return result.data;
}

// DB の契約を、日付文字列を使う画面・判定用の形へ変える。
function toFormContract(
  contract: Awaited<ReturnType<typeof findContractsByHouseholdId>>[number],
): ContractFormContract {
  return {
    id: contract.id,
    utilityType: contract.utilityType,
    companyName: contract.companyName,
    planName: contract.planName,
    startDate: dbDateToDateOnly(contract.startDate),
    endDate: contract.endDate ? dbDateToDateOnly(contract.endDate) : null,
    memo: contract.memo,
  };
}

// S07 の契約一覧を、契約中・終了済みに分けて返す。
export async function getContractList(membership: CurrentMembership): Promise<ContractList> {
  const contracts = (await findContractsByHouseholdId(membership.householdId)).map(toFormContract);
  const today = todayInJapan();
  const items = sortContracts(contracts, today).map((contract) => ({
    id: contract.id,
    utilityType: contract.utilityType,
    name: formatContractName(contract),
    period: formatContractPeriod(contract),
    active: isActiveContract(contract, today),
  }));
  return {
    active: items.filter((item) => item.active),
    ended: items.filter((item) => !item.active),
  };
}

// S08 の新規登録・編集表示に必要な値を返す。他世帯の ID または存在しない ID は null を返す。
export async function getContractForm(
  membership: CurrentMembership,
  id?: string,
): Promise<ContractFormData | null> {
  const contracts = (await findContractsByHouseholdId(membership.householdId)).map(toFormContract);
  if (!id) return { id: null, contract: null, contracts, hasMeterReadings: false };
  const contract = contracts.find((item) => item.id === id);
  if (!contract) return null;
  const hasMeterReadings = await hasMeterReadingsByContractId(id);
  return { id, contract, contracts, hasMeterReadings };
}

// S08 の新規登録を保存する。
export async function createContract(membership: CurrentMembership, input: unknown): Promise<void> {
  const parsed = parseInput(contractFormSchema, input);
  await createContractRow({
    householdId: membership.householdId,
    utilityType: parsed.utilityType as UtilityType,
    companyName: parsed.companyName,
    planName: parsed.planName || null,
    startDate: dateOnlyToDbDate(parsed.startDate),
    endDate: parsed.endDate ? dateOnlyToDbDate(parsed.endDate) : null,
    memo: parsed.memo || null,
  });
}

// S08 の編集内容を保存する。検針票がある契約は、保存直前にも種別変更を止める。
export async function updateContract(
  membership: CurrentMembership,
  id: string,
  input: unknown,
): Promise<void> {
  const parsed = parseInput(contractFormSchema, input);
  // 先に世帯の契約か確かめ、他世帯の ID を更新対象にしない。
  const existing = await findContractByIdAndHouseholdId(id, membership.householdId);
  if (!existing)
    throw Errors.NOT_FOUND(undefined, { contractId: id, householdId: membership.householdId });
  // 画面を開いた後に検針票が追加された場合も、種別を変えない。
  if (existing.utilityType !== parsed.utilityType && (await hasMeterReadingsByContractId(id))) {
    throw new AppError("CONTRACT_UTILITY_TYPE_LOCKED", 409, CONTRACT_MESSAGES.utilityTypeLocked, {
      contractId: id,
    });
  }
  const updated = await updateContractByIdAndHouseholdId(id, membership.householdId, {
    utilityType: parsed.utilityType as UtilityType,
    companyName: parsed.companyName,
    planName: parsed.planName || null,
    startDate: dateOnlyToDbDate(parsed.startDate),
    endDate: parsed.endDate ? dateOnlyToDbDate(parsed.endDate) : null,
    memo: parsed.memo || null,
  });
  if (!updated)
    throw Errors.NOT_FOUND(undefined, { contractId: id, householdId: membership.householdId });
}

// S08 の契約を削除する。検針票が 1 件でもある契約は、履歴を守るため削除させない。
export async function deleteContract(membership: CurrentMembership, id: string): Promise<void> {
  const existing = await findContractByIdAndHouseholdId(id, membership.householdId);
  if (!existing)
    throw Errors.NOT_FOUND(undefined, { contractId: id, householdId: membership.householdId });
  // 確認画面を開いた後に検針票が追加された場合も、履歴を失わないよう削除を止める。
  if (await hasMeterReadingsByContractId(id)) {
    throw new AppError(
      "CONTRACT_DELETE_LOCKED",
      409,
      "検針票が登録済みのため、契約は削除できません。",
      {
        contractId: id,
      },
    );
  }
  const deleted = await deleteContractByIdAndHouseholdId(id, membership.householdId);
  if (!deleted)
    throw Errors.NOT_FOUND(undefined, { contractId: id, householdId: membership.householdId });
}

// 入力中の値と同じ世帯の契約を比べ、重なる契約の表示名を返す。
export function getOverlapNames(
  contract: ContractFormContract,
  contracts: readonly ContractFormContract[],
): string[] {
  return findOverlappingContracts(contract, contracts).map(formatContractName);
}
