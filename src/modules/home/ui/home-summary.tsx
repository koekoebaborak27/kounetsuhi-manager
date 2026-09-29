// S03 ホームの中身。今年の合計と、電気・ガス・水道のカードを並べる。
// 表示だけで状態を持たないため、サーバーで描画する。
import Link from "next/link";
import { formatYen } from "@/shared/format/amount";
import { Button } from "@/shared/ui/button";
import { Delta } from "@/shared/ui/delta";
import { formatUsageMonth } from "@/shared/ui/usage-month";
import { UtilityDot, UTILITY_TYPE_LABELS } from "@/shared/ui/utility-dot";
import { newMeterReadingHref } from "@/modules/meter-reading";
import type { HomeCard, HomeView } from "../types";

// 種別ごとのカード。最新の検針票があれば請求額と各指標、無ければ「未登録」を出す。
function UtilityCard({ card }: { card: HomeCard }) {
  const { utilityType, latest } = card;
  const label = UTILITY_TYPE_LABELS[utilityType];
  return (
    <section
      aria-label={label}
      className="flex flex-col gap-2 rounded-lg border bg-card p-4 text-card-foreground"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm">
          <UtilityDot utilityType={utilityType} />
          <b>{label}</b>
          {latest && (
            <span>
              {formatUsageMonth(utilityType, latest.usageMonth, { withYear: latest.showYear })}
            </span>
          )}
        </h2>
        {latest ? (
          // 次の使用月が翌月より先になるときは、押せないボタンだけを置く。
          latest.nextMonth ? (
            <Button asChild size="sm">
              <Link
                href={newMeterReadingHref(utilityType, latest.nextMonth, "home")}
                aria-label={`${label}の次を作成`}
              >
                次を作成
              </Link>
            </Button>
          ) : (
            <Button size="sm" disabled aria-label={`${label}の次を作成（まだ作成できません）`}>
              次を作成
            </Button>
          )
        ) : (
          <Button asChild size="sm">
            <Link
              href={newMeterReadingHref(utilityType, card.createMonth, "home")}
              aria-label={`${label}を作成`}
            >
              作成
            </Link>
          </Button>
        )}
      </div>
      {latest ? (
        <>
          <p className="text-2xl font-bold">{formatYen(latest.amount)}</p>
          {/* スマホは 1 行に並べ、PC はカードが細いので 1 行ずつ縦に並べる。 */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm lg:flex-col">
            <span>
              前回比 <Delta rate={latest.monthRate} />
            </span>
            <span>
              前年同月比 <Delta rate={latest.yearRate} />
            </span>
            <span>
              {latest.dailyAmount === null ? "1日あたり —" : `${formatYen(latest.dailyAmount)}/日`}
            </span>
          </div>
        </>
      ) : (
        <p className="py-2 text-sm text-muted-foreground">未登録</p>
      )}
    </section>
  );
}

// ホームの全体。PC（幅 1024px 以上）では 3 枚のカードを横に並べる。
export function HomeSummary({ view }: { view: HomeView }) {
  return (
    <main className="flex flex-col gap-4 px-4 py-4 lg:px-7">
      <section
        aria-label={view.totalTitle}
        className="rounded-lg border border-highlight-border bg-highlight p-4 text-highlight-foreground lg:max-w-xs"
      >
        <h2 className="text-sm">{view.totalTitle}</h2>
        <p className="text-2xl font-bold">{formatYen(view.totalAmount)}</p>
      </section>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
        {view.cards.map((card) => (
          <UtilityCard key={card.utilityType} card={card} />
        ))}
      </div>
    </main>
  );
}
