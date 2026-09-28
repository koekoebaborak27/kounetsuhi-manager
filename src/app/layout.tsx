import type { Metadata } from "next";
import type { ReactNode } from "react";

// すべてのページで共通のタブ名と説明文。ブラウザのタブや検索結果に表示される。
export const metadata: Metadata = {
  title: "光熱費マネージャー",
  description: "電気・ガス・水道の請求額と使用量を記録して比べるための家族向けアプリ",
};

// すべてのページを包む一番外側の枠。ページ本体は children に入る。
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
