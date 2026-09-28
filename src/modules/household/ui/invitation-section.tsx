"use client";
// S07 設定の「招待コード」の区画。コードの発行と、使えるコードの一覧・コピーを行う（設計書 30_設定.md）。
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { issueInvitationAction } from "../actions";
import type { InvitationView } from "../types";

// クリップボードに入れられなかったときの文言（設計書 S07 の「エラー時の表示文言」）。
const COPY_FAILED_MESSAGE = "コピーできませんでした。コードを長押しして選択してください。";

// 「コピーしました」を出しておく時間（ミリ秒）。
const COPIED_DISPLAY_MS = 2000;

// 「招待コード」の区画。invitations は未使用で期限内のものが、発行が新しい順に並んでいる。
export function InvitationSection({ invitations }: { invitations: InvitationView[] }) {
  // 発行の処理が終わるまで、「コードを発行」を押せなくする。
  const [pending, startTransition] = useTransition();
  // 「コピーしました」を出している行のコードの ID。出していなければ null。
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // 「コピーしました」を元に戻すタイマー。続けて別の行をコピーしたときに、前のタイマーを止めるために覚えておく。
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 画面を離れるときに、残っているタイマーを止める。
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 発行の画面操作を呼ぶ。成功したらサーバーが画面のデータを読み直し、新しいコードが一覧の先頭に加わる。
  function handleIssue() {
    startTransition(async () => {
      const result = await issueInvitationAction();
      if (!result.ok) toast.error(result.message);
    });
  }

  // ハイフンつきのコードをクリップボードに入れ、その行のボタンを 2 秒間「コピーしました」にする。
  async function handleCopy(invitation: InvitationView) {
    try {
      await navigator.clipboard.writeText(invitation.code);
    } catch {
      // ブラウザがクリップボードを使わせてくれないときは、手で選ぶよう知らせる。
      toast.error(COPY_FAILED_MESSAGE);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setCopiedId(invitation.id);
    timerRef.current = setTimeout(() => setCopiedId(null), COPIED_DISPLAY_MS);
  }

  return (
    <section aria-labelledby="invitation-heading" className="flex flex-col">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 id="invitation-heading" className="text-sm font-bold">
          招待コード
        </h2>
        <Button variant="secondary" size="sm" onClick={handleIssue} disabled={pending}>
          コードを発行
        </Button>
      </div>
      {invitations.length === 0 ? (
        <p className="py-2.5 text-sm text-muted-foreground">使える招待コードはありません。</p>
      ) : (
        <ul>
          {invitations.map((invitation) => (
            <li
              key={invitation.id}
              className="flex items-center justify-between gap-3 border-b py-2.5 text-sm"
            >
              <div>
                <p className="font-bold tracking-wider">{invitation.code}</p>
                <p className="text-xs text-muted-foreground">
                  {invitation.expiresOn} まで・1 回限り
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopy(invitation)}
                // 「コピー」のボタンが行の数だけ並ぶので、読み上げではどのコードのボタンかも伝える。
                aria-label={`${invitation.code} を${copiedId === invitation.id ? "コピーしました" : "コピー"}`}
              >
                {/* コピーした直後だけ文字を変え、コピーできたことを知らせる。 */}
                {copiedId === invitation.id ? "コピーしました" : "コピー"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
