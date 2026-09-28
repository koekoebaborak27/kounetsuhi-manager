// 契約の DB の読み書き。世帯や契約の ID を受け取り、必要な行だけを Prisma で扱う。
import "server-only";
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { prisma } from "@/shared/db/client";

// 世帯の契約をすべて取り出す。並びと表示用の加工は service 側で行う。
export async function findContractsByHouseholdId(householdId: string) {
  return prisma.contract.findMany({ where: { householdId } });
}

// 世帯に属する契約を 1 件取り出す。他世帯の ID は null になるよう householdId も条件にする。
export async function findContractByIdAndHouseholdId(id: string, householdId: string) {
  return prisma.contract.findFirst({ where: { id, householdId } });
}

// 契約に検針票が 1 件でもあるかを返す。種別を変更できるかの判定に使う。
export async function hasMeterReadingsByContractId(contractId: string): Promise<boolean> {
  const reading = await prisma.meterReading.findFirst({
    where: { contractId },
    select: { id: true },
  });
  return reading !== null;
}

// 契約を 1 件作る。
export async function createContract(input: {
  householdId: string;
  utilityType: UtilityType;
  companyName: string;
  planName: string | null;
  startDate: Date;
  endDate: Date | null;
  memo: string | null;
}) {
  return prisma.contract.create({ data: input });
}

// 世帯に属する契約を更新する。更新対象が無いときは false を返す。
export async function updateContractByIdAndHouseholdId(
  id: string,
  householdId: string,
  input: {
    utilityType: UtilityType;
    companyName: string;
    planName: string | null;
    startDate: Date;
    endDate: Date | null;
    memo: string | null;
  },
): Promise<boolean> {
  const updated = await prisma.contract.updateMany({ where: { id, householdId }, data: input });
  return updated.count === 1;
}

// 世帯に属する契約と、その内訳項目をまとめて消す。検針票が無いことの確認は service 側で済ませる。
export async function deleteContractByIdAndHouseholdId(
  id: string,
  householdId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // 契約がこの世帯のものかを、内訳項目を消す前に確かめる。
    const contract = await tx.contract.findFirst({
      where: { id, householdId },
      select: { id: true },
    });
    if (!contract) return false;
    // ②で作る内訳項目も、検針票の無い契約と一緒に消せるようにしておく。
    await tx.contractItem.deleteMany({ where: { contractId: id } });
    await tx.contract.delete({ where: { id } });
    return true;
  });
}
