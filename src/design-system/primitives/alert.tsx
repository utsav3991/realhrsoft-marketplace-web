import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

const alertVariants = cva(
  "shadow-ring relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-xl border px-4 py-3 text-sm has-[>svg]:grid-cols-[--spacing(4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        info: "bg-info-soft text-info-soft-foreground border-transparent *:data-[slot=alert-description]:text-info-soft-foreground/90",
        success:
          "bg-success-soft text-success-soft-foreground border-transparent *:data-[slot=alert-description]:text-success-soft-foreground/90",
        warning:
          "bg-warning-soft text-warning-soft-foreground border-transparent *:data-[slot=alert-description]:text-warning-soft-foreground/90",
        destructive:
          "bg-danger-soft text-danger-soft-foreground border-transparent *:data-[slot=alert-description]:text-danger-soft-foreground/90",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Alert({
  className,
  variant,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 min-h-4 font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm font-medium [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}
