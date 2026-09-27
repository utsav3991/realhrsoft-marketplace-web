"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useId, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "@/design-system/primitives/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/primitives/popover";
import { cn } from "@/shared/lib/cn";

export interface FilterOption {
  value: string;
  label: string;
  description?: string;
}

export interface FilterComboboxProps {
  /** What is filtered, e.g. "Partner": the trigger reads "All partners" or the chosen name. */
  label: string;
  allLabel: string;
  value: string | null;
  /** The chosen option's name; the id stands in until it loads. */
  selectedLabel?: string;
  /** Options for the current search, found by the caller (the API searches). */
  options: readonly FilterOption[];
  loading?: boolean;
  onSearch: (search: string) => void;
  onChange: (value: string | null) => void;
  className?: string;
  fullWidth?: boolean;
}

/**
 * A toolbar filter that picks one record by name from a server-searched list. The trigger is
 * a pill like the other filters; clearing returns to "All …".
 */
export function FilterCombobox({
  label,
  allLabel,
  value,
  selectedLabel,
  options,
  loading = false,
  onSearch,
  onChange,
  className,
  fullWidth,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const [search, setSearch] = useState("");

  function choose(next: string | null) {
    onChange(next);
    setOpen(false);
  }

  function changeSearch(next: string) {
    setSearch(next);
    onSearch(next.trim());
  }

  const chosen = value ? (selectedLabel ?? `${value.slice(0, 8)}…`) : null;

  return (
    <div className={cn("flex items-center", className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) changeSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={chosen ? `${label}: ${chosen}` : `Filter by ${label.toLowerCase()}`}
            className={cn(
              "border-input bg-card shadow-ring hover:bg-surface-soft focus-visible:border-ring focus-visible:ring-ring/50 flex h-11 items-center justify-between gap-2 rounded-md border px-4 text-sm font-semibold outline-none focus-visible:ring-[3px]",
              fullWidth ? "w-full" : "max-w-64 min-w-44",
              chosen && "pr-9",
            )}
          >
            <span className={cn("truncate", !chosen && "text-muted-foreground")}>
              {chosen ?? allLabel}
            </span>
            {chosen ? null : <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          id={listId} 
          align="start" 
          className={cn("p-0", fullWidth ? "w-[var(--radix-popover-trigger-width)]" : "w-72")}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search ${label.toLowerCase()}s`}
              value={search}
              onValueChange={changeSearch}
            />
            <CommandList>
              {loading ? <CommandLoading>Searching…</CommandLoading> : null}
              {!loading ? <CommandEmpty>No matches.</CommandEmpty> : null}
              <CommandGroup>
                {value ? (
                  <CommandItem value="__all__" onSelect={() => choose(null)}>
                    <span className="text-muted-foreground">{allLabel}</span>
                  </CommandItem>
                ) : null}
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => choose(option.value)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{option.label}</p>
                      {option.description ? (
                        <p className="text-muted-foreground truncate text-xs">
                          {option.description}
                        </p>
                      ) : null}
                    </div>
                    <Check
                      aria-hidden
                      className={cn("size-4", option.value === value ? "opacity-100" : "opacity-0")}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {chosen ? (
        <button
          type="button"
          className="hover:bg-accent -ml-8 rounded-md p-1"
          aria-label={`Clear ${label.toLowerCase()} filter`}
          onClick={() => onChange(null)}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
