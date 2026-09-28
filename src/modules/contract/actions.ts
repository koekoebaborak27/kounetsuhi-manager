"use server";
// 契約の画面操作の入口。操作のたびに所属を確かめ、保存できたら設定画面へ戻す。
import { redirect } from "next/navigation";
import { requireMembership } from "@/modules/household";
import { withAction } from "@/shared/observability/with-action";
import { createContract, deleteContract, updateContract } from "./service";
import type { ContractInput } from "./validation";

// S07 設定の URL。S08 の保存成功後は必ずここへ戻る。
const SETTINGS_PATH = "/settings";

// S08 の新規登録を保存する。
export const createContractAction = withAction("contract.create", async (input: ContractInput) => {
  const membership = await requireMembership();
  await createContract(membership, input);
  redirect(SETTINGS_PATH);
});

// S08 の編集を保存する。
export const updateContractAction = withAction(
  "contract.update",
  async (id: string, input: ContractInput) => {
    const membership = await requireMembership();
    await updateContract(membership, id, input);
    redirect(SETTINGS_PATH);
  },
);

// S08 の契約を削除する。
export const deleteContractAction = withAction("contract.delete", async (id: string) => {
  const membership = await requireMembership();
  await deleteContract(membership, id);
  redirect(SETTINGS_PATH);
});
