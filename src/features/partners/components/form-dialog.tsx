"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/primitives/dialog";

/** Dialog chrome for a small React Hook Form owned by the caller. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  submitting,
  failure,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  submitLabel: string;
  submitting: boolean;
  failure: string | null;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {failure ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}
          {children}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
