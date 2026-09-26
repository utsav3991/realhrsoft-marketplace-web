import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

import { fieldControlClassName } from "./input";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldControlClassName,
        "flex field-sizing-content min-h-28 rounded-lg px-4 py-3 font-medium",
        className,
      )}
      {...props}
    />
  );
}
