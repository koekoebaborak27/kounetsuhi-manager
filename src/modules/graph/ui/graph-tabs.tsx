// S06 グラフの上のタブ（推移・年比較・年間）。表示中のタブは URL の ?tab= に持たせるので、リンクで切り替える。
import Link from "next/link";
import { GRAPH_TABS, type GraphTab } from "../graph-rules";
import { cn } from "@/shared/ui/utils";

// 「推移・年比較・年間」のタブを並べる。選択中のタブは、色と下線と文字の太さで示す。
export function GraphTabs({ current }: { current: GraphTab }) {
  return (
    <nav aria-label="グラフの種類" className="lg:max-w-105">
      <ul className="flex border-b">
        {GRAPH_TABS.map((tab) => {
          const active = tab.value === current;
          return (
            <li key={tab.value} className="flex-1">
              <Link
                // 推移は初期のタブなので、URL に何も付けない。
                href={tab.value === "trend" ? "/graphs" : `/graphs?tab=${tab.value}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block border-b-2 px-3 py-2 text-center text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active
                    ? "border-primary font-bold text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
