import type { ReactNode } from "react";
import { LeaveGuardProvider } from "@/shared/ui/leave-guard";
import { TabNav } from "@/shared/ui/tab-nav";

// タブのある画面（ホーム・記録・グラフ・設定と、そこから開く画面）の共通の枠。
// スマホでは中身の下にタブを、PC では左にメニューを置く。中身が長いときは中身だけを縦にスクロールする。
// 入力中の画面からタブで移るときの確認のため、中身とタブを確認の仕組みで包む。
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <LeaveGuardProvider>
      <div className="flex h-dvh flex-col lg:flex-row-reverse">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        <TabNav />
      </div>
    </LeaveGuardProvider>
  );
}
