// 内訳項目の一覧を操作する純粋関数。画面の追加・候補の絞り込みと、保存時の DB への反映内容の振り分けを担う。
// DB や画面に依存させず、入力と出力だけで単体テストできるようにする。
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { ITEM_CANDIDATES, ITEM_TEMPLATES, type ContractItemValue } from "./item-catalog";

// 種別の候補から、項目名が一致するものを探す。無ければ undefined を返す。
export function findCandidate(utilityType: UtilityType, name: string) {
  return ITEM_CANDIDATES[utilityType].find((candidate) => candidate.name === name);
}

// 「候補から追加」に並べる候補を返す。
// 一覧に同じ名前の項目がすでにある候補は除き、残りは候補の表の順のまま返す。
export function listAvailableCandidates(
  utilityType: UtilityType,
  items: readonly Pick<ContractItemValue, "name">[],
) {
  const selectedNames = new Set(items.map((item) => item.name));
  return ITEM_CANDIDATES[utilityType].filter((candidate) => !selectedNames.has(candidate.name));
}

// ひな形の「選択」で入れ替える、新しい一覧を返す。
// 今の一覧は引き継がず（「その他」の項目も外す）、ひな形の項目だけを、ひな形の順と候補の分類で返す。
export function buildTemplateItems(
  utilityType: UtilityType,
  templateId: string,
): ContractItemValue[] {
  const template = ITEM_TEMPLATES[utilityType].find((item) => item.id === templateId);
  // 別の種別のひな形や、存在しないひな形が渡されたときは空の一覧にする。
  if (!template) return [];
  return template.itemNames.flatMap((name) => {
    const candidate = findCandidate(utilityType, name);
    return candidate
      ? [{ name: candidate.name, category: candidate.category, isCustom: false }]
      : [];
  });
}

// 「その他」で入力した項目名が使えるかを確かめ、使えないときはその理由を返す。
// duplicate = 一覧に同じ名前がある、candidate = 選んでいる種別の候補と同じ名前（候補から追加してもらう）。
export function findCustomItemNameProblem(
  utilityType: UtilityType,
  name: string,
  items: readonly Pick<ContractItemValue, "name">[],
): "duplicate" | "candidate" | null {
  if (items.some((item) => item.name === name)) return "duplicate";
  if (findCandidate(utilityType, name)) return "candidate";
  return null;
}

// 保存する一覧の候補の項目を、候補の表の分類にそろえる。
// 画面から届いた分類を信用せず、サーバーで決め直すために使う。候補に無い名前の候補の項目があれば null を返す。
export function normalizeContractItems(
  utilityType: UtilityType,
  items: readonly ContractItemValue[],
): ContractItemValue[] | null {
  const normalized: ContractItemValue[] = [];
  for (const item of items) {
    // 「その他」の項目は、利用者が選んだ分類をそのまま使う。
    if (item.isCustom) {
      normalized.push(item);
      continue;
    }
    const candidate = findCandidate(utilityType, item.name);
    if (!candidate) return null;
    normalized.push({ name: candidate.name, category: candidate.category, isCustom: false });
  }
  return normalized;
}

// 保存前に DB にある内訳項目の行。外した行も含める。
export type ExistingContractItem = { id: string; name: string; removedAt: Date | null };

// 保存時に DB へ反映する内容。
export type ContractItemChanges = {
  // 新しく作る行。
  creates: (ContractItemValue & { sortOrder: number })[];
  // 一覧に残っている行と、外した行を選び直したもの。removedAt を空にして、分類・表示順を選び直した内容にする。
  updates: (Omit<ContractItemValue, "name"> & { id: string; sortOrder: number })[];
  // 選択中だったが一覧から外した行。removedAt に日時を入れる。
  removeIds: string[];
};

// 画面の一覧と DB の行を比べ、作る・戻す・外すに振り分ける。表示順は画面の並び順どおり 1 から振り直す。
// 同じ契約の中で項目名は重ならないので、名前で DB の行と突き合わせる。
export function planContractItemChanges(
  existing: readonly ExistingContractItem[],
  items: readonly ContractItemValue[],
): ContractItemChanges {
  const existingByName = new Map(existing.map((row) => [row.name, row]));
  const keptIds = new Set<string>();
  const changes: ContractItemChanges = { creates: [], updates: [], removeIds: [] };
  items.forEach((item, index) => {
    const sortOrder = index + 1;
    const row = existingByName.get(item.name);
    // 同じ名前の行があれば、外した行でも新しく作らずその行を使い回す（検針票の内訳から参照されているため）。
    if (row) {
      keptIds.add(row.id);
      changes.updates.push({
        id: row.id,
        category: item.category,
        isCustom: item.isCustom,
        sortOrder,
      });
    } else {
      changes.creates.push({ ...item, sortOrder });
    }
  });
  // 選択中だった行のうち一覧に無いものだけを外す。もともと外してあった行は日時を変えない。
  changes.removeIds = existing
    .filter((row) => row.removedAt === null && !keptIds.has(row.id))
    .map((row) => row.id);
  return changes;
}
