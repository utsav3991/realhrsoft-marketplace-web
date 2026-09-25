import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-bold tracking-[-0.01em] whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Cobalt: the one committing action in a view (Save, Approve, Invite). */
        default: "bg-primary text-primary-foreground hover:bg-primary-deep active:bg-primary-deep",
        /** Black pill: promotional CTAs on marketplace browsing surfaces only. */
        ink: "bg-ink text-ink-foreground hover:bg-ink-pressed active:bg-ink-pressed",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        /** Outlined pill paired with a primary, or on its own for secondary actions. */
        outline:
          "border-2 border-foreground/12 bg-transparent hover:border-foreground/30 active:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "rounded-none text-primary underline-offset-4 hover:text-primary-deep hover:underline",
      },
      size: {
        default: "h-11 px-7",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the single child element (e.g. a Link) with button styling. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return <Component className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
