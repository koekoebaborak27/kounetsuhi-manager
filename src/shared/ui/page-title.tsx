import type { ReactNode } from "react";

// 画面の上に置くタイトルのバー。各画面の一番上で使う。
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <header className="border-b px-4 py-3.5 text-base font-bold lg:px-7">
      <h1>{children}</h1>
    </header>
  );
}
