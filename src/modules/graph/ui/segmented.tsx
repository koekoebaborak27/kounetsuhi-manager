"use client";
// グラフの切り替えのボタン列（12か月 / 24か月、すべて / 電気 / ガス / 水道 など）。
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

// 選択肢の中から 1 つを選ぶボタン列。選んでいるボタンをもう一度押しても、選択は外れない。
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label={label}
      value={value}
      // 選択中のボタンを押すと空の値が渡ってくるので、その場合は何もせず今の選択のままにする。
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className="w-full sm:w-auto"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="flex-1 sm:flex-none">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
