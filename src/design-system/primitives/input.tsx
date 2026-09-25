import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "border-input placeholder:text-muted-foreground flex h-11 w-full min-w-0 rounded-lg border bg-transparent px-3 py-2 text-base transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-1",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}
