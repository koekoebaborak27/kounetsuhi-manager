// S08 の編集画面。所属する世帯に無い ID のときは共通の 404 表示にする。
import { notFound } from "next/navigation";
import { ContractForm, getContractForm } from "@/modules/contract";
import { requireMembership } from "@/modules/household";
import { todayInJapan } from "@/shared/date/date-only";
import { PageTitle } from "@/shared/ui/page-title";

// 保存済みの契約を編集する画面。
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const membership = await requireMembership();
  const { id } = await params;
  const data = await getContractForm(membership, id);
  if (!data) notFound();
  return (
    <>
      <PageTitle>契約</PageTitle>
      <ContractForm data={data} currentYear={Number(todayInJapan().slice(0, 4))} />
    </>
  );
}
