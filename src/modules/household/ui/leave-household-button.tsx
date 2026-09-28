"use client";
// 「世帯から退出」ボタン。確認を出し、「退出する」を押したら所属を消して初回設定の画面へ移る（設計書 30_設定.md）。
// 一般のメンバーにだけ表示する。出し分けは呼び出し側（設定の画面）で行う。
import { useState, useTransition, type MouseEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { leaveHouseholdAction } from "../actions";

// 「世帯から退出」ボタンと確認ダイアログ。
export function LeaveHouseholdButton() {
  // 確認ダイアログを開いているかどうか。失敗したときに閉じるため、自分で持つ。
  const [open, setOpen] = useState(false);
  // 退出の処理が終わるまで、確認ダイアログのボタンを押せなくする。
  const [pending, startTransition] = useTransition();

  // 「退出する」を押したら、退出の画面操作を呼ぶ。
  function handleLeave(event: MouseEvent<HTMLButtonElement>) {
    // 押した時点でダイアログが閉じる標準の動きを止め、処理が終わるまで開いたままにする。
    event.preventDefault();
    startTransition(async () => {
      const result = await leaveHouseholdAction();
      // 成功したときはサーバー側で初回設定の画面へ移る。失敗したときはダイアログを閉じてトーストで知らせる。
      if (result && !result.ok) {
        setOpen(false);
        toast.error(result.message);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary">世帯から退出</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">世帯から退出しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            退出すると、この世帯の記録は見られなくなります。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary" disabled={pending}>
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleLeave} disabled={pending}>
            退出する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
