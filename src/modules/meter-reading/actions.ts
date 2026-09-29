"use server";
// 検針票の画面操作の入口。操作のたびに所属を確かめ、保存できたら保存した検針票の使用月の記録画面へ戻す。
import { redirect } from "next/navigation";
import { requireMembership } from "@/modules/household";
import { withAction } from "@/shared/observability/with-action";
import { recordsHref } from "./reading-rules";
import { createMeterReading, deleteMeterReading, updateMeterReading } from "./service";
import type { MeterReadingInput } from "./validation";

// S04 の作成を保存する。種別は作成画面の URL で決まった値を受け取り、サービスで確かめる。
export const createMeterReadingAction = withAction(
  "meterReading.create",
  async (utilityType: string, input: MeterReadingInput) => {
    const membership = await requireMembership();
    const usageMonth = await createMeterReading(membership, utilityType, input);
    redirect(recordsHref(usageMonth));
  },
);

// S04 の編集を保存する。
export const updateMeterReadingAction = withAction(
  "meterReading.update",
  async (id: string, input: MeterReadingInput) => {
    const membership = await requireMembership();
    const usageMonth = await updateMeterReading(membership, id, input);
    redirect(recordsHref(usageMonth));
  },
);

// S04 の検針票を削除する。削除できたら、その検針票の使用月の記録画面へ戻す。
export const deleteMeterReadingAction = withAction("meterReading.delete", async (id: string) => {
  const membership = await requireMembership();
  const usageMonth = await deleteMeterReading(membership, id);
  redirect(recordsHref(usageMonth));
});
