import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

/** Shared by `Input`, `Textarea` and `SelectTrigger`: white field, 1px ring, lime focus halo. */
export const fieldControlClassName = cn(
  "border-input bg-card text-foreground shadow-ring w-full min-w-0 rounded-md border text-sm font-semibold transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
  "placeholder:text-muted-foreground placeholder:font-medium",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
);

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldControlClassName,
        "file:text-foreground flex h-11 px-4 py-2 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold",
        className,
      )}
      {...props}
    />
  );
}
