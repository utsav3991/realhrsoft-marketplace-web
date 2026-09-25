import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-xl border px-4 py-3 text-sm has-[>svg]:grid-cols-[--spacing(4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive: "border-destructive/40 bg-card text-destructive [&>svg]:text-current",
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
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("col-start-2 font-bold", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("text-muted-foreground col-start-2 text-sm", className)} {...props} />;
}
