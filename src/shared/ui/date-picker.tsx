"use client";
// 日付を選ぶ欄。押すとカレンダーを開き、選んだ日を YYYY-MM-DD の文字列で返す。
// 契約の開始日・終了日と、検針票の使用期間で同じ見た目にするため、共通部品にしている。
import { CalendarIcon, X } from "lucide-react";
import { ja } from "react-day-picker/locale";
import { dateOnlyToLocalDate, formatDateOnly, localDateToDateOnly } from "@/shared/date/date-only";
import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

// 日付の入力欄とカレンダーを結ぶ部品。clearLabel を渡すと、選んだ日を消す「×」ボタンを横に置く。
// id・aria-* は、フォームのラベルやエラー文言と日付のボタンを結ぶために受け取る。
export function DatePicker({
  value,
  onChange,
  placeholder,
  yearRange,
  clearLabel,
  disabled = false,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  yearRange: { from: number; to: number };
  clearLabel?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const startMonth = new Date(yearRange.from, 0, 1);
  const endMonth = new Date(yearRange.to, 11, 1);
  return (
    <div className="flex gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            className="min-w-0 flex-1 justify-between font-normal"
          >
            <span className={value ? "" : "text-muted-foreground"}>
              {value ? formatDateOnly(value) : placeholder}
            </span>
            <CalendarIcon aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? dateOnlyToLocalDate(value) : undefined}
            defaultMonth={value ? dateOnlyToLocalDate(value) : undefined}
            onSelect={(date) => date && onChange(localDateToDateOnly(date))}
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            locale={ja}
          />
        </PopoverContent>
      </Popover>
      {clearLabel && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={clearLabel}
          disabled={disabled}
          onClick={() => onChange("")}
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  );
}
