import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs leading-none font-bold whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      intent: {
        neutral: "border-transparent bg-secondary text-secondary-foreground",
        info: "border-transparent bg-primary text-primary-foreground",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        danger: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-input text-foreground",
      },
    },
    defaultVariants: { intent: "neutral" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, intent, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ intent }), className)} {...props} />;
}
