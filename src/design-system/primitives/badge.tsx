import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

/** Uppercase tracked pill on a soft tint of its status hue. */
export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-3 py-1 text-[11px] leading-none font-semibold tracking-[0.14em] whitespace-nowrap uppercase [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      intent: {
        neutral: "bg-neutral-soft text-neutral-soft-foreground",
        info: "bg-info-soft text-info-soft-foreground",
        success: "bg-success-soft text-success-soft-foreground",
        warning: "bg-warning-soft text-warning-soft-foreground",
        danger: "bg-danger-soft text-danger-soft-foreground",
        /** Filled lime, for the one highlighted item (Featured). */
        primary: "bg-primary text-primary-foreground",
        outline: "border-border text-foreground bg-transparent",
      },
    },
    defaultVariants: { intent: "neutral" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, intent, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ intent }), className)} {...props} />;
}
