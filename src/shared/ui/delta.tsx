// 増減率を色付きで表示する共通部品。増えたときは赤、減ったときは青、変わらない・割合が無いときは色を付けない。
// 色だけに頼らないよう、「+」「−」の符号も付ける。「前回比」などの語は使う側で前に付ける。
import { changeDirection, formatChangeRate } from "@/shared/format/change-rate";
import { cn } from "@/shared/ui/utils";

// 増減率（%。四捨五入済み）を「+15.1%」「−5.5%」の形で表示する。null のときは「—」を表示する。
export function Delta({ rate, className }: { rate: number | null; className?: string }) {
  const direction = changeDirection(rate);
  return (
    <span
      className={cn(
        direction === "increase" && "text-increase",
        direction === "decrease" && "text-decrease",
        className,
      )}
    >
      {formatChangeRate(rate)}
    </span>
  );
}
