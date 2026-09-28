import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_JP } from "next/font/google";
import { Toaster } from "@/shared/ui/toaster";
import "./globals.css";

// すべてのページで共通のタブ名と説明文。ブラウザのタブや検索結果に表示される。
export const metadata: Metadata = {
  title: "光熱費マネージャー",
  description: "電気・ガス・水道の請求額と使用量を記録して比べるための家族向けアプリ",
};

// 本文の文字の書体。globals.css からは変数 --font-noto-sans-jp で使う。
// 日本語の書体はファイルが大きいため、ページを開く前の先読みはしない。
const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  preload: false,
});

// すべてのページを包む一番外側の枠。ページ本体は children に入る。
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
