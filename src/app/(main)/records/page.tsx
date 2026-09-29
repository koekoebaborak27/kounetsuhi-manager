// S05 記録の画面。表示する月は URL の month（例: ?month=2026-08）で受け取る。
import { getRecordsMonth, RecordsMonth } from "@/modules/meter-reading";
import { requireMembership } from "@/modules/household";
import { PageTitle } from "@/shared/ui/page-title";

// 使用月を 1 か月ずつ切り替えながら、種別ごとの検針票の登録状況を表示する画面。
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const membership = await requireMembership();
  const { month } = await searchParams;
  // 同じ名前が複数付いた URL は、正しくない月として前月を表示する。
  const view = await getRecordsMonth(membership, typeof month === "string" ? month : undefined);
  return (
    <>
      <PageTitle>記録</PageTitle>
      <RecordsMonth view={view} />
    </>
  );
}
