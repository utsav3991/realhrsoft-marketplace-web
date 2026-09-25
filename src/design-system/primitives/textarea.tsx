import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "border-input placeholder:text-muted-foreground flex field-sizing-content min-h-20 w-full rounded-lg border bg-transparent px-3 py-2.5 text-base transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-1",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}
