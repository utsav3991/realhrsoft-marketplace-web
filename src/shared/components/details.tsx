import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

/** Label/value grid for read-only record details. */
export function DetailList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <dl className={cn("grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3", className)}>
      {children}
    </dl>
  );
}

export function Detail({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="kicker text-muted-foreground mb-1.5 text-[11px]">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}
