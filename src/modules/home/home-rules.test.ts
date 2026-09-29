/**
 * 対象: home/home-rules（最新の検針票・前回比・前年同月比・1 日あたりの金額・今年の合計・次を作成する使用月）
 * 目的: ホームに表示する値の選び方と計算（水道の 2 か月・比べる検針票が無いとき・範囲の外）を担保する
 */
import { describe, expect, it } from "vitest";
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import type { MeterReadingForHome } from "@/modules/meter-reading";
import {
  buildHomeView,
  calcDailyAmount,
  calcYearTotal,
  monthsPerReading,
  pickLatestReading,
  yearTotalTitle,
} from "./home-rules";

// テスト用の検針票。使用期間は指定しなければ空にする。
function reading(
  utilityType: UtilityType,
  usageMonth: string,
  amount: number,
  period: [string, string] | null = null,
): MeterReadingForHome {
  return {
    utilityType,
    usageMonth,
    amount,
    periodStart: period?.[0] ?? null,
    periodEnd: period?.[1] ?? null,
  };
}

describe("home/home-rules", () => {
  describe("monthsPerReading", () => {
    it("水道は 2 か月、電気とガスは 1 か月", () => {
      expect(monthsPerReading("WATER")).toBe(2);
      expect(monthsPerReading("ELECTRICITY")).toBe(1);
      expect(monthsPerReading("GAS")).toBe(1);
    });
  });

  describe("pickLatestReading", () => {
    const readings = [
      reading("ELECTRICITY", "2026-06", 1),
      reading("ELECTRICITY", "2026-08", 2),
      reading("ELECTRICITY", "2026-07", 3),
      reading("GAS", "2026-09", 4),
    ];
    it("種別ごとに使用月が最も新しい検針票を返す", () =>
      expect(pickLatestReading(readings, "ELECTRICITY")?.amount).toBe(2));
    it("他の種別の検針票は選ばない", () =>
      expect(pickLatestReading(readings, "GAS")?.usageMonth).toBe("2026-09"));
    it("その種別の検針票が 1 件も無いときは null を返す", () =>
      expect(pickLatestReading(readings, "WATER")).toBeNull());
  });

  describe("calcDailyAmount", () => {
    it("請求額を使用期間の日数（開始日・終了日を含む）で割り、円未満を四捨五入する", () =>
      // 7/15〜8/14 は 31 日。12,640 ÷ 31 = 407.7...
      expect(calcDailyAmount(12_640, "2026-07-15", "2026-08-14")).toBe(408));
    it("開始日と終了日が同じ日なら 1 日として数える", () =>
      expect(calcDailyAmount(500, "2026-08-01", "2026-08-01")).toBe(500));
    it("水道の 2 か月分も、期間の日数で割る", () =>
      // 6/10〜8/9 は 61 日。11,860 ÷ 61 = 194.4...
      expect(calcDailyAmount(11_860, "2026-06-10", "2026-08-09")).toBe(194));
    it("使用期間が空のときは null を返す", () => {
      expect(calcDailyAmount(1_000, null, null)).toBeNull();
      expect(calcDailyAmount(1_000, "2026-08-01", null)).toBeNull();
      expect(calcDailyAmount(1_000, null, "2026-08-31")).toBeNull();
    });
    it("終了日が開始日より前で日数が数えられないときは null を返す", () =>
      expect(calcDailyAmount(1_000, "2026-08-31", "2026-08-01")).toBeNull());
  });

  describe("calcYearTotal", () => {
    const readings = [
      reading("ELECTRICITY", "2025-12", 1_000),
      reading("ELECTRICITY", "2026-01", 2_000),
      reading("GAS", "2026-09", 3_000),
      reading("WATER", "2026-08", 4_000),
      // 翌月（当月より後）の使用月は、今年の合計に含めない。
      reading("ELECTRICITY", "2026-10", 5_000),
    ];
    it("使用月が今年の 1 月〜当月の請求額を、3 種別すべて足す", () =>
      expect(calcYearTotal(readings, "2026-09")).toBe(9_000));
    it("前年の検針票は含めない", () =>
      expect(calcYearTotal([reading("GAS", "2025-12", 1_000)], "2026-01")).toBe(0));
    it("該当する検針票が無いときは 0 を返す", () => expect(calcYearTotal([], "2026-09")).toBe(0));
  });

  describe("yearTotalTitle", () => {
    it("当月が 2 月以降なら「1〜M月分」の形にする", () =>
      expect(yearTotalTitle("2026-09")).toBe("今年の合計（1〜9月分）"));
    it("当月が 1 月なら「1月分」にする", () =>
      expect(yearTotalTitle("2026-01")).toBe("今年の合計（1月分）"));
  });

  describe("buildHomeView", () => {
    // 今日を 2026-09 とする。使用月にできる最後の月は 2026-10。
    const current = "2026-09";
    const limit = "2026-10";
    const cardOf = (view: ReturnType<typeof buildHomeView>, type: UtilityType) =>
      view.cards.find((card) => card.utilityType === type)!;

    it("カードを電気・ガス・水道の順に並べる", () =>
      expect(buildHomeView([], current, limit).cards.map((card) => card.utilityType)).toEqual([
        "ELECTRICITY",
        "GAS",
        "WATER",
      ]));

    describe("検針票が 1 件も無い種別", () => {
      const view = buildHomeView([reading("GAS", "2026-08", 3_000)], current, limit);
      it("latest を null にする", () => expect(cardOf(view, "ELECTRICITY").latest).toBeNull());
      it("「作成」で開く使用月は前月にする", () =>
        expect(cardOf(view, "ELECTRICITY").createMonth).toBe("2026-08"));
    });

    describe("前回比・前年同月比", () => {
      it("電気は 1 か月前と 12 か月前の検針票と比べる", () => {
        const view = buildHomeView(
          [
            reading("ELECTRICITY", "2026-08", 11_500),
            reading("ELECTRICITY", "2026-07", 10_000),
            reading("ELECTRICITY", "2025-08", 12_000),
          ],
          current,
          limit,
        );
        const latest = cardOf(view, "ELECTRICITY").latest!;
        expect(latest.monthRate).toBe(15);
        expect(latest.yearRate).toBe(-4.2);
      });
      it("水道は 2 か月前の検針票と前回として比べる", () => {
        const view = buildHomeView(
          [reading("WATER", "2026-08", 11_000), reading("WATER", "2026-06", 10_000)],
          current,
          limit,
        );
        expect(cardOf(view, "WATER").latest!.monthRate).toBe(10);
      });
      it("水道の 1 か月前の検針票があっても前回とは比べない", () => {
        const view = buildHomeView(
          [reading("WATER", "2026-08", 11_000), reading("WATER", "2026-07", 10_000)],
          current,
          limit,
        );
        expect(cardOf(view, "WATER").latest!.monthRate).toBeNull();
      });
      it("その使用月の検針票が無いときは、さらに前の月の検針票とは比べず null にする", () => {
        const view = buildHomeView(
          [reading("ELECTRICITY", "2026-08", 11_000), reading("ELECTRICITY", "2026-06", 10_000)],
          current,
          limit,
        );
        const latest = cardOf(view, "ELECTRICITY").latest!;
        expect(latest.monthRate).toBeNull();
        expect(latest.yearRate).toBeNull();
      });
      it("比べる相手が 0 円のときは null にする", () => {
        const view = buildHomeView(
          [reading("GAS", "2026-08", 3_000), reading("GAS", "2026-07", 0)],
          current,
          limit,
        );
        expect(cardOf(view, "GAS").latest!.monthRate).toBeNull();
      });
      it("最新より新しい使用月が無い種別の別種別の検針票とは比べない", () => {
        const view = buildHomeView(
          [reading("ELECTRICITY", "2026-08", 11_000), reading("GAS", "2026-07", 100)],
          current,
          limit,
        );
        expect(cardOf(view, "ELECTRICITY").latest!.monthRate).toBeNull();
      });
    });

    describe("使用月の年の表示", () => {
      it("使用月が今年なら年を付けない", () =>
        expect(
          cardOf(buildHomeView([reading("GAS", "2026-08", 1)], current, limit), "GAS").latest!
            .showYear,
        ).toBe(false));
      it("使用月が今年でなければ年を付ける", () =>
        expect(
          cardOf(buildHomeView([reading("GAS", "2025-12", 1)], current, limit), "GAS").latest!
            .showYear,
        ).toBe(true));
    });

    describe("次を作成する使用月", () => {
      it("電気・ガスは最新の 1 か月後にする", () =>
        expect(
          cardOf(buildHomeView([reading("GAS", "2026-08", 1)], current, limit), "GAS").latest!
            .nextMonth,
        ).toBe("2026-09"));
      it("水道は最新の 2 か月後にする", () =>
        expect(
          cardOf(buildHomeView([reading("WATER", "2026-08", 1)], current, limit), "WATER").latest!
            .nextMonth,
        ).toBe("2026-10"));
      it("翌月ちょうどまでなら作成できる（使用月にできる最後の月）", () =>
        expect(
          cardOf(buildHomeView([reading("GAS", "2026-09", 1)], current, limit), "GAS").latest!
            .nextMonth,
        ).toBe("2026-10"));
      it("翌月より先になるときは null（押せなくする）", () =>
        expect(
          cardOf(buildHomeView([reading("GAS", "2026-10", 1)], current, limit), "GAS").latest!
            .nextMonth,
        ).toBeNull());
      it("水道で 2 か月後が翌月より先になるときは null にする", () =>
        expect(
          cardOf(buildHomeView([reading("WATER", "2026-09", 1)], current, limit), "WATER").latest!
            .nextMonth,
        ).toBeNull());
      it("年をまたぐ使用月も正しく数える", () =>
        expect(
          cardOf(buildHomeView([reading("GAS", "2026-12", 1)], "2026-12", "2027-01"), "GAS").latest!
            .nextMonth,
        ).toBe("2027-01"));
    });

    describe("今年の合計", () => {
      it("見出しと合計を返す", () => {
        const view = buildHomeView(
          [reading("GAS", "2026-08", 3_000), reading("ELECTRICITY", "2026-09", 12_000)],
          current,
          limit,
        );
        expect(view.totalTitle).toBe("今年の合計（1〜9月分）");
        expect(view.totalAmount).toBe(15_000);
      });
    });
  });
});
