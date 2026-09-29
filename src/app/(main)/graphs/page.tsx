// S06 グラフの画面。上のタブ（推移・年比較・年間）を URL の ?tab= で切り替える。
import { getTrendView, GraphTabs, parseGraphTab, TrendTab } from "@/modules/graph";
import { requireMembership } from "@/modules/household";
import { PageTitle } from "@/shared/ui/page-title";

// 世帯の所属を確かめてから、開いているタブに必要な内容だけを読んで描画する。
export default async function GraphsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const membership = await requireMembership();
  const tab = parseGraphTab((await searchParams).tab);
  return (
    <>
      <PageTitle>グラフ</PageTitle>
      <main className="flex flex-col gap-4 px-4 py-4 lg:px-7">
        <GraphTabs current={tab} />
        {tab === "trend" && <TrendTab view={await getTrendView(membership)} />}
        {/* 年比較・年間のタブは次の PR で作る。 */}
        {tab !== "trend" && <p className="text-sm text-muted-foreground">準備中です。</p>}
      </main>
    </>
  );
}
