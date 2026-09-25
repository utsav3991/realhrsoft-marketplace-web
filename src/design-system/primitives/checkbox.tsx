"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer border-input size-4 shrink-0 rounded-xs border transition-shadow outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "data-[state=checked]:border-ring data-[state=checked]:bg-ring data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-content-center text-current">
        <Check className="size-3.5" aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
