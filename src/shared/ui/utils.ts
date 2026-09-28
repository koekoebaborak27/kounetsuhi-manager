import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 画面の部品に付ける Tailwind のクラスを 1 つの文字列にまとめる。
// 条件によって付け外しするクラスを書けるようにし、同じ種類のクラスが重なったときは後に書いたほうを残す。
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
