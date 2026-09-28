// タブのある画面で、世帯のデータに無い ID を開いたときの表示。S04 と S08 で共通に使う。
import { PageTitle } from "@/shared/ui/page-title";

// 見つからないデータの画面。
export default function NotFound() {
  return (
    <>
      <PageTitle>データが見つかりません。</PageTitle>
      <main className="px-4 py-4 text-sm text-muted-foreground lg:px-7">
        データが見つかりません。
      </main>
    </>
  );
}
