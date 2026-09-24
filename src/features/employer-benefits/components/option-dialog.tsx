"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
import { Alert, AlertDescription } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import { Checkbox } from "@/design-system/primitives/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/primitives/dialog";
import { Input } from "@/design-system/primitives/input";
import { Label } from "@/design-system/primitives/label";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { OPTION_FIELDS, optionSchema, type OptionValues } from "../schemas/benefit";

interface OptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "add" hides the active switch: a new option is always active. */
  mode: "add" | "edit";
  initial: OptionValues;
  /** Resolves on success (the dialog closes) or throws an ApiError (shown in the dialog). */
  onSubmit: (values: OptionValues) => Promise<unknown>;
}

const TEXT_FIELDS = [
  { name: "name", label: "Name", hint: "For example “Employee + spouse” or “Premium”." },
  { name: "value", label: "Value (optional)", hint: "A short figure employees see, like “80%”." },
  { name: "sortOrder", label: "Position (optional)", hint: "Lower numbers are listed first." },
] as const;

/**
 * Adds or edits one option (variant) of a benefit; each save bumps the benefit's version.
 * Callers key it by the option being edited, so each opening starts from fresh form state.
 */
export function OptionDialog({ open, onOpenChange, mode, initial, onSubmit }: OptionDialogProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<OptionValues>({
    resolver: zodResolver(optionSchema),
    defaultValues: initial,
  });
  const { errors, isSubmitting } = form.formState;

  function handleOpenChange(next: boolean) {
    if (!isSubmitting) onOpenChange(next);
  }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, OPTION_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{mode === "add" ? "Add option" : "Edit option"}</DialogTitle>
            <DialogDescription>
              Options are variants of this benefit, such as coverage tiers.
            </DialogDescription>
          </DialogHeader>

          {failure ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}

          {TEXT_FIELDS.map((field) => {
            const id = `option-${field.name}`;
            const error = errors[field.name];
            return (
              <FormField
                key={field.name}
                id={id}
                label={field.label}
                hint={field.hint}
                error={error?.message}
              >
                <Input
                  id={id}
                  type={field.name === "sortOrder" ? "number" : "text"}
                  min={field.name === "sortOrder" ? 0 : undefined}
                  autoComplete="off"
                  disabled={isSubmitting}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={fieldDescriptionIds(id, { hint: field.hint, error })}
                  {...form.register(field.name)}
                />
              </FormField>
            );
          })}

          <FormField
            id="option-description"
            label="Description (optional)"
            error={errors.description?.message}
          >
            <Textarea
              id="option-description"
              rows={2}
              disabled={isSubmitting}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={fieldDescriptionIds("option-description", {
                error: errors.description,
              })}
              {...form.register("description")}
            />
          </FormField>

          {mode === "edit" ? (
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="option-isActive"
                    ref={field.ref}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="option-isActive">Offered to employees</Label>
                </div>
              )}
            />
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {mode === "add" ? "Add option" : "Save option"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
