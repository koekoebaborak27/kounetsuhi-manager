/**
 * 対象: shared/format/change-rate calcChangeRate・changeDirection・formatChangeRate
 * 目的: 増減率の計算（四捨五入・0 円で割らない）と、向きの判定・表示の形（+・−・0.0%・—）を担保する
 */
import { describe, expect, it } from "vitest";
import { calcChangeRate, changeDirection, formatChangeRate } from "./change-rate";

describe("shared/format/change-rate", () => {
  describe("calcChangeRate", () => {
    it("増えたときは正の割合を小数 1 桁で返す", () =>
      expect(calcChangeRate(11_500, 10_000)).toBe(15));
    it("減ったときは負の割合を返す", () => expect(calcChangeRate(9_450, 10_000)).toBe(-5.5));
    it("小数 2 桁目を四捨五入する", () => expect(calcChangeRate(10_016, 10_000)).toBe(0.2));
    it("四捨五入して 0.0 になるときは 0 を返す（-0 にしない）", () =>
      expect(Object.is(calcChangeRate(9_999.9, 10_000), 0)).toBe(true));
    it("比べる相手が 0 円のときは null を返す", () => expect(calcChangeRate(500, 0)).toBeNull());
  });

  describe("changeDirection", () => {
    it("正の割合は増えた", () => expect(changeDirection(3.2)).toBe("increase"));
    it("負の割合は減った", () => expect(changeDirection(-0.1)).toBe("decrease"));
    it("0 は変わらない", () => expect(changeDirection(0)).toBe("flat"));
    it("割合が無いときは変わらない（色を付けない）", () =>
      expect(changeDirection(null)).toBe("flat"));
  });

  describe("formatChangeRate", () => {
    it("増えたときは「+」を付ける", () => expect(formatChangeRate(15.1)).toBe("+15.1%"));
    it("減ったときは「−」を付ける", () => expect(formatChangeRate(-5.5)).toBe("−5.5%"));
    it("整数の割合も小数 1 桁にそろえる", () => expect(formatChangeRate(15)).toBe("+15.0%"));
    it("0 は符号を付けず「0.0%」にする", () => expect(formatChangeRate(0)).toBe("0.0%"));
    it("割合が無いときは「—」にする", () => expect(formatChangeRate(null)).toBe("—"));
  });
});
