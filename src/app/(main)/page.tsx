import { PageTitle } from "@/shared/ui/page-title";

// ホームの画面の仮のページ。タブの切り替えを確かめるためだけに置いている。中身は 5-7 で作る。
export default function HomePage() {
  return (
    <>
      <PageTitle>ホーム</PageTitle>
      <main className="px-4 py-4 text-sm text-muted-foreground lg:px-7">準備中です。</main>
    </>
  );
}
