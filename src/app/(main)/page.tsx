// S03 ホームの画面。所属する世帯の検針票から、今年の合計と種別ごとの最新の状況を表示する。
import { getHomeView, HomeSummary } from "@/modules/home";
import { requireMembership } from "@/modules/household";
import { PageTitle } from "@/shared/ui/page-title";

// 世帯の所属を確かめてから、ホームに表示する内容を読んで描画する。
export default async function HomePage() {
  const membership = await requireMembership();
  const view = await getHomeView(membership);
  return (
    <>
      <PageTitle>ホーム</PageTitle>
      <HomeSummary view={view} />
    </>
  );
}
