import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "bg-card/60 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="bg-accent flex size-12 items-center justify-center rounded-2xl">
          <Icon className="text-accent-foreground size-5" aria-hidden />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-lg font-semibold tracking-[-0.02em]">{title}</p>
        {description ? (
          <div className="text-muted-foreground max-w-md text-sm font-medium">{description}</div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
