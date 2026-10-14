import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { fieldLabelId } from "@/design-system/primitives/form";
import { Label } from "@/design-system/primitives/label";
import { cn } from "@/shared/lib/cn";

interface FieldProps {
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

/**
 * Label, hint and error for a control outside a react-hook-form form (URL filters, lookups).
 * Inside a form use `FormField`/`FormItem` from `primitives/form`, which wire the ids themselves.
 */
export function Field({ id, label, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("grid content-start gap-3", className)}>
      <Label id={fieldLabelId(id)} htmlFor={id} className={cn(error && "text-destructive")}>
        {label}
      </Label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-sm leading-6 font-medium">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="text-destructive flex items-start gap-1.5 text-sm font-semibold"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
