// グラフの業務処理。所属する世帯の検針票を読み、表示する内容へ整える。
import "server-only";
import { currentYearMonthInJapan } from "@/shared/date/year-month";
import type { CurrentMembership } from "@/modules/household";
import { listMeterReadingsForGraphs } from "@/modules/meter-reading";
import { buildTrendView } from "./graph-rules";
import type { TrendView } from "./types";

// S06 グラフの推移タブに表示する内容を返す。検針票は、所属する世帯の分だけを読む。
export async function getTrendView(membership: CurrentMembership): Promise<TrendView> {
  // 世帯の検針票を読み、月ごとの並べ方や水道の区切りなどの計算は graph-rules に任せる。
  const readings = await listMeterReadingsForGraphs(membership);
  // 「今月」は日本時間で決める。
  return buildTrendView(readings, currentYearMonthInJapan());
}
