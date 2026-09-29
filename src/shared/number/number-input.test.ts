/**
 * 対象: shared/number/number-input
 * 目的: 全角・カンマ・マイナス記号の違いを吸収したうえで、数値の範囲と小数の桁数を正しく確かめることを担保する
 */
import { describe, expect, it } from "vitest";
import { normalizeNumberInput, parseNumberInput } from "./number-input";

// 使用量と同じ条件（0〜99,999.9、小数 1 桁まで）。
const USAGE = { min: 0, max: 99_999.9, scale: 1 };
// 内訳の金額と同じ条件（−999,999〜999,999 の整数）。
const ITEM_AMOUNT = { min: -999_999, max: 999_999, scale: 0 };

describe("shared/number/number-input", () => {
  describe("normalizeNumberInput", () => {
    it("全角の数字と小数点を半角に直す", () =>
      expect(normalizeNumberInput("１９．４")).toBe("19.4"));
    it("「−」「－」をマイナスにそろえる", () => {
      expect(normalizeNumberInput("−58")).toBe("-58");
      expect(normalizeNumberInput("－58")).toBe("-58");
    });
    it("3 桁ごとのカンマ（全角も）と前後の空白を取り除く", () =>
      expect(normalizeNumberInput(" 1,234，567 ")).toBe("1234567"));
  });

  describe("parseNumberInput", () => {
    describe("受け付けるとき", () => {
      it("余分な 0 を除いた数字の文字列を返す", () =>
        expect(parseNumberInput("019.40", { ...USAGE, scale: 2 })).toBe("19.4"));
      it("全角・カンマ付きの負の整数を受け付ける", () =>
        expect(parseNumberInput("−１,０５６", ITEM_AMOUNT)).toBe("-1056"));
      it("範囲の上限・下限ちょうどを受け付ける", () => {
        expect(parseNumberInput("99999.9", USAGE)).toBe("99999.9");
        expect(parseNumberInput("-999999", ITEM_AMOUNT)).toBe("-999999");
      });
      it("「-0」は「0」にする", () => expect(parseNumberInput("-0", ITEM_AMOUNT)).toBe("0"));
    });

    describe("受け付けないとき", () => {
      it("小数の桁数が上限を超えると null を返す", () =>
        expect(parseNumberInput("19.45", USAGE)).toBeNull());
      it("整数だけの条件で小数を入れると null を返す", () =>
        expect(parseNumberInput("10.5", ITEM_AMOUNT)).toBeNull());
      it("範囲の外なら null を返す", () => {
        expect(parseNumberInput("100000", USAGE)).toBeNull();
        expect(parseNumberInput("-0.1", USAGE)).toBeNull();
      });
      it("数字でない・小数点だけの形なら null を返す", () => {
        expect(parseNumberInput("abc", USAGE)).toBeNull();
        expect(parseNumberInput(".5", USAGE)).toBeNull();
        expect(parseNumberInput("5.", USAGE)).toBeNull();
        expect(parseNumberInput("", USAGE)).toBeNull();
      });
    });
  });
});
