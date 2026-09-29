// ホームの業務処理。所属する世帯の検針票を読み、表示する内容へ整える。
import "server-only";
import { currentYearMonthInJapan } from "@/shared/date/year-month";
import type { CurrentMembership } from "@/modules/household";
import { listMeterReadingsForHome, usageMonthMax } from "@/modules/meter-reading";
import { buildHomeView } from "./home-rules";
import type { HomeView } from "./types";

// S03 ホームに表示する内容を返す。検針票は、所属する世帯の分だけを読む。
export async function getHomeView(membership: CurrentMembership): Promise<HomeView> {
  // 世帯の検針票を読み、最新・前回比・前年同月比・今年の合計などの計算は home-rules に任せる。
  const readings = await listMeterReadingsForHome(membership);
  // 「今月」は日本時間で決める。使用月にできる最後の月は検針票の機能の決まりに合わせる。
  const currentMonth = currentYearMonthInJapan();
  return buildHomeView(readings, currentMonth, usageMonthMax(currentMonth));
}
