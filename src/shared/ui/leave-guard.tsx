"use client";
// 入力中の画面から離れる前の確認。入力画面が「確認が要る」と知らせている間だけ、タブで移る前に確認を出す。
// 再読み込み・ブラウザのタブを閉じるときは、ブラウザが用意している確認を出す（文言はブラウザが決める）。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

// 入力画面とタブの間で受け渡す値。
type LeaveGuardValue = {
  // 入力画面が、離れる前に確認が要るかどうかを知らせる。
  setGuarded: (guarded: boolean) => void;
  // タブを押したときに呼ぶ。確認が要らなければ true を返し、要るときは確認を開いて false を返す。
  requestLeave: (href: string) => boolean;
};

// 確認の仕組みの外（ログイン画面など）で使われたときは、何もせずにそのまま移る。
const LeaveGuardContext = createContext<LeaveGuardValue>({
  setGuarded: () => {},
  requestLeave: () => true,
});

// タブのある画面の枠に置き、中の入力画面とタブを確認の仕組みでつなぐ。
export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // 入力画面が「確認が要る」と知らせているかどうか。
  const [guarded, setGuarded] = useState(false);
  // 確認を開いている間の移動先。null のときは確認を閉じている。
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // 確認が要るときは移動を止めて確認を開く。
  const requestLeave = useCallback(
    (href: string) => {
      if (!guarded) return true;
      setPendingHref(href);
      return false;
    },
    [guarded],
  );

  // 「移動する」を押したら、確認を外してから移る。移った先で再び確認が出ないようにするため。
  function confirmLeave() {
    if (pendingHref === null) return;
    setGuarded(false);
    router.push(pendingHref);
    setPendingHref(null);
  }

  // 確認が要る間だけ、再読み込み・ブラウザのタブを閉じるときのブラウザ標準の確認を出す。
  useEffect(() => {
    if (!guarded) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // 古いブラウザは returnValue に値が入っているときだけ確認を出す。
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [guarded]);

  const value = useMemo(() => ({ setGuarded, requestLeave }), [requestLeave]);

  return (
    <LeaveGuardContext value={value}>
      {children}
      <AlertDialog
        open={pendingHref !== null}
        onOpenChange={(open) => !open && setPendingHref(null)}
      >
        {/* 設計書の文言は 1 文だけなので見出しに置き、補足の説明文は付けない。 */}
        <AlertDialogContent size="sm" aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>入力内容が失われます。移動しますか？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">キャンセル</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={confirmLeave}>
              移動する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LeaveGuardContext>
  );
}

// 入力画面で使う。guarded が true の間は、離れる前に確認を出す。画面を離れたら確認を外す。
export function useLeaveGuard(guarded: boolean): void {
  const { setGuarded } = useContext(LeaveGuardContext);
  useEffect(() => {
    setGuarded(guarded);
    return () => setGuarded(false);
  }, [guarded, setGuarded]);
}

// タブで使う。押されたときに確認が要るかを尋ねる関数を返す。
export function useRequestLeave(): (href: string) => boolean {
  return useContext(LeaveGuardContext).requestLeave;
}
