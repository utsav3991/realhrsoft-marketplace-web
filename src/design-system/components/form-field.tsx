import type { ReactNode } from "react";

import { Label } from "@/design-system/primitives/label";
import { cn } from "@/shared/lib/cn";

interface FormFieldProps {
  /** The control's id. The control sets `aria-describedby` from `fieldDescriptionIds(id, …)`. */
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** ids the control should reference in `aria-describedby`, or undefined when there are none. */
export function fieldDescriptionIds(
  id: string,
  { hint, error }: { hint?: unknown; error?: unknown },
): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function FormField({ id, label, hint, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
