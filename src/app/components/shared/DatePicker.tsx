import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function dateToIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoToLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function formatDisplay(iso: string): string {
  const d = isoToLocalDate(iso);
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

export function StyledCalendar({
  value,
  onChange,
  min,
  max,
}: {
  value?: Date | null;
  onChange: (d: Date) => void;
  min?: Date;
  max?: Date;
}) {
  const today = startOfDay(new Date());
  const minDay = min ? startOfDay(min) : null;
  const maxDay = max ? startOfDay(max) : null;
  const selected = value ? startOfDay(value) : null;

  const [viewDate, setViewDate] = useState(() => {
    if (selected) return new Date(selected.getFullYear(), selected.getMonth(), 1);
    if (maxDay && maxDay < today) {
      return new Date(maxDay.getFullYear() - 24, maxDay.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    if (!selected) return;
    setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [selected?.getTime()]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function monthAllowed(y: number, m: number): boolean {
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    if (minDay && end < minDay) return false;
    if (maxDay && start > maxDay) return false;
    return true;
  }

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    if (monthAllowed(next.getFullYear(), next.getMonth())) setViewDate(next);
  }

  function shiftYear(delta: number) {
    const next = new Date(year + delta, month, 1);
    if (monthAllowed(next.getFullYear(), next.getMonth())) setViewDate(next);
  }

  return (
    <div className="w-[268px] select-none">
      <div className="flex items-center mb-3">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
          className="p-1 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="flex-1 text-center text-[15px] font-bold text-gray-900">{monthName}</span>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Previous year"
            onClick={() => shiftYear(-1)}
            className="p-0.5 rounded text-teal-500 hover:bg-teal-50"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[15px] font-bold text-teal-500 tabular-nums w-11 text-center">{year}</span>
          <button
            type="button"
            aria-label="Next year"
            onClick={() => shiftYear(1)}
            className="p-0.5 rounded text-teal-500 hover:bg-teal-50"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
          className="p-1 rounded-lg text-gray-600 hover:bg-gray-50 ml-0.5"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} className="h-9" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          date.setHours(0, 0, 0, 0);
          const outOfRange = Boolean((minDay && date < minDay) || (maxDay && date > maxDay));
          const isSelected = Boolean(selected && date.getTime() === selected.getTime());
          return (
            <button
              key={day}
              type="button"
              disabled={outOfRange}
              onClick={() => onChange(date)}
              className={`w-9 h-9 flex items-center justify-center text-sm rounded-full mx-auto transition-colors ${
                isSelected
                  ? "bg-teal-50 text-teal-600 font-semibold"
                  : outOfRange
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-800 hover:bg-teal-50 hover:text-teal-700"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  className = "",
  inputClassName = "",
  placeholder = "MM/DD/YYYY",
  side = "bottom",
  "aria-label": ariaLabel = "Choose date",
}: {
  value: string;
  onChange: (isoDate: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  side?: "top" | "bottom";
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => (value ? isoToLocalDate(value) : null), [value]);
  const minDate = min ? isoToLocalDate(min) ?? undefined : undefined;
  const maxDate = max ? isoToLocalDate(max) ?? undefined : undefined;

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-white text-left transition-shadow ${
            open
              ? "border-teal-400 ring-2 ring-teal-100"
              : "border-gray-200 hover:border-gray-300"
          } ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "text-gray-800"} ${inputClassName}`}
        >
          <Calendar size={16} className={disabled ? "text-gray-400 shrink-0" : "text-teal-500 shrink-0"} />
          <span className={`text-sm truncate ${value ? "text-gray-800" : "text-gray-400"}`}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side={side}
        sideOffset={8}
        className={`w-auto p-4 rounded-2xl border-gray-100 bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.14)] z-[80] ${className}`}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <StyledCalendar
          value={selected}
          min={minDate}
          max={maxDate}
          onChange={(d) => {
            onChange(dateToIsoLocal(d));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
