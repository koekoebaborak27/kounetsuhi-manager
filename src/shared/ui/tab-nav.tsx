"use client";
// 「ホーム・記録・グラフ・設定」の 4 つのタブ。
// 画面の幅が 1024px 未満では画面の下部に横に並べ、1024px 以上では左側に縦のメニューとして並べる（DESIGN.md「3. 画面の骨組み」）。
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLine, House, List, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/ui/utils";

// タブ 1 つ分の情報。href はタブを押したときに開く画面の URL。
type Tab = { href: string; label: string; icon: LucideIcon };

// タブの並び。上（PC）または左（スマホ）から順に表示する。
const TABS: Tab[] = [
  { href: "/", label: "ホーム", icon: House },
  { href: "/records", label: "記録", icon: List },
  { href: "/graphs", label: "グラフ", icon: ChartLine },
  { href: "/settings", label: "設定", icon: Settings },
];

// 開いている画面の URL が、そのタブの画面（またはその下の画面）かどうかを判定する。
// ホーム（/）は、ほかのすべての URL の先頭にも当たってしまうため、完全に一致したときだけ選択中にする。
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// 4 つのタブを表示する。選択中のタブは色と文字の太さで示す。
export function TabNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="メインメニュー"
      className="border-t lg:w-45 lg:shrink-0 lg:border-t-0 lg:border-r lg:bg-sidebar lg:py-4"
    >
      <div className="hidden px-4 pb-4 font-bold lg:block">光熱費マネージャー</div>
      <ul className="flex lg:flex-col">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1 lg:flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 pt-2.5 pb-3.5 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "lg:flex-row lg:gap-2 lg:border-l-4 lg:border-transparent lg:px-3 lg:py-2.5 lg:text-sm lg:text-sidebar-foreground",
                  active && "font-bold text-primary",
                  active && "lg:border-primary lg:bg-accent lg:text-accent-foreground",
                )}
              >
                <Icon className="size-5 lg:size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
