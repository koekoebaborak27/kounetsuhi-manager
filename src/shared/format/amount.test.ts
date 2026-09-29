/**
 * 対象: shared/format/amount formatYen
 * 目的: 金額を設計書の表示の形式（カンマ・「円」・負の数の「−」）で表示することを担保する
 */
import { describe, expect, it } from "vitest";
import { formatYen } from "./amount";

describe("shared/format/amount formatYen", () => {
  it("3 桁ごとにカンマを入れ、後ろに「円」を付ける", () =>
    expect(formatYen(12640)).toBe("12,640 円"));
  it("負の数は先頭に「−」を付ける", () => expect(formatYen(-58)).toBe("−58 円"));
  it("0 は「0 円」にする", () => expect(formatYen(0)).toBe("0 円"));
});
