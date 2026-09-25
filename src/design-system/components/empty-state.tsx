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
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="bg-muted flex size-11 items-center justify-center rounded-full">
          <Icon className="text-muted-foreground size-5" aria-hidden />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-lg font-bold">{title}</p>
        {description ? (
          <div className="text-muted-foreground max-w-md text-sm">{description}</div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
