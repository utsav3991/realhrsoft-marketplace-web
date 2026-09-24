"use client";

import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
import { Input } from "@/design-system/primitives/input";
import { Textarea } from "@/design-system/primitives/textarea";

import type { ContactValues } from "../schemas/business";

interface FieldSpec {
  name: keyof ContactValues | "legalName";
  label: string;
  hint?: string;
  type?: "email" | "url" | "tel";
  multiline?: boolean;
}

const LEGAL: FieldSpec = {
  name: "legalName",
  label: "Legal name",
  hint: "As registered. It cannot be changed after verification.",
};
const CONTACT: readonly FieldSpec[] = [
  { name: "displayName", label: "Display name", hint: "Shown to marketplace users." },
  { name: "contactEmail", label: "Contact email", type: "email" },
  { name: "contactPhone", label: "Contact phone (optional)", type: "tel" },
  { name: "website", label: "Website (optional)", type: "url" },
  { name: "description", label: "About the business (optional)", multiline: true },
];

/** Business and contact inputs shared by applications and the Partner profile. */
export function BusinessFields<T extends FieldValues>({
  form,
  includeLegalName = true,
  disabled = false,
}: {
  form: UseFormReturn<T>;
  includeLegalName?: boolean;
  disabled?: boolean;
}) {
  const fields = includeLegalName ? [LEGAL, ...CONTACT] : CONTACT;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const name = field.name as FieldPath<T>;
        const error = form.formState.errors[name];
        const message = typeof error?.message === "string" ? error.message : undefined;
        const id = `business-${field.name}`;
        const common = {
          id,
          disabled,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": fieldDescriptionIds(id, { hint: field.hint, error }),
          ...form.register(name),
        };
        return (
          <FormField
            key={field.name}
            id={id}
            label={field.label}
            hint={field.hint}
            error={message}
            className={field.multiline ? "sm:col-span-2" : undefined}
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
