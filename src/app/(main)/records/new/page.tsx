// S04 検針票の入力（作成）の画面。種別と使用月は URL の type・month で受け取る（例: ?type=gas&month=2026-08）。
// ホームから開いたときは from=home が付き、「キャンセル」でホームへ戻る。
import { notFound, redirect } from "next/navigation";
import {
  editMeterReadingHref,
  getMeterReadingCreateForm,
  MeterReadingForm,
} from "@/modules/meter-reading";
import { requireMembership } from "@/modules/household";
import { PageTitle } from "@/shared/ui/page-title";

// URL の値を 1 つだけ取り出す。同じ名前が複数付いているときは正しくない値として扱う。
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// 新しい検針票を入力する画面。
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await requireMembership();
  const params = await searchParams;
  const fromHome = single(params.from) === "home";
  const result = await getMeterReadingCreateForm(
    membership,
    single(params.type),
    single(params.month),
    fromHome,
  );
  // 種別・使用月が正しくない、または範囲の外のときは共通の 404 表示にする。
  if (!result) notFound();
  // 同じ種別・使用月の検針票がすでにあれば、その検針票の編集として開く。
  if (result.kind === "existing")
    redirect(editMeterReadingHref(result.id, fromHome ? "home" : null));
  return (
    <>
      <PageTitle>検針票の入力</PageTitle>
      <MeterReadingForm data={result.data} />
    </>
  );
}
