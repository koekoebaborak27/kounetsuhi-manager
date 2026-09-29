// 内訳項目の分類・候補・ひな形。画面から追加・変更する機能は作らず、設計書の表をそのままコードに持つ。
// 画面とサーバーの両方から読むため、server-only は付けない。
import type { ItemCategory, UtilityType } from "@/shared/db/generated/prisma/enums";

// 内訳項目の 1 件分。画面の一覧・保存の入力・候補の表で同じ形を使う。
export type ContractItemValue = {
  name: string;
  category: ItemCategory;
  isCustom: boolean;
};

// 分類を選ぶ欄に並べる順番。設計書の分類の表の順。
export const ITEM_CATEGORIES = [
  "BASIC",
  "USAGE",
  "ADJUSTMENT",
  "LEVY",
  "DISCOUNT",
  "OTHER",
] as const satisfies readonly ItemCategory[];

// 分類の画面での表示名。
export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  BASIC: "基本料金",
  USAGE: "従量料金",
  ADJUSTMENT: "調整額",
  LEVY: "賦課金",
  DISCOUNT: "割引と補助",
  OTHER: "その他",
};

// 候補の 1 件分。
export type ItemCandidate = { name: string; category: ItemCategory };

// 種別ごとの内訳項目の候補。「候補から追加」にはこの順で並べる。
export const ITEM_CANDIDATES: Record<UtilityType, readonly ItemCandidate[]> = {
  ELECTRICITY: [
    { name: "基本料金", category: "BASIC" },
    { name: "電力量料金 第1段階", category: "USAGE" },
    { name: "電力量料金 第2段階", category: "USAGE" },
    { name: "電力量料金 第3段階", category: "USAGE" },
    { name: "昼間料金", category: "USAGE" },
    { name: "夜間料金", category: "USAGE" },
    { name: "燃料費調整額", category: "ADJUSTMENT" },
    { name: "再エネ賦課金", category: "LEVY" },
    { name: "補助値引き", category: "DISCOUNT" },
  ],
  GAS: [
    { name: "基本料金", category: "BASIC" },
    { name: "従量料金", category: "USAGE" },
    { name: "原料費調整額", category: "ADJUSTMENT" },
    { name: "補助値引き", category: "DISCOUNT" },
  ],
  WATER: [
    { name: "上水道", category: "USAGE" },
    { name: "下水道", category: "USAGE" },
  ],
};

// ひな形の 1 件分。項目は候補の項目名で持ち、この順に一覧へ加える。
export type ItemTemplate = { id: string; name: string; itemNames: readonly string[] };

// 種別ごとのひな形。id は画面の選択欄で使う値で、種別をまたいで重ならないようにする。
export const ITEM_TEMPLATES: Record<UtilityType, readonly ItemTemplate[]> = {
  ELECTRICITY: [
    {
      id: "electricity-tiered",
      name: "従量電灯B（3段階）",
      itemNames: [
        "基本料金",
        "電力量料金 第1段階",
        "電力量料金 第2段階",
        "電力量料金 第3段階",
        "燃料費調整額",
        "再エネ賦課金",
        "補助値引き",
      ],
    },
    {
      id: "electricity-time-of-use",
      name: "時間帯別（昼・夜）",
      itemNames: ["基本料金", "昼間料金", "夜間料金", "燃料費調整額", "再エネ賦課金", "補助値引き"],
    },
  ],
  GAS: [
    {
      id: "gas-standard",
      name: "一般料金",
      itemNames: ["基本料金", "従量料金", "原料費調整額", "補助値引き"],
    },
  ],
  WATER: [
    { id: "water-both", name: "上下水道", itemNames: ["上水道", "下水道"] },
    { id: "water-supply-only", name: "上水道のみ", itemNames: ["上水道"] },
  ],
};
