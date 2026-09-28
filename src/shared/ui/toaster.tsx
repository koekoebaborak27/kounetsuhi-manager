"use client";
// 「コピーしました」などの一時的な通知（トースト）を画面に出す場所。
// shadcn の sonner 部品はダークモード用のパッケージ（next-themes）を使うが、このアプリは明るい表示だけなので使わずに作っている。
import { Toaster as Sonner } from "sonner";

// トーストを表示する場所。layout.tsx に 1 つだけ置き、通知は sonner の toast() で出す。
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "border-border bg-card text-card-foreground rounded-lg",
        },
      }}
    />
  );
}
