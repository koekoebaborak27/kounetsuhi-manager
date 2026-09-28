// S08 の新規登録画面。所属を確かめ、空の契約フォームを表示する。
import { ContractForm, getContractForm } from "@/modules/contract";
import { requireMembership } from "@/modules/household";
import { todayInJapan } from "@/shared/date/date-only";
import { PageTitle } from "@/shared/ui/page-title";

// 新しい契約を登録する画面。
export default async function Page() {
  const membership = await requireMembership();
  const data = await getContractForm(membership);
  // 新規登録で null になることはないが、型としても画面を安全にしておく。
  if (!data) return null;
  return (
    <>
      <PageTitle>契約</PageTitle>
      <ContractForm data={data} currentYear={Number(todayInJapan().slice(0, 4))} />
    </>
  );
}
