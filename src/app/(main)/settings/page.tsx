import { LogoutButton } from "@/modules/auth";
import {
  getHouseholdSettings,
  HouseholdNameSection,
  InvitationSection,
  LeaveHouseholdButton,
  MemberList,
  requireMembership,
} from "@/modules/household";
import { PageTitle } from "@/shared/ui/page-title";

// S07 設定の画面（/settings）。所属している世帯のデータを読み、各区画を並べる。
// スマホでは縦に 1 列、PC（幅 1024px 以上）では左に世帯・メンバー・招待コード、右に契約を並べ、その下に退出とログアウトを置く。
export default async function Page() {
  // ログイン中の人の所属を確かめ、その世帯のデータだけを読む。
  const membership = await requireMembership();
  const settings = await getHouseholdSettings(membership);

  return (
    <>
      <PageTitle>設定</PageTitle>
      <main className="flex flex-col gap-8 px-4 py-4 lg:px-7">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col gap-8">
            <HouseholdNameSection name={settings.householdName} />
            <MemberList members={settings.members} />
            <InvitationSection invitations={settings.invitations} />
          </div>
          {/* 契約の区画。F02（TODO の 5-5）で契約の一覧に置き換える。 */}
          <section aria-labelledby="contract-heading" className="flex flex-col gap-2">
            <h2 id="contract-heading" className="text-sm font-bold">
              契約
            </h2>
            <p className="text-sm text-muted-foreground">準備中です。</p>
          </section>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* オーナーは退出できないので、一般のメンバーにだけ「世帯から退出」を出す。 */}
          {settings.myRole === "MEMBER" && <LeaveHouseholdButton />}
          <LogoutButton />
        </div>
      </main>
    </>
  );
}
