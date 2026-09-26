"use client";

import { format, isValid, parse } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useId, useState } from "react";

import { fieldLabelId } from "@/design-system/primitives/form";
import { Calendar } from "@/design-system/primitives/calendar";
import { Input, fieldControlClassName } from "@/design-system/primitives/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/primitives/popover";
import { cn } from "@/shared/lib/cn";

const DATE = "yyyy-MM-dd";
const DISPLAY = "d MMM yyyy";

/** "YYYY-MM-DD" → a local Date, or undefined when empty or malformed. */
function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = parse(value, DATE, new Date());
  return isValid(date) ? date : undefined;
}

interface ControlProps {
  /** The trigger's id, which the field's label names (`FormControl` passes it). */
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Shows a clear button once a value is set (optional fields). */
  clearable?: boolean;
  onBlur?: () => void;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

interface DatePickerProps extends ControlProps {
  /** "YYYY-MM-DD", or "" for none. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest and latest selectable days, "YYYY-MM-DD". */
  min?: string;
  max?: string;
}

/** shadcn's date picker: a trigger showing the chosen day and a Calendar in a popover. */
export function DatePicker({
  id: idProp,
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder = "Pick a date",
  clearable,
  onBlur,
  className,
  ...aria
}: DatePickerProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-labelledby={`${fieldLabelId(id)} ${id}-value`}
            className={cn(
              fieldControlClassName,
              "flex h-11 items-center gap-2 px-4 text-left",
              clearable && selected && "pr-10",
            )}
            {...aria}
          >
            <CalendarIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span
              id={`${id}-value`}
              className={cn("truncate", !selected && "text-muted-foreground")}
            >
              {selected ? format(selected, DISPLAY) : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        {clearable && selected && !disabled ? (
          <button
            type="button"
            aria-label="Clear date"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
            onClick={() => onChange("")}
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? minDate}
          captionLayout="dropdown"
          startMonth={minDate}
          endMonth={maxDate}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, DATE));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateTimePickerProps extends ControlProps {
  /** "YYYY-MM-DDTHH:mm" (the `datetime-local` format, local time), or "" for none. */
  value: string;
  onChange: (value: string) => void;
  /** Time used when a day is picked before any time is set. */
  defaultTime?: string;
}

/** shadcn's date and time picker: a DatePicker for the day beside a time input. */
export function DateTimePicker({
  id: idProp,
  value,
  onChange,
  defaultTime = "00:00",
  disabled,
  placeholder,
  clearable,
  onBlur,
  className,
  ...aria
}: DateTimePickerProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [date = "", time = ""] = value ? value.split("T") : [];

  return (
    <div className={cn("flex gap-2", className)}>
      <span id={`${id}-time-label`} className="sr-only">
        time
      </span>
      <DatePicker
        id={id}
        value={date}
        onChange={(next) => onChange(next ? `${next}T${time || defaultTime}` : "")}
        disabled={disabled}
        placeholder={placeholder}
        clearable={clearable}
        onBlur={onBlur}
        className="min-w-0 flex-1"
        {...aria}
      />
      <Input
        id={`${id}-time`}
        type="time"
        aria-labelledby={`${fieldLabelId(id)} ${id}-time-label`}
        className="w-32 shrink-0"
        value={time}
        disabled={disabled || !date}
        onChange={(event) => {
          if (date) onChange(`${date}T${event.target.value || defaultTime}`);
        }}
        onBlur={onBlur}
        {...aria}
      />
    </div>
  );
}
