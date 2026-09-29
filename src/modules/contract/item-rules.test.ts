/**
 * 対象: contract/item-rules
 * 目的: 内訳項目の候補の絞り込み・ひな形の選択による入れ替え・「その他」の名前の確認・保存時の振り分けを、設計書の決まりどおりに担保する
 */
import { describe, expect, it } from "vitest";
import type { ContractItemValue } from "./item-catalog";
import {
  buildTemplateItems,
  findCustomItemNameProblem,
  listAvailableCandidates,
  normalizeContractItems,
  planContractItemChanges,
} from "./item-rules";

const item = (name: string, override: Partial<ContractItemValue> = {}): ContractItemValue => ({
  name,
  category: "USAGE",
  isCustom: false,
  ...override,
});

describe("contract/item-rules", () => {
  describe("listAvailableCandidates", () => {
    it("一覧が空なら、種別の候補を表の順ですべて返す", () =>
      expect(listAvailableCandidates("WATER", []).map((c) => c.name)).toEqual([
        "上水道",
        "下水道",
      ]));
    it("一覧に同じ名前がある候補を除き、残りは表の順のまま返す", () =>
      expect(
        listAvailableCandidates("GAS", [item("従量料金"), item("基本料金")]).map((c) => c.name),
      ).toEqual(["原料費調整額", "補助値引き"]));
  });

  describe("buildTemplateItems", () => {
    describe("ひな形が種別にあるとき", () => {
      it("ひな形の項目を、ひな形の順と候補の分類で返す", () =>
        expect(buildTemplateItems("GAS", "gas-standard")).toEqual([
          { name: "基本料金", category: "BASIC", isCustom: false },
          { name: "従量料金", category: "USAGE", isCustom: false },
          { name: "原料費調整額", category: "ADJUSTMENT", isCustom: false },
          { name: "補助値引き", category: "DISCOUNT", isCustom: false },
        ]));
      it("従量電灯Bなら、時間帯別の昼間料金・夜間料金を含まず、従量電灯Bの項目だけを返す", () =>
        expect(buildTemplateItems("ELECTRICITY", "electricity-tiered").map((i) => i.name)).toEqual([
          "基本料金",
          "電力量料金 第1段階",
          "電力量料金 第2段階",
          "電力量料金 第3段階",
          "燃料費調整額",
          "再エネ賦課金",
          "補助値引き",
        ]));
    });
    describe("ひな形が種別に無いとき", () => {
      it("空の一覧を返す", () => expect(buildTemplateItems("WATER", "gas-standard")).toEqual([]));
    });
  });

  describe("findCustomItemNameProblem", () => {
    it("一覧に同じ名前があるときは duplicate を返す", () =>
      expect(findCustomItemNameProblem("ELECTRICITY", "基本料金", [item("基本料金")])).toBe(
        "duplicate",
      ));
    it("一覧に無くても、選んでいる種別の候補と同じ名前なら candidate を返す", () =>
      expect(findCustomItemNameProblem("ELECTRICITY", "昼間料金", [])).toBe("candidate"));
    it("別の種別の候補と同じ名前なら問題なしとする", () =>
      expect(findCustomItemNameProblem("ELECTRICITY", "上水道", [])).toBeNull());
    it("どちらとも重ならなければ問題なしとする", () =>
      expect(findCustomItemNameProblem("GAS", "口座振替割引", [item("基本料金")])).toBeNull());
  });

  describe("normalizeContractItems", () => {
    it("候補の項目の分類を、画面から届いた値ではなく候補の表の値にそろえる", () =>
      expect(normalizeContractItems("GAS", [item("基本料金", { category: "OTHER" })])).toEqual([
        { name: "基本料金", category: "BASIC", isCustom: false },
      ]));
    it("「その他」の項目は、選んだ分類のまま返す", () => {
      const custom = item("口座振替割引", { category: "DISCOUNT", isCustom: true });
      expect(normalizeContractItems("GAS", [custom])).toEqual([custom]);
    });
    it("選んだ種別の候補に無い名前の候補の項目があれば null を返す", () =>
      expect(normalizeContractItems("WATER", [item("基本料金")])).toBeNull());
  });

  describe("planContractItemChanges", () => {
    const removedAt = new Date("2026-01-01T00:00:00.000Z");
    describe("DB に行が無いとき（新規登録）", () => {
      it("一覧の項目をすべて、並び順どおり 1 から表示順を付けて作る", () =>
        expect(planContractItemChanges([], [item("上水道"), item("下水道")])).toEqual({
          creates: [
            { ...item("上水道"), sortOrder: 1 },
            { ...item("下水道"), sortOrder: 2 },
          ],
          updates: [],
          removeIds: [],
        }));
    });
    describe("一覧に残っている項目を並べ替えたとき", () => {
      it("行を作らず、画面の並び順で表示順を振り直す", () =>
        expect(
          planContractItemChanges(
            [
              { id: "a", name: "上水道", removedAt: null },
              { id: "b", name: "下水道", removedAt: null },
            ],
            [item("下水道"), item("上水道")],
          ),
        ).toEqual({
          creates: [],
          updates: [
            { id: "b", category: "USAGE", isCustom: false, sortOrder: 1 },
            { id: "a", category: "USAGE", isCustom: false, sortOrder: 2 },
          ],
          removeIds: [],
        }));
    });
    describe("選択中の項目を一覧から外したとき", () => {
      it("その行を外す対象にする", () =>
        expect(
          planContractItemChanges([{ id: "a", name: "上水道", removedAt: null }], []).removeIds,
        ).toEqual(["a"]));
    });
    describe("もともと外してあった行が一覧に無いとき", () => {
      it("外す対象にも更新の対象にも含めない", () =>
        expect(
          planContractItemChanges([{ id: "a", name: "上水道", removedAt }], [item("下水道")]),
        ).toEqual({ creates: [{ ...item("下水道"), sortOrder: 1 }], updates: [], removeIds: [] }));
    });
    describe("外した項目と同じ名前を選び直したとき", () => {
      it("新しい行を作らず、その行を分類・その他かどうか・表示順を選び直した内容で戻す", () =>
        expect(
          planContractItemChanges(
            [
              { id: "a", name: "基本料金", removedAt: null },
              { id: "b", name: "口座振替割引", removedAt },
            ],
            [item("基本料金", { category: "BASIC" }), item("口座振替割引", { isCustom: true })],
          ),
        ).toEqual({
          creates: [],
          updates: [
            { id: "a", category: "BASIC", isCustom: false, sortOrder: 1 },
            { id: "b", category: "USAGE", isCustom: true, sortOrder: 2 },
          ],
          removeIds: [],
        }));
    });
  });
});
