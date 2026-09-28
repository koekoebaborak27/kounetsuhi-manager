/**
 * 対象: contract/contract-rules
 * 目的: 契約中の判定、表示、期間の重なり、一覧の並びを仕様どおりにすることを担保する
 */
import { describe, expect, it } from "vitest";
import {
  findOverlappingContracts,
  formatContractName,
  formatContractPeriod,
  isActiveContract,
  periodsOverlap,
  sortContracts,
  type ContractRuleTarget,
} from "./contract-rules";

const contract = (override: Partial<ContractRuleTarget> = {}): ContractRuleTarget => ({
  id: "c1",
  utilityType: "ELECTRICITY",
  companyName: "さくら電力",
  planName: "従量電灯B",
  startDate: "2024-04-01",
  endDate: null,
  ...override,
});

describe("contract/contract-rules", () => {
  describe("契約中の判定と表示", () => {
    it("終了日が空または日本時間の今日以降なら契約中と判定する", () => {
      expect(isActiveContract(contract(), "2026-09-28")).toBe(true);
      expect(isActiveContract(contract({ endDate: "2026-09-28" }), "2026-09-28")).toBe(true);
      expect(isActiveContract(contract({ endDate: "2026-09-27" }), "2026-09-28")).toBe(false);
    });
    it("プラン名が無ければ会社名だけを表示し、期間をスラッシュ区切りにする", () => {
      expect(formatContractName(contract({ planName: null }))).toBe("さくら電力");
      expect(formatContractPeriod(contract({ endDate: "2026-03-31" }))).toBe(
        "2024/04/01〜2026/03/31",
      );
    });
  });
  describe("期間の重なり", () => {
    it("終了日と開始日が同じ1日でも重なる", () =>
      expect(
        periodsOverlap(
          contract({ endDate: "2026-03-31" }),
          contract({ id: "c2", startDate: "2026-03-31" }),
        ),
      ).toBe(true));
    it("同じ種別で自分以外に重なる契約だけを返す", () =>
      expect(
        findOverlappingContracts(contract(), [
          contract(),
          contract({ id: "c2" }),
          contract({ id: "c3", utilityType: "GAS" }),
        ]).map((item) => item.id),
      ).toEqual(["c2"]));
  });
  describe("一覧の並び", () => {
    it("契約中を先にし、種別順と開始日の新しい順に並べる", () =>
      expect(
        sortContracts(
          [
            contract({ id: "ended", endDate: "2020-01-01" }),
            contract({ id: "water", utilityType: "WATER" }),
            contract({ id: "new", startDate: "2025-01-01" }),
            contract({ id: "gas", utilityType: "GAS" }),
          ],
          "2026-09-28",
        ).map((item) => item.id),
      ).toEqual(["new", "gas", "water", "ended"]));
  });
});
