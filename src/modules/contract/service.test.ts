/**
 * 対象: contract/service
 * 目的: 世帯で絞った契約の一覧・表示・保存と、種別変更のロックを担保する
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/shared/errors/app-error";
import type { CurrentMembership } from "@/modules/household";
import { CONTRACT_MESSAGES } from "./validation";

vi.mock("server-only", () => ({}));
const repo = {
  createContract: vi.fn(),
  deleteContractByIdAndHouseholdId: vi.fn(),
  findContractByIdAndHouseholdId: vi.fn(),
  findContractsByHouseholdId: vi.fn(),
  hasMeterReadingsByContractId: vi.fn(),
  updateContractByIdAndHouseholdId: vi.fn(),
};
vi.mock("./repository", () => repo);

const { createContract, deleteContract, getContractForm, getContractList, updateContract } =
  await import("./service");
const membership: CurrentMembership = { userId: "u1", householdId: "h1", role: "OWNER" };
const row = (override: Record<string, unknown> = {}) => ({
  id: "c1",
  householdId: "h1",
  utilityType: "ELECTRICITY",
  companyName: "さくら電力",
  planName: "従量電灯B",
  startDate: new Date("2024-04-01T00:00:00.000Z"),
  endDate: null,
  memo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...override,
});
const input = {
  utilityType: "ELECTRICITY",
  companyName: " さくら電力 ",
  planName: " ",
  startDate: "2024-04-01",
  endDate: "",
  memo: " ",
};
const catchError = async (promise: Promise<unknown>) => {
  const error = await promise.catch((value: unknown) => value);
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
};

describe("contract/service", () => {
  beforeEach(() => Object.values(repo).forEach((fn) => fn.mockReset()));
  describe("getContractList", () => {
    it("所属する世帯の契約を、契約中と終了済みに分けて画面用に返す", async () => {
      repo.findContractsByHouseholdId.mockResolvedValue([
        row(),
        row({ id: "c2", endDate: new Date("2020-03-31T00:00:00.000Z") }),
      ]);
      const result = await getContractList(membership);
      expect(repo.findContractsByHouseholdId).toHaveBeenCalledWith("h1");
      expect(result.active[0]).toMatchObject({
        id: "c1",
        name: "さくら電力 従量電灯B",
        period: "2024/04/01〜",
      });
      expect(result.ended[0]?.id).toBe("c2");
    });
  });
  describe("getContractForm", () => {
    it("他世帯のIDまたは存在しないIDなら null を返す", async () => {
      repo.findContractsByHouseholdId.mockResolvedValue([row()]);
      await expect(getContractForm(membership, "other")).resolves.toBeNull();
    });
    it("編集対象と同じ世帯の契約、検針票の有無を返す", async () => {
      repo.findContractsByHouseholdId.mockResolvedValue([row()]);
      repo.hasMeterReadingsByContractId.mockResolvedValue(true);
      await expect(getContractForm(membership, "c1")).resolves.toMatchObject({
        id: "c1",
        hasMeterReadings: true,
        contract: { startDate: "2024-04-01" },
      });
    });
  });
  describe("createContract", () => {
    it("前後の空白を除き、空になった任意項目をnullにして所属する世帯へ作る", async () => {
      await createContract(membership, input);
      expect(repo.createContract).toHaveBeenCalledWith(
        expect.objectContaining({
          householdId: "h1",
          companyName: "さくら電力",
          planName: null,
          memo: null,
          startDate: new Date("2024-04-01T00:00:00.000Z"),
        }),
      );
    });
  });
  describe("updateContract", () => {
    it("契約が無いときはAppError(NOT_FOUND)を投げる", async () => {
      repo.findContractByIdAndHouseholdId.mockResolvedValue(null);
      await expect(catchError(updateContract(membership, "missing", input))).resolves.toMatchObject(
        { code: "NOT_FOUND" },
      );
    });
    it("検針票があり種別を変えるときはAppError(CONTRACT_UTILITY_TYPE_LOCKED)を投げる", async () => {
      repo.findContractByIdAndHouseholdId.mockResolvedValue(row());
      repo.hasMeterReadingsByContractId.mockResolvedValue(true);
      const error = await catchError(
        updateContract(membership, "c1", { ...input, utilityType: "GAS" }),
      );
      expect(error).toMatchObject({
        code: "CONTRACT_UTILITY_TYPE_LOCKED",
        userMessage: CONTRACT_MESSAGES.utilityTypeLocked,
      });
      expect(repo.updateContractByIdAndHouseholdId).not.toHaveBeenCalled();
    });
    it("検針票が無ければ種別を含めて更新する", async () => {
      repo.findContractByIdAndHouseholdId.mockResolvedValue(row());
      repo.hasMeterReadingsByContractId.mockResolvedValue(false);
      repo.updateContractByIdAndHouseholdId.mockResolvedValue(true);
      await updateContract(membership, "c1", { ...input, utilityType: "GAS" });
      expect(repo.updateContractByIdAndHouseholdId).toHaveBeenCalledWith(
        "c1",
        "h1",
        expect.objectContaining({ utilityType: "GAS" }),
      );
    });
  });
  describe("deleteContract", () => {
    it("検針票が無い契約を、所属する世帯の条件で削除する", async () => {
      repo.findContractByIdAndHouseholdId.mockResolvedValue(row());
      repo.hasMeterReadingsByContractId.mockResolvedValue(false);
      repo.deleteContractByIdAndHouseholdId.mockResolvedValue(true);
      await deleteContract(membership, "c1");
      expect(repo.deleteContractByIdAndHouseholdId).toHaveBeenCalledWith("c1", "h1");
    });
    it("検針票がある契約はAppError(CONTRACT_DELETE_LOCKED)を投げ、削除しない", async () => {
      repo.findContractByIdAndHouseholdId.mockResolvedValue(row());
      repo.hasMeterReadingsByContractId.mockResolvedValue(true);
      const error = await catchError(deleteContract(membership, "c1"));
      expect(error).toMatchObject({
        code: "CONTRACT_DELETE_LOCKED",
        userMessage: "検針票が登録済みのため、契約は削除できません。",
      });
      expect(repo.deleteContractByIdAndHouseholdId).not.toHaveBeenCalled();
    });
  });
});
