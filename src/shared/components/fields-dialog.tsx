"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DateTimePicker } from "@/design-system/components/date-picker";
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
import {
  Form,
  FormAlert,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import { Input } from "@/design-system/primitives/input";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage, isUuid } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { reasonSchema } from "@/shared/forms/reason";

export interface DialogField {
  /** Form field name; also the request body field used to place 422 errors. */
  name: string;
  label: string;
  hint?: ReactNode;
  kind?: "text" | "uuid" | "datetime";
  optional?: boolean;
  maxLength?: number;
  /** Initial value, e.g. the current name when editing. */
  defaultValue?: string;
}

/** Submitted values: text as typed (trimmed), uuids as-is, datetimes as ISO 8601 with zone. */
export type DialogValues = Record<string, string | undefined> & { reason: string };

function schemaFor(fields: readonly DialogField[]) {
  const shape: Record<string, z.ZodType<string, string>> = { reason: reasonSchema };
  for (const field of fields) {
    let value = z.string().trim();
    if (field.maxLength)
      value = value.max(field.maxLength, `At most ${field.maxLength} characters`);
    const refined =
      field.kind === "uuid"
        ? value.refine((v) => v === "" || isUuid(v), "Enter a valid identifier")
        : value;
    shape[field.name] = field.optional
      ? refined
      : refined.refine((v) => v.length > 0, `Enter ${field.label.toLowerCase()}`);
  }
  return z.object(shape);
}

function toIso(local: string): string {
  return new Date(local).toISOString();
}

interface FieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  fields: readonly DialogField[];
  destructive?: boolean;
  /** Resolves on success (the dialog closes) or throws an ApiError (shown in the dialog). */
  onConfirm: (values: DialogValues) => Promise<unknown>;
}

/** A small audited form: a few fields plus the reason every governance decision carries. */
export function FieldsDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  fields,
  destructive = false,
  onConfirm,
}: FieldsDialogProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const schema = useMemo(() => schemaFor(fields), [fields]);
  const defaults = useMemo(
    () =>
      Object.fromEntries([...fields.map((f) => [f.name, f.defaultValue ?? ""]), ["reason", ""]]),
    [fields],
  );
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const { isSubmitting } = form.formState;

  function handleOpenChange(next: boolean) {
    if (isSubmitting) return;
    if (!next) {
      form.reset(defaults);
      setFailure(null);
    }
    onOpenChange(next);
  }

  const onSubmit = form.handleSubmit(async (raw) => {
    setFailure(null);
    const values: DialogValues = { reason: raw.reason?.trim() ?? "" };
    for (const field of fields) {
      const value = raw[field.name]?.trim() ?? "";
      values[field.name] =
        value === "" ? undefined : field.kind === "datetime" ? toIso(value) : value;
    }
    try {
      await onConfirm(values);
      handleOpenChange(false);
    } catch (error) {
      const mapping = Object.fromEntries(
        [...fields.map((f) => f.name), "reason"].map((name) => [name, name]),
      );
      if (!applyApiFieldErrors(error, form, mapping)) setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            {failure ? <FormAlert>{failure}</FormAlert> : null}

            {fields.map((spec) => (
              <FormField
                key={spec.name}
                control={form.control}
                name={spec.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional={spec.optional}>{spec.label}</FormLabel>
                    <FormControl>
                      {spec.kind === "datetime" ? (
                        <DateTimePicker
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          clearable={spec.optional}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <Input
                          autoComplete="off"
                          spellCheck={spec.kind === "uuid" ? false : undefined}
                          className={spec.kind === "uuid" ? "font-mono" : undefined}
                          {...field}
                        />
                      )}
                    </FormControl>
                    {spec.hint ? <FormDescription>{spec.hint}</FormDescription> : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Recorded in the audit log.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
