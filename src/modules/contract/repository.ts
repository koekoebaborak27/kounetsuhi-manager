// 契約の DB の読み書き。世帯や契約の ID を受け取り、必要な行だけを Prisma で扱う。
import "server-only";
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { prisma } from "@/shared/db/client";
import type { ContractItemValue } from "./item-catalog";
import { planContractItemChanges } from "./item-rules";

// トランザクションの中で使う Prisma の型。内訳項目の反映を契約の保存と同じトランザクションで行うために受け渡す。
type Transaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// 契約の基本項目。作成と更新で同じ形を使う。
type ContractValues = {
  utilityType: UtilityType;
  companyName: string;
  planName: string | null;
  startDate: Date;
  endDate: Date | null;
  memo: string | null;
};

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

// 世帯の同じ種別の契約を、選択中の内訳項目（表示順）とあわせて取り出す。検針票の入力画面で使う。
// 外した内訳項目は、以後の検針票の入力画面に並べないため含めない。
export async function findContractsWithActiveItemsByType(
  householdId: string,
  utilityType: UtilityType,
) {
  return prisma.contract.findMany({
    where: { householdId, utilityType },
    include: {
      items: {
        where: { removedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, category: true },
      },
    },
  });
}

// 契約の選択中の内訳項目を、表示順に取り出す。外した項目は含めない。
export async function findActiveContractItemsByContractId(contractId: string) {
  return prisma.contractItem.findMany({
    where: { contractId, removedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { name: true, category: true, isCustom: true },
  });
}

// 画面の一覧どおりに、契約の内訳項目を作る・戻す・外す。表示順は 1 から振り直す。
// 検針票の内訳から参照されているため、外した項目は行を消さず removedAt に日時を入れる。
async function saveContractItems(
  tx: Transaction,
  contractId: string,
  items: readonly ContractItemValue[],
): Promise<void> {
  // 同じ名前の外した行を選び直せるよう、外した行も含めて読む。
  const existing = await tx.contractItem.findMany({
    where: { contractId },
    select: { id: true, name: true, removedAt: true },
  });
  const changes = planContractItemChanges(existing, items);
  // 一覧に無かった行を外す。同じ保存で外したものは同じ日時にそろえる。
  if (changes.removeIds.length > 0) {
    await tx.contractItem.updateMany({
      where: { id: { in: changes.removeIds }, contractId },
      data: { removedAt: new Date() },
    });
  }
  // 一覧に残った行と選び直した行は、removedAt を空にして分類・表示順を選び直した内容にする。
  for (const { id, ...data } of changes.updates) {
    await tx.contractItem.update({ where: { id }, data: { ...data, removedAt: null } });
  }
  // 新しく加えた項目の行を作る。
  if (changes.creates.length > 0) {
    await tx.contractItem.createMany({
      data: changes.creates.map((item) => ({ ...item, contractId })),
    });
  }
}

// 契約を 1 件作り、選んだ内訳項目も同じトランザクションで作る。
export async function createContract(
  input: ContractValues & { householdId: string },
  items: readonly ContractItemValue[],
) {
  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.create({ data: input });
    await saveContractItems(tx, contract.id, items);
    return contract;
  });
}

// 世帯に属する契約と内訳項目を、1 つのトランザクションで更新する。更新対象が無いときは false を返す。
// 登録済みの検針票（MeterReading・MeterReadingItem）には触らない。
export async function updateContractByIdAndHouseholdId(
  id: string,
  householdId: string,
  input: ContractValues,
  items: readonly ContractItemValue[],
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // householdId も条件にして、他世帯の契約とその内訳項目を更新しない。
    const updated = await tx.contract.updateMany({ where: { id, householdId }, data: input });
    if (updated.count !== 1) return false;
    await saveContractItems(tx, id, items);
    return true;
  });
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
    // 検針票が無い契約なので、外した行も含めて内訳項目を一緒に消せる。
    await tx.contractItem.deleteMany({ where: { contractId: id } });
    await tx.contract.delete({ where: { id } });
    return true;
  });
}
