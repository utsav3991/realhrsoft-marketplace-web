import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

interface PageHeaderProps {
  title: string;
  /** Small uppercase kicker above the title (record type, filter state). */
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? <p className="kicker text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground max-w-3xl text-sm font-medium">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
