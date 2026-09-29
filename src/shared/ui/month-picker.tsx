"use client";
// 年月を選ぶ欄。押すと、上に年の切り替え（◀ 2026年 ▶）、下に 1〜12 月のボタンが並ぶ小窓を開く。
// 請求月と、検針票の編集での使用月に使う。値は YYYY-MM の文字列で、未選択は空文字。
import { useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { splitYearMonth, toYearMonth } from "@/shared/date/year-month";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/ui/utils";

// 1〜12 月。ボタンを並べる順番に使う。
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// 年月の選択欄。min・max（YYYY-MM）の外の月は押せない。clearable のときは「未選択にする」を置く。
export function MonthPicker({
  value,
  onChange,
  min,
  max,
  placeholder,
  format,
  clearable = false,
  disabled = false,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  min: string;
  max: string;
  placeholder: string;
  format: (value: string) => string;
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  // 小窓を開いているかどうか。月を選んだら閉じるために自分で持つ。
  const [open, setOpen] = useState(false);
  // 小窓に表示している年。開くたびに、選択中の年（未選択なら上限の年）から始める。
  const [shownYear, setShownYear] = useState(() => splitYearMonth(value || max).year);
  const minYear = splitYearMonth(min).year;
  const maxYear = splitYearMonth(max).year;

  // 小窓を開くときに、表示する年を選択中の年へ戻す。前に開いたときに年を動かしたままにしないため。
  function handleOpenChange(next: boolean) {
    if (next) setShownYear(splitYearMonth(value || max).year);
    setOpen(next);
  }

  // 月のボタンを押したときに値を決め、小窓を閉じる。
  function select(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className="w-full justify-between font-normal"
        >
          <span className={value ? "" : "text-muted-foreground"}>
            {value ? format(value) : placeholder}
          </span>
          <CalendarIcon aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="前の年"
            disabled={shownYear <= minYear}
            onClick={() => setShownYear(shownYear - 1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="text-sm font-bold" aria-live="polite">
            {shownYear}年
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="次の年"
            disabled={shownYear >= maxYear}
            onClick={() => setShownYear(shownYear + 1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {MONTHS.map((month) => {
            const candidate = toYearMonth(shownYear, month);
            const selected = candidate === value;
            // YYYY-MM は文字列のまま大小を比べても、年月の前後と一致する。
            const outOfRange = candidate < min || candidate > max;
            return (
              <Button
                key={month}
                type="button"
                variant={selected ? "default" : "ghost"}
                size="sm"
                aria-pressed={selected}
                aria-label={`${shownYear}年${month}月`}
                disabled={outOfRange}
                onClick={() => select(candidate)}
                className={cn(selected && "font-bold")}
              >
                {month}月
              </Button>
            );
          })}
        </div>
        {clearable && (
          <div className="mt-2 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => select("")}>
              未選択にする
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
