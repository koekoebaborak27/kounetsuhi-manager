/**
 * 対象: meter-reading/reading-rules
 * 目的: 使用月の範囲・契約中の契約・直前の検針票・初期値・内訳の並べ方と合計・保存する内訳の決め方を担保する
 */
import { describe, expect, it } from "vitest";
import {
  billingMonthMax,
  buildEditItemRows,
  checkItemTotal,
  editMeterReadingHref,
  hasItemInput,
  initialBillingMonth,
  initialPeriod,
  initialPeriodEnd,
  isUsageMonthInRange,
  newMeterReadingHref,
  parseUtilityTypeParam,
  pickActiveContract,
  pickPreviousReading,
  resolveItemsForSave,
  resolveRecordsMonth,
  sumItemAmounts,
  toEmptyItemRows,
  usageMonthMax,
} from "./reading-rules";

// 契約のテスト用の値。変える項目だけ上書きする。
const contract = (
  override: Partial<{ id: string; startDate: string; endDate: string | null }>,
) => ({
  id: "c1",
  startDate: "2024-04-01",
  endDate: null,
  ...override,
});

// 内訳の行のテスト用の値。
const row = (override: Partial<Parameters<typeof hasItemInput>[0][number]> = {}) => ({
  amount: "",
  quantity: "",
  unitPrice: "",
  ...override,
});

describe("meter-reading/reading-rules", () => {
  describe("使用月の範囲", () => {
    it("使用月にできる最後の月は、今日が属する月の翌月", () =>
      expect(usageMonthMax("2026-12")).toBe("2027-01"));
    it("請求月で選べる最後の月は、翌年の 12 月", () =>
      expect(billingMonthMax("2026-09")).toBe("2027-12"));
    it("2000 年 1 月と翌月は範囲に入る", () => {
      expect(isUsageMonthInRange("2000-01", "2026-09")).toBe(true);
      expect(isUsageMonthInRange("2026-10", "2026-09")).toBe(true);
    });
    it("1999 年 12 月・翌々月・形の正しくない値は範囲に入らない", () => {
      expect(isUsageMonthInRange("1999-12", "2026-09")).toBe(false);
      expect(isUsageMonthInRange("2026-11", "2026-09")).toBe(false);
      expect(isUsageMonthInRange("2026-13", "2026-09")).toBe(false);
    });
  });

  describe("resolveRecordsMonth", () => {
    it("範囲に入る URL の月はそのまま表示する", () =>
      expect(resolveRecordsMonth("2025-03", "2026-09")).toBe("2025-03"));
    it("URL に月が無いときは前月を表示する", () =>
      expect(resolveRecordsMonth(undefined, "2026-09")).toBe("2026-08"));
    it("URL の月が正しくない、または範囲の外のときは前月を表示する", () => {
      expect(resolveRecordsMonth("2026-8", "2026-09")).toBe("2026-08");
      expect(resolveRecordsMonth("2026-11", "2026-09")).toBe("2026-08");
    });
    it("1 月に開いたときの前月は前の年の 12 月", () =>
      expect(resolveRecordsMonth(undefined, "2027-01")).toBe("2026-12"));
  });

  describe("URL", () => {
    it("URL の種別を DB の値に変え、知らない値は null にする", () => {
      expect(parseUtilityTypeParam("gas")).toBe("GAS");
      expect(parseUtilityTypeParam("GAS")).toBeNull();
      expect(parseUtilityTypeParam(undefined)).toBeNull();
    });
    it("作成の URL は種別を小文字にし、ホームから開くときは from=home を付ける", () => {
      expect(newMeterReadingHref("WATER", "2026-08")).toBe("/records/new?type=water&month=2026-08");
      expect(newMeterReadingHref("GAS", "2026-08", "home")).toBe(
        "/records/new?type=gas&month=2026-08&from=home",
      );
    });
    it("編集の URL は検針票の ID で作る", () => {
      expect(editMeterReadingHref("r1")).toBe("/records/r1");
      expect(editMeterReadingHref("r1", "home")).toBe("/records/r1?from=home");
    });
  });

  describe("pickActiveContract", () => {
    it("使用月の途中で始まった契約も契約中とする", () =>
      expect(pickActiveContract([contract({ startDate: "2026-08-31" })], "2026-08")?.id).toBe(
        "c1",
      ));
    it("使用月の 1 日に終わった契約も契約中とする", () =>
      expect(pickActiveContract([contract({ endDate: "2026-08-01" })], "2026-08")?.id).toBe("c1"));
    it("使用月より後に始まる契約・前に終わった契約は選ばない", () => {
      expect(pickActiveContract([contract({ startDate: "2026-09-01" })], "2026-08")).toBeNull();
      expect(pickActiveContract([contract({ endDate: "2026-07-31" })], "2026-08")).toBeNull();
    });
    it("契約中が複数あるときは、開始日が最も新しい契約を選ぶ", () =>
      expect(
        pickActiveContract(
          [
            contract({ id: "old", startDate: "2020-01-01" }),
            contract({ id: "new", startDate: "2026-08-15" }),
            contract({ id: "mid", startDate: "2024-01-01" }),
          ],
          "2026-08",
        )?.id,
      ).toBe("new"));
  });

  describe("pickPreviousReading", () => {
    const readings = [
      { usageMonth: "2026-06" },
      { usageMonth: "2026-08" },
      { usageMonth: "2026-07" },
      { usageMonth: "2026-10" },
    ];
    it("使用月より前で最も新しい検針票を選ぶ", () =>
      expect(pickPreviousReading(readings, "2026-09")?.usageMonth).toBe("2026-08"));
    it("同じ使用月の検針票は直前として選ばない", () =>
      expect(pickPreviousReading(readings, "2026-08")?.usageMonth).toBe("2026-07"));
    it("前の検針票が無ければ null を返す", () =>
      expect(pickPreviousReading(readings, "2026-06")).toBeNull());
  });

  describe("initialBillingMonth", () => {
    it("直前の検針票と同じ月数を使用月に足す（年をまたぐときも）", () =>
      expect(
        initialBillingMonth(
          { usageMonth: "2026-11", billingMonth: "2026-12", periodEnd: null },
          "2026-12",
        ),
      ).toBe("2027-01"));
    it("直前の検針票が無い、または請求月が空なら未選択にする", () => {
      expect(initialBillingMonth(null, "2026-08")).toBe("");
      expect(
        initialBillingMonth(
          { usageMonth: "2026-07", billingMonth: null, periodEnd: null },
          "2026-08",
        ),
      ).toBe("");
    });
  });

  describe("initialPeriodEnd", () => {
    it("開始日の 1 か月後の前日にする", () =>
      expect(initialPeriodEnd("2026-07-13", 1)).toBe("2026-08-12"));
    it("1 月 31 日の 1 か月後は同じ日が無いので、2 月の末日にする", () =>
      expect(initialPeriodEnd("2026-01-31", 1)).toBe("2026-02-28"));
    it("1 日始まりなら、その月の末日になる", () =>
      expect(initialPeriodEnd("2026-03-01", 1)).toBe("2026-03-31"));
    it("12 月始まりでも年をまたいで計算する", () =>
      expect(initialPeriodEnd("2026-12-15", 2)).toBe("2027-02-14"));
  });

  describe("initialPeriod", () => {
    const previous = { usageMonth: "2026-07", billingMonth: null, periodEnd: "2026-07-12" };
    it("開始日は直前の検針票の終了日の翌日、終了日は 1 か月後の前日にする", () =>
      expect(initialPeriod(previous, "GAS")).toEqual({
        periodStart: "2026-07-13",
        periodEnd: "2026-08-12",
      }));
    it("水道は 2 か月後の前日にする", () =>
      expect(initialPeriod(previous, "WATER")).toEqual({
        periodStart: "2026-07-13",
        periodEnd: "2026-09-12",
      }));
    it("直前の検針票が無い、または使用期間が空ならどちらも空にする", () => {
      expect(initialPeriod(null, "GAS")).toEqual({ periodStart: "", periodEnd: "" });
      expect(initialPeriod({ ...previous, periodEnd: null }, "GAS")).toEqual({
        periodStart: "",
        periodEnd: "",
      });
    });
  });

  describe("内訳の行の並べ方", () => {
    const contractItems = [
      { id: "i1", name: "基本料金" },
      { id: "i2", name: "従量料金" },
      { id: "i3", name: "原料費調整額" },
    ];
    it("作成では契約の内訳項目を表示順に、値を空で並べる", () =>
      expect(toEmptyItemRows(contractItems.slice(0, 1))).toEqual([
        { contractItemId: "i1", name: "基本料金", amount: "", quantity: "", unitPrice: "" },
      ]));
    it("編集では保存済みの内訳を先に並べ、まだ無い契約の内訳項目を後ろに並べる", () =>
      expect(
        buildEditItemRows(
          [
            {
              contractItemId: "i2",
              name: "従量料金",
              amount: 2952,
              quantity: "19.4",
              unitPrice: null,
            },
            // 契約から外した項目も、保存済みなら控えの名前で並べる。
            {
              contractItemId: "gone",
              name: "旧割引",
              amount: -100,
              quantity: null,
              unitPrice: null,
            },
          ],
          contractItems,
        ).map((item) => [item.contractItemId, item.name, item.amount, item.quantity]),
      ).toEqual([
        ["i2", "従量料金", "2952", "19.4"],
        ["gone", "旧割引", "-100", ""],
        ["i1", "基本料金", "", ""],
        ["i3", "原料費調整額", "", ""],
      ]));
  });

  describe("hasItemInput", () => {
    it("金額・数量・単価のどれかが入っていれば true", () => {
      expect(hasItemInput([row(), row({ unitPrice: "1.5" })])).toBe(true);
      expect(hasItemInput([row({ amount: "0" })])).toBe(true);
    });
    it("空白だけなら false", () => expect(hasItemInput([row({ amount: " " }), row()])).toBe(false));
  });

  describe("内訳の合計", () => {
    it("金額を正しく入力した行だけを足す", () =>
      expect(
        sumItemAmounts([
          row({ amount: "1,056" }),
          row({ amount: "−58" }),
          row({ amount: "" }),
          row({ amount: "12.5" }),
        ]),
      ).toEqual({ total: 998, count: 2 }));
    it("合計が請求額と違えば不一致にする", () =>
      expect(checkItemTotal("3,850", [row({ amount: "3950" })])).toEqual({
        total: 3950,
        billed: 3850,
        mismatched: true,
      }));
    it("合計が請求額と同じなら不一致にしない", () =>
      expect(
        checkItemTotal("3850", [row({ amount: "3900" }), row({ amount: "-50" })]).mismatched,
      ).toBe(false));
    it("内訳の金額が 1 つも無いとき、請求額が空・正しくないときは不一致にしない", () => {
      expect(checkItemTotal("3850", [row()]).mismatched).toBe(false);
      expect(checkItemTotal("", [row({ amount: "100" })]).mismatched).toBe(false);
      expect(checkItemTotal("abc", [row({ amount: "100" })]).mismatched).toBe(false);
    });
  });

  describe("resolveItemsForSave", () => {
    const contractItems = [
      { id: "i1", name: "基本料金", category: "BASIC" as const },
      { id: "i2", name: "従量料金", category: "USAGE" as const },
    ];
    const input = (contractItemId: string, amount: string | null) => ({
      contractItemId,
      amount,
      quantity: null,
      unitPrice: null,
    });

    it("画面の並び順のまま sortOrder = 1 から並べる", () =>
      expect(
        resolveItemsForSave([input("i2", "2952"), input("i1", "1056")], contractItems, [])?.map(
          (item) => [item.contractItemId, item.amount, item.sortOrder],
        ),
      ).toEqual([
        ["i2", 2952, 1],
        ["i1", 1056, 2],
      ]));
    it("金額が空の行は保存せず、sortOrder を詰めて振る", () =>
      expect(
        resolveItemsForSave([input("i1", null), input("i2", "10")], contractItems, [])?.map(
          (item) => [item.contractItemId, item.sortOrder],
        ),
      ).toEqual([["i2", 1]]));
    it("保存済みの内訳にある項目は、保存済みの項目名・分類の控えを使う", () =>
      expect(
        resolveItemsForSave([input("i1", "1000")], contractItems, [
          { contractItemId: "i1", name: "基本料金（旧）", category: "OTHER" },
        ])?.[0],
      ).toMatchObject({ name: "基本料金（旧）", category: "OTHER" }));
    it("保存済みに無い項目は、選んだ契約の内訳項目の値を使う", () =>
      expect(resolveItemsForSave([input("i2", "10")], contractItems, [])?.[0]).toMatchObject({
        name: "従量料金",
        category: "USAGE",
      }));
    it("どちらにも無い項目があれば null を返す", () =>
      expect(resolveItemsForSave([input("other", "10")], contractItems, [])).toBeNull());
  });
});
