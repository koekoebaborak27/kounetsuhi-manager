// 契約の表示と判定に使う純粋関数。画面・サービスで同じ基準を使い、日付の扱いをそろえる。
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { UTILITY_TYPES } from "@/shared/ui/utility-dot";

// 契約一覧と重なり判定で必要な値。
export type ContractRuleTarget = {
  id: string;
  utilityType: UtilityType;
  companyName: string;
  planName: string | null;
  startDate: string;
  endDate: string | null;
};

// 終了日が今日以降、または空なら契約中と判定する。
export function isActiveContract(
  contract: Pick<ContractRuleTarget, "endDate">,
  today: string,
): boolean {
  return contract.endDate === null || contract.endDate >= today;
}

// 会社名と、空でなければプラン名を半角空白でつないで表示する。
export function formatContractName(
  contract: Pick<ContractRuleTarget, "companyName" | "planName">,
): string {
  return contract.planName ? `${contract.companyName} ${contract.planName}` : contract.companyName;
}

// 開始日と、空でなければ終了日を画面に出す形へ整える。
export function formatContractPeriod(
  contract: Pick<ContractRuleTarget, "startDate" | "endDate">,
): string {
  const format = (value: string) => value.replaceAll("-", "/");
  return `${format(contract.startDate)}〜${contract.endDate ? format(contract.endDate) : ""}`;
}

// 2 つの契約期間が 1 日でも重なるかを返す。終了日が空なら、終わりのない期間として扱う。
export function periodsOverlap(
  first: Pick<ContractRuleTarget, "startDate" | "endDate">,
  second: Pick<ContractRuleTarget, "startDate" | "endDate">,
): boolean {
  return (
    (first.endDate === null || first.endDate >= second.startDate) &&
    (second.endDate === null || second.endDate >= first.startDate)
  );
}

// 同じ種別で、自分以外の契約期間が重なる契約だけを返す。
export function findOverlappingContracts(
  target: ContractRuleTarget,
  contracts: readonly ContractRuleTarget[],
): ContractRuleTarget[] {
  return contracts.filter(
    (contract) =>
      contract.id !== target.id &&
      contract.utilityType === target.utilityType &&
      periodsOverlap(target, contract),
  );
}

// 契約中・終了済みに分け、種別の順、同じ種別では開始日が新しい順に並べる。
export function sortContracts(
  contracts: readonly ContractRuleTarget[],
  today: string,
): ContractRuleTarget[] {
  const utilityOrder = new Map(UTILITY_TYPES.map((utilityType, index) => [utilityType, index]));
  return [...contracts].sort((first, second) => {
    const activeDifference =
      Number(isActiveContract(second, today)) - Number(isActiveContract(first, today));
    if (activeDifference !== 0) return activeDifference;
    const utilityDifference =
      (utilityOrder.get(first.utilityType) ?? 0) - (utilityOrder.get(second.utilityType) ?? 0);
    if (utilityDifference !== 0) return utilityDifference;
    return second.startDate.localeCompare(first.startDate);
  });
}
