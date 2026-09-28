// S07 の「契約」区画。世帯の契約を契約中・終了済みに分けて一覧し、登録・編集画面への入口を置く。
import Link from "next/link";
import type { ContractList } from "../types";
import { Button } from "@/shared/ui/button";
import { UtilityDot } from "@/shared/ui/utility-dot";

// 契約一覧の 1 行。表示と明示的な「変更」ボタンを並べる。
function ContractListRow({
  item,
  muted = false,
}: {
  item: ContractList["active"][number];
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b py-3 text-sm ${muted ? "text-muted-foreground" : ""}`}
    >
      <span className="flex min-w-0 flex-col gap-1 lg:flex-row lg:items-center">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <UtilityDot utilityType={item.utilityType} />
          <span className="truncate">{item.name}</span>
        </span>
        <span className="text-xs text-muted-foreground lg:ml-auto">{item.period}</span>
      </span>
      <Button asChild variant="secondary" size="sm">
        <Link href={`/settings/contracts/${item.id}`}>変更</Link>
      </Button>
    </div>
  );
}

// S07 の契約の区画。契約が無いときは空の状態だけを表示する。
export function ContractListSection({ contracts }: { contracts: ContractList }) {
  const isEmpty = contracts.active.length === 0 && contracts.ended.length === 0;
  return (
    <section aria-labelledby="contract-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="contract-heading" className="text-sm font-bold">
          契約
        </h2>
        <Button asChild size="sm">
          <Link href="/settings/contracts/new">契約を登録</Link>
        </Button>
      </div>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">登録された契約はありません。</p>
      ) : (
        <div className="flex flex-col gap-3">
          {contracts.active.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">契約中</p>
              {contracts.active.map((item) => (
                <ContractListRow key={item.id} item={item} />
              ))}
            </div>
          )}
          {contracts.ended.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">終了済み</p>
              {contracts.ended.map((item) => (
                <ContractListRow key={item.id} item={item} muted />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
