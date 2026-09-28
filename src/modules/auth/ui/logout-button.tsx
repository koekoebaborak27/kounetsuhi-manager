"use client";
// 「ログアウト」ボタン。確認を出さずにログアウトし、ログイン画面へ移る（設計書 S07）。
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { logout } from "../actions";

// 「ログアウト」ボタン。
export function LogoutButton() {
  // ログアウトの処理が終わるまで、ボタンを押せなくする。
  const [pending, startTransition] = useTransition();

  // ログアウトの画面操作を呼ぶ。成功したときはサーバー側でログイン画面へ移るので、ここでは失敗したときだけ扱う。
  function handleClick() {
    startTransition(async () => {
      const result = await logout();
      // 失敗したときは、画面を移らずにトーストで文言を知らせる。
      if (!result.ok) toast.error(result.message);
    });
  }

  return (
    <Button variant="secondary" onClick={handleClick} disabled={pending}>
      ログアウト
    </Button>
  );
}
