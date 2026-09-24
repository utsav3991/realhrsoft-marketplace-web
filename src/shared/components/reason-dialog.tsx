"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
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
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { reasonFormSchema, type ReasonValues } from "@/shared/forms/reason";

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Resolves on success (the dialog closes) or throws an ApiError (shown in the dialog). */
  onConfirm: (reason: string) => Promise<unknown>;
}

/** Confirms an administrative change. Every such change carries an audited reason. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
}: ReasonDialogProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<ReasonValues>({
    resolver: zodResolver(reasonFormSchema),
    defaultValues: { reason: "" },
  });
  const { errors, isSubmitting } = form.formState;

  function handleOpenChange(next: boolean) {
    if (isSubmitting) return;
    if (!next) {
      form.reset();
      setFailure(null);
    }
    onOpenChange(next);
  }

  const onSubmit = form.handleSubmit(async ({ reason }) => {
    setFailure(null);
    try {
      await onConfirm(reason);
      handleOpenChange(false);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, { reason: "reason" })) setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {failure ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}

          <FormField
            id="reason"
            label="Reason"
            hint="Recorded in the audit log."
            error={errors.reason?.message}
          >
            <Textarea
              id="reason"
              rows={3}
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={fieldDescriptionIds("reason", {
                hint: true,
                error: errors.reason,
              })}
              {...form.register("reason")}
            />
          </FormField>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
