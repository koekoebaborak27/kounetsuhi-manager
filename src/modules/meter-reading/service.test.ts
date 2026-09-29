/**
 * 対象: meter-reading/service
 * 目的: 世帯で絞った記録画面の行・入力画面の初期値・保存時の業務ルール（範囲・契約・1 件の制約・内訳の控え）を担保する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/shared/errors/app-error";
import type { CurrentMembership } from "@/modules/household";
import { METER_READING_MESSAGES } from "./validation";

vi.mock("server-only", () => ({}));
const repo = {
  createMeterReading: vi.fn(),
  deleteMeterReading: vi.fn(),
  findMeterReadingIdByMonth: vi.fn(),
  findMeterReadingsByContractId: vi.fn(),
  findMeterReadingsByMonths: vi.fn(),
  findMeterReadingsForGraphs: vi.fn(),
  findMeterReadingsForHome: vi.fn(),
  findMeterReadingWithItems: vi.fn(),
  updateMeterReading: vi.fn(),
};
vi.mock("./repository", () => repo);
const contractApi = { listContractsForMeterReading: vi.fn() };
vi.mock("@/modules/contract", () => contractApi);

const {
  createMeterReading,
  deleteMeterReading,
  getMeterReadingCreateForm,
  getMeterReadingEditForm,
  getRecordsMonth,
  listMeterReadingsForGraphs,
  listMeterReadingsForHome,
  updateMeterReading,
} = await import("./service");

const membership: CurrentMembership = { userId: "u1", householdId: "h1", role: "OWNER" };
// DB の date 列の値（UTC 午前 0 時）を作る。
const db = (value: string) =>
  new Date(`${value.length === 7 ? `${value}-01` : value}T00:00:00.000Z`);
// 検針票の入力画面で選べる契約。
const contract = (override: Record<string, unknown> = {}) => ({
  id: "c1",
  name: "みなとガス 一般料金",
  startDate: "2024-04-01",
  endDate: null,
  items: [
    { id: "i1", name: "基本料金", category: "BASIC" },
    { id: "i2", name: "従量料金", category: "USAGE" },
  ],
  ...override,
});
// 保存の入力。テストごとに変える項目だけ上書きする。
const input = (override: Record<string, unknown> = {}) => ({
  usageMonth: "2026-08",
  billingMonth: "2026-09",
  contractId: "c1",
  amount: "3,850",
  periodStart: "2026-07-13",
  periodEnd: "2026-08-12",
  usage: "19.4",
  memo: " ",
  items: [
    { contractItemId: "i1", name: "基本料金", amount: "1,056", quantity: "", unitPrice: "" },
    { contractItemId: "i2", name: "従量料金", amount: "", quantity: "", unitPrice: "" },
  ],
  ...override,
});
// 保存済みの検針票（内訳付き）。
const savedReading = (override: Record<string, unknown> = {}) => ({
  id: "r1",
  householdId: "h1",
  contractId: "c1",
  utilityType: "GAS",
  usageMonth: db("2026-08"),
  billingMonth: db("2026-09"),
  amount: 3850,
  periodStart: db("2026-07-13"),
  periodEnd: db("2026-08-12"),
  // Prisma の Decimal の代わり。画面へは toString した文字列を渡す。
  usage: { toString: () => "19.4" },
  memo: null,
  items: [
    {
      contractItemId: "i2",
      name: "従量料金（控え）",
      category: "OTHER",
      amount: 2952,
      quantity: { toString: () => "19.4" },
      unitPrice: null,
      sortOrder: 1,
    },
  ],
  ...override,
});
const catchError = async (promise: Promise<unknown>) => {
  const error = await promise.catch((value: unknown) => value);
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
};

describe("meter-reading/service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // 今日を 2026 年 9 月 15 日（日本時間）に固定する。使用月にできるのは 2026 年 10 月まで。
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-15T03:00:00.000Z"));
    contractApi.listContractsForMeterReading.mockResolvedValue([contract()]);
    repo.findMeterReadingIdByMonth.mockResolvedValue(null);
    repo.findMeterReadingsByContractId.mockResolvedValue([]);
    repo.createMeterReading.mockResolvedValue({ id: "new" });
    repo.updateMeterReading.mockResolvedValue("updated");
  });
  afterEach(() => vi.useRealTimers());

  describe("listMeterReadingsForHome", () => {
    it("所属する世帯の検針票を、年月・日付の文字列に直して返す", async () => {
      repo.findMeterReadingsForHome.mockResolvedValue([
        {
          utilityType: "GAS",
          usageMonth: db("2026-08"),
          amount: 3_850,
          periodStart: db("2026-07-13"),
          periodEnd: null,
        },
      ]);
      expect(await listMeterReadingsForHome(membership)).toEqual([
        {
          utilityType: "GAS",
          usageMonth: "2026-08",
          amount: 3_850,
          periodStart: "2026-07-13",
          periodEnd: null,
        },
      ]);
      expect(repo.findMeterReadingsForHome).toHaveBeenCalledWith("h1");
    });
  });

  describe("listMeterReadingsForGraphs", () => {
    it("所属する世帯の検針票を、年月の文字列と小数 1 桁の使用量の文字列に直して返す。使用量が空なら null", async () => {
      // Prisma の Decimal は toFixed を持つ。テストでは同じ形の小さな代役を使う。
      repo.findMeterReadingsForGraphs.mockResolvedValue([
        {
          utilityType: "ELECTRICITY",
          usageMonth: db("2026-08"),
          amount: 12_640,
          usage: { toFixed: () => "412.0" },
        },
        { utilityType: "GAS", usageMonth: db("2026-08"), amount: 3_850, usage: null },
      ]);
      expect(await listMeterReadingsForGraphs(membership)).toEqual([
        { utilityType: "ELECTRICITY", usageMonth: "2026-08", amount: 12_640, usage: "412.0" },
        { utilityType: "GAS", usageMonth: "2026-08", amount: 3_850, usage: null },
      ]);
      expect(repo.findMeterReadingsForGraphs).toHaveBeenCalledWith("h1");
    });
  });

  describe("getRecordsMonth", () => {
    it("URL に月が無いときは前月を表示し、表示中の月と前月を世帯で絞って読む", async () => {
      repo.findMeterReadingsByMonths.mockResolvedValue([]);
      const view = await getRecordsMonth(membership, undefined);
      expect(view.month).toBe("2026-08");
      expect(repo.findMeterReadingsByMonths).toHaveBeenCalledWith("h1", [
        db("2026-08"),
        db("2026-07"),
      ]);
    });

    it("登録済み・未登録・水道の隔月を種別ごとの行にする", async () => {
      repo.findMeterReadingsByMonths.mockResolvedValue([
        { id: "e8", utilityType: "ELECTRICITY", usageMonth: db("2026-08"), amount: 12640 },
        { id: "g7", utilityType: "GAS", usageMonth: db("2026-07"), amount: 4000 },
        { id: "w7", utilityType: "WATER", usageMonth: db("2026-07"), amount: 11860 },
      ]);
      const view = await getRecordsMonth(membership, "2026-08");
      expect(view.rows).toEqual([
        { utilityType: "ELECTRICITY", reading: { id: "e8", amount: 12640 }, bimonthlySkip: false },
        // ガスは前月が登録済みでも「隔月」にはしない。
        { utilityType: "GAS", reading: null, bimonthlySkip: false },
        { utilityType: "WATER", reading: null, bimonthlySkip: true },
      ]);
    });

    it("2000 年 1 月では前の月へ、翌月では次の月へ移れない", async () => {
      repo.findMeterReadingsByMonths.mockResolvedValue([]);
      expect((await getRecordsMonth(membership, "2000-01")).prevMonth).toBeNull();
      const last = await getRecordsMonth(membership, "2026-10");
      expect(last.nextMonth).toBeNull();
      expect(last.prevMonth).toBe("2026-09");
    });
  });

  describe("getMeterReadingCreateForm", () => {
    it("種別・使用月が正しくない、または範囲の外なら null を返し、DB は読まない", async () => {
      expect(await getMeterReadingCreateForm(membership, "gass", "2026-08", false)).toBeNull();
      expect(await getMeterReadingCreateForm(membership, "gas", "2026-11", false)).toBeNull();
      expect(await getMeterReadingCreateForm(membership, "gas", undefined, false)).toBeNull();
      expect(repo.findMeterReadingIdByMonth).not.toHaveBeenCalled();
    });

    it("同じ種別・使用月の検針票があれば、その ID を返して編集へ移す", async () => {
      repo.findMeterReadingIdByMonth.mockResolvedValue("r1");
      expect(await getMeterReadingCreateForm(membership, "gas", "2026-08", false)).toEqual({
        kind: "existing",
        id: "r1",
      });
      expect(repo.findMeterReadingIdByMonth).toHaveBeenCalledWith("h1", "GAS", db("2026-08"));
    });

    it("契約中の契約と、その契約の直前の検針票から初期値を入れる", async () => {
      contractApi.listContractsForMeterReading.mockResolvedValue([
        contract({ id: "c2", startDate: "2026-04-01" }),
        contract({ id: "c1", startDate: "2020-01-01", endDate: "2026-03-31" }),
      ]);
      repo.findMeterReadingsByContractId.mockResolvedValue([
        { usageMonth: db("2026-06"), billingMonth: db("2026-07"), periodEnd: db("2026-06-12") },
        { usageMonth: db("2026-07"), billingMonth: db("2026-08"), periodEnd: db("2026-07-12") },
      ]);
      const result = await getMeterReadingCreateForm(membership, "gas", "2026-08", false);
      if (result?.kind !== "form") throw new Error("作成画面の値が返っていない");
      expect(repo.findMeterReadingsByContractId).toHaveBeenCalledWith("h1", "c2");
      expect(result.data).toMatchObject({
        id: null,
        utilityType: "GAS",
        cancelHref: "/records?month=2026-08",
        usageMonthMax: "2026-10",
        billingMonthMax: "2027-12",
      });
      expect(result.data.values).toMatchObject({
        usageMonth: "2026-08",
        billingMonth: "2026-09",
        contractId: "c2",
        periodStart: "2026-07-13",
        periodEnd: "2026-08-12",
        amount: "",
      });
      expect(result.data.values.items.map((item) => item.contractItemId)).toEqual(["i1", "i2"]);
    });

    it("契約中の契約が無ければ契約・内訳を空にし、ホームから開いたらキャンセルでホームへ戻す", async () => {
      contractApi.listContractsForMeterReading.mockResolvedValue([
        contract({ startDate: "2026-09-01" }),
      ]);
      const result = await getMeterReadingCreateForm(membership, "gas", "2026-08", true);
      if (result?.kind !== "form") throw new Error("作成画面の値が返っていない");
      expect(result.data.cancelHref).toBe("/");
      expect(result.data.values).toMatchObject({ contractId: "", billingMonth: "", items: [] });
      expect(repo.findMeterReadingsByContractId).not.toHaveBeenCalled();
    });
  });

  describe("getMeterReadingEditForm", () => {
    it("世帯に無い ID は null を返す", async () => {
      repo.findMeterReadingWithItems.mockResolvedValue(null);
      expect(await getMeterReadingEditForm(membership, "other", false)).toBeNull();
      expect(repo.findMeterReadingWithItems).toHaveBeenCalledWith("other", "h1");
    });

    it("保存済みの値を文字列で入れ、保存済みの内訳の後ろにまだ無い内訳項目を並べる", async () => {
      repo.findMeterReadingWithItems.mockResolvedValue(savedReading());
      const data = await getMeterReadingEditForm(membership, "r1", false);
      expect(contractApi.listContractsForMeterReading).toHaveBeenCalledWith(membership, "GAS");
      expect(data?.values).toMatchObject({
        usageMonth: "2026-08",
        billingMonth: "2026-09",
        amount: "3850",
        usage: "19.4",
        memo: "",
      });
      expect(data?.values.items).toEqual([
        {
          contractItemId: "i2",
          name: "従量料金（控え）",
          amount: "2952",
          quantity: "19.4",
          unitPrice: "",
        },
        { contractItemId: "i1", name: "基本料金", amount: "", quantity: "", unitPrice: "" },
      ]);
    });
  });

  describe("createMeterReading", () => {
    describe("正常系", () => {
      it("世帯・種別を付けて保存し、内訳は金額を入れた行だけを契約の値で控える", async () => {
        expect(await createMeterReading(membership, "GAS", input())).toBe("2026-08");
        expect(repo.createMeterReading).toHaveBeenCalledWith(
          {
            householdId: "h1",
            utilityType: "GAS",
            contractId: "c1",
            usageMonth: db("2026-08"),
            billingMonth: db("2026-09"),
            amount: 3850,
            periodStart: db("2026-07-13"),
            periodEnd: db("2026-08-12"),
            usage: "19.4",
            memo: null,
          },
          [
            {
              contractItemId: "i1",
              name: "基本料金",
              category: "BASIC",
              amount: 1056,
              quantity: null,
              unitPrice: null,
              sortOrder: 1,
            },
          ],
        );
      });
    });

    describe("異常系", () => {
      it("種別が正しくなければ AppError(VALIDATION_ERROR) を投げる", async () => {
        const error = await catchError(createMeterReading(membership, "OIL", input()));
        expect(error.code).toBe("VALIDATION_ERROR");
      });

      it("入力チェックに通らなければ AppError(VALIDATION_ERROR) を投げ、保存しない", async () => {
        const error = await catchError(
          createMeterReading(membership, "GAS", input({ amount: "" })),
        );
        expect(error.code).toBe("VALIDATION_ERROR");
        expect(error.userMessage).toBe(METER_READING_MESSAGES.amountRequired);
        expect(repo.createMeterReading).not.toHaveBeenCalled();
      });

      it("使用月が範囲の外なら AppError(METER_READING_USAGE_MONTH_OUT_OF_RANGE) を投げる", async () => {
        const error = await catchError(
          createMeterReading(membership, "GAS", input({ usageMonth: "2026-11" })),
        );
        expect(error.code).toBe("METER_READING_USAGE_MONTH_OUT_OF_RANGE");
        expect(error.userMessage).toBe(METER_READING_MESSAGES.usageMonthOutOfRange);
      });

      it("世帯の同じ種別に無い契約なら AppError(METER_READING_CONTRACT_NOT_FOUND) を投げる", async () => {
        const error = await catchError(
          createMeterReading(membership, "GAS", input({ contractId: "other" })),
        );
        expect(error.code).toBe("METER_READING_CONTRACT_NOT_FOUND");
        expect(error.userMessage).toBe(METER_READING_MESSAGES.contractNotFound);
        expect(contractApi.listContractsForMeterReading).toHaveBeenCalledWith(membership, "GAS");
      });

      it("同じ種別・使用月がすでにあれば AppError(METER_READING_DUPLICATE) を投げ、保存しない", async () => {
        repo.findMeterReadingIdByMonth.mockResolvedValue("r1");
        const error = await catchError(createMeterReading(membership, "GAS", input()));
        expect(error.code).toBe("METER_READING_DUPLICATE");
        expect(error.userMessage).toBe("2026年8月分のガスの検針票はすでに登録されています。");
        expect(repo.createMeterReading).not.toHaveBeenCalled();
      });

      it("確かめた後に同じ月が保存されて DB が断ったときも AppError(METER_READING_DUPLICATE) を投げる", async () => {
        repo.createMeterReading.mockResolvedValue(null);
        const error = await catchError(createMeterReading(membership, "GAS", input()));
        expect(error.code).toBe("METER_READING_DUPLICATE");
      });

      it("契約に無い内訳項目が含まれていれば AppError(CONFLICT) を投げる", async () => {
        const error = await catchError(
          createMeterReading(
            membership,
            "GAS",
            input({
              items: [
                { contractItemId: "gone", name: "旧", amount: "1", quantity: "", unitPrice: "" },
              ],
            }),
          ),
        );
        expect(error.code).toBe("CONFLICT");
        expect(repo.createMeterReading).not.toHaveBeenCalled();
      });
    });
  });

  describe("updateMeterReading", () => {
    beforeEach(() => repo.findMeterReadingWithItems.mockResolvedValue(savedReading()));

    describe("正常系", () => {
      it("自分自身は重なりに数えず、保存済みの内訳は控えの項目名・分類のまま保存する", async () => {
        repo.findMeterReadingIdByMonth.mockResolvedValue("r1");
        const usageMonth = await updateMeterReading(
          membership,
          "r1",
          input({
            items: [
              { contractItemId: "i2", name: "", amount: "2952", quantity: "19.4", unitPrice: "" },
              { contractItemId: "i1", name: "", amount: "900", quantity: "", unitPrice: "" },
            ],
          }),
        );
        expect(usageMonth).toBe("2026-08");
        const [id, householdId, , items] = repo.updateMeterReading.mock.calls[0];
        expect([id, householdId]).toEqual(["r1", "h1"]);
        expect(items).toEqual([
          {
            contractItemId: "i2",
            name: "従量料金（控え）",
            category: "OTHER",
            amount: 2952,
            quantity: "19.4",
            unitPrice: null,
            sortOrder: 1,
          },
          {
            contractItemId: "i1",
            name: "基本料金",
            category: "BASIC",
            amount: 900,
            quantity: null,
            unitPrice: null,
            sortOrder: 2,
          },
        ]);
      });
    });

    describe("異常系", () => {
      it("世帯に無い検針票なら AppError(NOT_FOUND) を投げる", async () => {
        repo.findMeterReadingWithItems.mockResolvedValue(null);
        const error = await catchError(updateMeterReading(membership, "other", input()));
        expect(error.code).toBe("NOT_FOUND");
        expect(repo.updateMeterReading).not.toHaveBeenCalled();
      });

      it("変えた使用月に別の検針票があれば、選んだ月と種別の文言で AppError(METER_READING_DUPLICATE) を投げる", async () => {
        repo.findMeterReadingWithItems.mockResolvedValue(savedReading({ utilityType: "WATER" }));
        repo.findMeterReadingIdByMonth.mockResolvedValue("r2");
        const error = await catchError(updateMeterReading(membership, "r1", input()));
        expect(error.code).toBe("METER_READING_DUPLICATE");
        expect(error.userMessage).toBe("2026年7-8月分の水道の検針票はすでに登録されています。");
        expect(repo.findMeterReadingIdByMonth).toHaveBeenCalledWith("h1", "WATER", db("2026-08"));
      });

      it("保存中に DB が重なりで断ったら AppError(METER_READING_DUPLICATE) を投げる", async () => {
        repo.updateMeterReading.mockResolvedValue("duplicate");
        const error = await catchError(updateMeterReading(membership, "r1", input()));
        expect(error.code).toBe("METER_READING_DUPLICATE");
      });

      it("更新の時点で検針票が消えていたら AppError(NOT_FOUND) を投げる", async () => {
        repo.updateMeterReading.mockResolvedValue("not_found");
        const error = await catchError(updateMeterReading(membership, "r1", input()));
        expect(error.code).toBe("NOT_FOUND");
      });
    });
  });

  describe("deleteMeterReading", () => {
    it("世帯で絞って検針票を消し、消した検針票の使用月を返す", async () => {
      repo.deleteMeterReading.mockResolvedValue(db("2026-08"));
      expect(await deleteMeterReading(membership, "r1")).toBe("2026-08");
      expect(repo.deleteMeterReading).toHaveBeenCalledWith("r1", "h1");
    });

    it("世帯に無い検針票なら AppError(NOT_FOUND) を投げる", async () => {
      repo.deleteMeterReading.mockResolvedValue(null);
      const error = await catchError(deleteMeterReading(membership, "other"));
      expect(error.code).toBe("NOT_FOUND");
    });
  });
});
