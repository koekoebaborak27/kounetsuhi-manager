// S07 設定の「メンバー」の区画。名前・メールアドレス・役割を、参加した順に並べる（設計書 30_設定.md）。
import type { MemberRole, MemberView } from "../types";

// 役割を画面に出す言葉にする。
const ROLE_LABELS: Record<MemberRole, string> = { OWNER: "オーナー", MEMBER: "一般" };

// 「メンバー」の区画。members は参加した順に並んでいるものを受け取る。
export function MemberList({ members }: { members: MemberView[] }) {
  return (
    <section aria-labelledby="member-list-heading" className="flex flex-col">
      <h2 id="member-list-heading" className="mb-1 text-sm font-bold">
        メンバー
      </h2>
      <ul>
        {members.map((member) => (
          <li
            key={member.userId}
            className="flex items-center justify-between gap-3 border-b py-2.5 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate">{member.name}</p>
              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {ROLE_LABELS[member.role]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
