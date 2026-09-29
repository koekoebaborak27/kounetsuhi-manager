/**
 * 対象: shared/ui/tab-nav isActive
 * 目的: 開いている画面の URL から、選択中にするタブを正しく決めることを担保する（ホームから開いた検針票の入力を含む）
 */
import { describe, expect, it } from "vitest";
import { isActive } from "./tab-nav";

describe("shared/ui/tab-nav isActive", () => {
  describe("通常のとき", () => {
    it("ホームは / と完全に一致したときだけ選択中にする", () => {
      expect(isActive("/", "/")).toBe(true);
      expect(isActive("/records", "/")).toBe(false);
    });
    it("記録の下の画面（検針票の入力）では記録を選択中にする", () =>
      expect(isActive("/records/new", "/records")).toBe(true));
  });

  describe("ホームから検針票の入力を開いたとき（from=home）", () => {
    it("ホームを選択中にし、記録は選択中にしない", () => {
      expect(isActive("/records/r1", "/", true)).toBe(true);
      expect(isActive("/records/r1", "/records", true)).toBe(false);
    });
    it("記録の画面そのもの（/records）では from=home があっても記録を選択中にする", () =>
      expect(isActive("/records", "/records", true)).toBe(true));
  });
});
