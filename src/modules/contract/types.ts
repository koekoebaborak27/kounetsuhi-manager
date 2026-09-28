// 契約の画面に渡す型。DB の Date はここへ来る前に YYYY-MM-DD の文字列へ変える。
import type { UtilityType } from "@/shared/db/generated/prisma/enums";

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

// S08 に渡す値。id が null のときは新規登録。
export type ContractFormData = {
  id: string | null;
  contract: ContractFormContract | null;
  contracts: ContractFormContract[];
  hasMeterReadings: boolean;
};
