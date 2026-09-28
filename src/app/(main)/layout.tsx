import type { ReactNode } from "react";
import { TabNav } from "@/shared/ui/tab-nav";

// タブのある画面（ホーム・記録・グラフ・設定と、そこから開く画面）の共通の枠。
// スマホでは中身の下にタブを、PC では左にメニューを置く。中身が長いときは中身だけを縦にスクロールする。
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col lg:flex-row-reverse">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      <TabNav />
    </div>
  );
}
