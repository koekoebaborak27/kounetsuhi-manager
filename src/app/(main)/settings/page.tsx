import { LogoutButton } from "@/modules/auth";
import { PageTitle } from "@/shared/ui/page-title";

// 設定の画面の仮のページ。ログアウトを試せるよう、ボタンだけを置いている。中身は 5-4 の ③ で作る。
export default function Page() {
  return (
    <>
      <PageTitle>設定</PageTitle>
      <main className="px-4 py-4 text-sm lg:px-7">
        <p className="text-muted-foreground">準備中です。</p>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </main>
    </>
  );
}
