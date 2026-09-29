// 光熱費の種別を画面に表示するための共通部品。種別名と並び順もここにまとめ、画面ごとの表記ゆれを防ぐ。
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import { cn } from "@/shared/ui/utils";

// 種別の画面表示名。電気・ガス・水道の順は一覧や選択肢でも共通に使う。
export const UTILITY_TYPES: readonly UtilityType[] = ["ELECTRICITY", "GAS", "WATER"];

// 種別ごとの画面表示名。
export const UTILITY_TYPE_LABELS: Record<UtilityType, string> = {
  ELECTRICITY: "電気",
  GAS: "ガス",
  WATER: "水道",
};

// 種別を表す小さな色の点。色だけに頼らず、近くに種別名も表示する画面で使う。
export function UtilityDot({
  utilityType,
  className,
}: {
  utilityType: UtilityType;
  className?: string;
}) {
  const colorClass = {
    ELECTRICITY: "bg-elec",
    GAS: "bg-gas",
    WATER: "bg-water",
  }[utilityType];

  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", colorClass, className)}
    />
  );
}

// 種別ごとの使用量の単位。
export const UTILITY_TYPE_UNITS: Record<UtilityType, string> = {
  ELECTRICITY: "kWh",
  GAS: "㎥",
  WATER: "㎥",
};
