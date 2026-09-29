// 契約の画面に渡す型。DB の Date はここへ来る前に YYYY-MM-DD の文字列へ変える。
import type { ItemCategory, UtilityType } from "@/shared/db/generated/prisma/enums";
import type { ContractItemValue } from "./item-catalog";

// S07 の 1 行分。
export type ContractListItem = {
  id: string;
  utilityType: UtilityType;
  name: string;
  period: string;
  active: boolean;
};

// S07 の契約中・終了済みの一覧。
export type ContractList = {
  active: ContractListItem[];
  ended: ContractListItem[];
};

// S08 が編集・重なりの判定に使う契約。
export type ContractFormContract = {
  id: string;
  utilityType: UtilityType;
  companyName: string;
  planName: string | null;
  startDate: string;
  endDate: string | null;
  memo: string | null;
};

// S08 に渡す値。id が null のときは新規登録。items は選択中の内訳項目で、表示順に並べる。
export type ContractFormData = {
  id: string | null;
  contract: ContractFormContract | null;
  contracts: ContractFormContract[];
  hasMeterReadings: boolean;
  items: ContractItemValue[];
};

// 検針票の入力画面に並べる、契約の内訳項目 1 件分。
export type ContractItemForMeterReading = {
  id: string;
  name: string;
  category: ItemCategory;
};

// 検針票の入力画面で選べる契約。name は「会社名 プラン名」の表示名。items は外していない内訳項目を表示順に並べる。
export type ContractForMeterReading = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  items: ContractItemForMeterReading[];
};
