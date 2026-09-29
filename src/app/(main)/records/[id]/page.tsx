// S04 検針票の入力（編集）の画面。所属する世帯に無い ID のときは共通の 404 表示にする。
import { notFound } from "next/navigation";
import { getMeterReadingEditForm, MeterReadingForm } from "@/modules/meter-reading";
import { requireMembership } from "@/modules/household";
import { PageTitle } from "@/shared/ui/page-title";

// 保存済みの検針票を編集する画面。ホームから開いたときは from=home が付き、「キャンセル」でホームへ戻る。
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const membership = await requireMembership();
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const data = await getMeterReadingEditForm(membership, id, from === "home");
  if (!data) notFound();
  return (
    <>
      <PageTitle>検針票の入力</PageTitle>
      <MeterReadingForm data={data} />
    </>
  );
}
