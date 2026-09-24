"use client";

import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
import { Input } from "@/design-system/primitives/input";
import { Textarea } from "@/design-system/primitives/textarea";
import { cn } from "@/shared/lib/cn";

export interface TextFieldSpec<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  hint?: string;
  type?: "email" | "url" | "tel";
  multiline?: boolean;
  /** Locked fields render read-only (for example verified identifiers). */
  locked?: boolean;
  wide?: boolean;
}

/** Labelled inputs for a React Hook Form, with hints and inline errors. */
export function TextFields<T extends FieldValues>({
  form,
  fields,
  idPrefix,
  disabled = false,
}: {
  form: UseFormReturn<T>;
  fields: readonly TextFieldSpec<T>[];
  idPrefix: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const error = form.formState.errors[field.name];
        const message = typeof error?.message === "string" ? error.message : undefined;
        const id = `${idPrefix}-${field.name}`;
        const common = {
          id,
          disabled: disabled || field.locked,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": fieldDescriptionIds(id, { hint: field.hint, error }),
          ...form.register(field.name),
        };
        return (
          <FormField
            key={field.name}
            id={id}
            label={field.label}
            hint={field.hint}
            error={message}
            className={cn((field.multiline || field.wide) && "sm:col-span-2")}
          >
            {field.multiline ? (
              <Textarea rows={3} {...common} />
            ) : (
              <Input type={field.type} {...common} />
            )}
          </FormField>
        );
      })}
    </div>
  );
}
