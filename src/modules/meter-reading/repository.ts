// 検針票の DB の読み書き。世帯の ID を必ず条件に入れ、必要な行だけを Prisma で扱う。
import "server-only";
import { Prisma } from "@/shared/db/generated/prisma/client";
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { prisma } from "@/shared/db/client";
import type { ItemForSave } from "./reading-rules";

// 検針票の基本の項目。作成と更新で同じ形を使う。小数は誤差を避けるため文字列のまま Decimal の列へ渡す。
type MeterReadingValues = {
  contractId: string;
  usageMonth: Date;
  billingMonth: Date | null;
  amount: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  usage: string | null;
  memo: string | null;
};

// DB の一意の条件（同じ世帯・種別・使用月で 1 件）に当たったエラーかどうかを返す。
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// 指定した月（複数）の世帯の検針票を取り出す。S05 記録で、表示中の月と前月を一度に読むために使う。
export async function findMeterReadingsByMonths(householdId: string, usageMonths: Date[]) {
  return prisma.meterReading.findMany({
    where: { householdId, usageMonth: { in: usageMonths } },
    select: { id: true, utilityType: true, usageMonth: true, amount: true },
  });
}

// 世帯のすべての検針票を、ホームの計算に使う列だけ取り出す。1 世帯の検針票は年に 30 件ほどなので、絞り込まずにすべて読む。
export async function findMeterReadingsForHome(householdId: string) {
  return prisma.meterReading.findMany({
    where: { householdId },
    select: {
      utilityType: true,
      usageMonth: true,
      amount: true,
      periodStart: true,
      periodEnd: true,
    },
  });
}

// 世帯の同じ種別・同じ使用月の検針票の ID を返す。無ければ null。1 件の制約の確かめと、作成から編集への切り替えに使う。
export async function findMeterReadingIdByMonth(
  householdId: string,
  utilityType: UtilityType,
  usageMonth: Date,
): Promise<string | null> {
  const reading = await prisma.meterReading.findUnique({
    where: { householdId_utilityType_usageMonth: { householdId, utilityType, usageMonth } },
    select: { id: true },
  });
  return reading?.id ?? null;
}

// 契約の検針票を、初期値の計算に使う列だけ取り出す。直前の検針票はサービスで選ぶ。
export async function findMeterReadingsByContractId(householdId: string, contractId: string) {
  return prisma.meterReading.findMany({
    where: { householdId, contractId },
    select: { usageMonth: true, billingMonth: true, periodEnd: true },
  });
}

// 世帯の検針票を、内訳（保存した順）とあわせて 1 件取り出す。他世帯の ID は null になる。
export async function findMeterReadingWithItems(id: string, householdId: string) {
  return prisma.meterReading.findFirst({
    where: { id, householdId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
}

// 検針票を 1 件作り、内訳も同じトランザクションで作る。
// 同じ種別・使用月の検針票が同時に保存されて DB が断ったときは null を返し、サービスが文言を付けて知らせる。
export async function createMeterReading(
  input: MeterReadingValues & { householdId: string; utilityType: UtilityType },
  items: readonly ItemForSave[],
): Promise<{ id: string } | null> {
  // 事前の確かめと保存の間に家族が同じ月を保存した場合だけ、DB の一意の条件で断られる。
  // 業務のコードに try/catch は書かない決まりだが、このエラーだけは画面の文言に置き換える必要があるため、ここで受け止める。
  try {
    return await prisma.$transaction(async (tx) => {
      const reading = await tx.meterReading.create({ data: input, select: { id: true } });
      if (items.length > 0) {
        await tx.meterReadingItem.createMany({
          data: items.map((item) => ({ ...item, meterReadingId: reading.id })),
        });
      }
      return reading;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

// 世帯の検針票を更新し、内訳の行を入力画面の内容で置き換える。1 つのトランザクションで行う。
// 更新対象が無いときは "not_found"、使用月を変えて同じ種別・使用月の検針票とぶつかったときは "duplicate" を返す。
export async function updateMeterReading(
  id: string,
  householdId: string,
  input: MeterReadingValues,
  items: readonly ItemForSave[],
): Promise<"updated" | "not_found" | "duplicate"> {
  // 作成と同じ理由で、一意の条件に当たったエラーだけをここで受け止める。
  try {
    return await prisma.$transaction(async (tx) => {
      // householdId も条件にして、他世帯の検針票を更新しない。
      const updated = await tx.meterReading.updateMany({ where: { id, householdId }, data: input });
      if (updated.count !== 1) return "not_found";
      // 内訳は差分を取らず、この検針票の行をすべて消してから作り直す（設計書「DB への影響」のとおり）。
      await tx.meterReadingItem.deleteMany({ where: { meterReadingId: id } });
      if (items.length > 0) {
        await tx.meterReadingItem.createMany({
          data: items.map((item) => ({ ...item, meterReadingId: id })),
        });
      }
      return "updated";
    });
  } catch (error) {
    if (isUniqueViolation(error)) return "duplicate";
    throw error;
  }
}

// 世帯の検針票と、その内訳の行を 1 つのトランザクションで消す。消した検針票の使用月を返し、無ければ null を返す。
export async function deleteMeterReading(id: string, householdId: string): Promise<Date | null> {
  return prisma.$transaction(async (tx) => {
    // 検針票がこの世帯のものかを、内訳の行を消す前に確かめる。
    const reading = await tx.meterReading.findFirst({
      where: { id, householdId },
      select: { usageMonth: true },
    });
    if (!reading) return null;
    // 内訳の行は検針票を参照しているため、先に消す。
    await tx.meterReadingItem.deleteMany({ where: { meterReadingId: id } });
    await tx.meterReading.delete({ where: { id } });
    return reading.usageMonth;
  });
}
