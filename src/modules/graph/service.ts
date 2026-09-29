// グラフの業務処理。所属する世帯の検針票を読み、表示する内容へ整える。
import "server-only";
import { currentYearMonthInJapan } from "@/shared/date/year-month";
import type { CurrentMembership } from "@/modules/household";
import { listMeterReadingsForGraphs } from "@/modules/meter-reading";
import { buildAnnualView, buildCompareView, buildTrendView } from "./graph-rules";
import type { AnnualView, CompareView, TrendView } from "./types";

// S06 グラフの推移タブに表示する内容を返す。検針票は、所属する世帯の分だけを読む。
export async function getTrendView(membership: CurrentMembership): Promise<TrendView> {
  // 世帯の検針票を読み、月ごとの並べ方や水道の区切りなどの計算は graph-rules に任せる。
  const readings = await listMeterReadingsForGraphs(membership);
  // 「今月」は日本時間で決める。
  return buildTrendView(readings, currentYearMonthInJapan());
}

// S06 グラフの年比較タブに表示する内容を返す。検針票は、所属する世帯の分だけを読む。
export async function getCompareView(membership: CurrentMembership): Promise<CompareView> {
  // 世帯の検針票を読み、年ごとの並べ方や水道の区切りなどの計算は graph-rules に任せる。
  const readings = await listMeterReadingsForGraphs(membership);
  // 「今年」は日本時間の今月から決める。
  return buildCompareView(readings, currentYearMonthInJapan());
}

// S06 グラフの年間タブに表示する内容を返す。検針票は、所属する世帯の分だけを読む。
export async function getAnnualView(membership: CurrentMembership): Promise<AnnualView> {
  // 世帯の検針票を読み、合計・前年比・月平均などの計算は graph-rules に任せる。
  const readings = await listMeterReadingsForGraphs(membership);
  // 「今年」は日本時間の今月から決める。
  return buildAnnualView(readings, currentYearMonthInJapan());
}
