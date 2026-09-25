"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, type FieldPath } from "react-hook-form";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
import { Alert, AlertDescription } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { cn } from "@/shared/lib/cn";

import {
  assistedProfileSchema,
  PROFILE_FIELDS,
  profileSchema,
  type ProfileValues,
} from "../schemas/partner";

interface FieldSpec {
  name: FieldPath<ProfileValues>;
  label: string;
  hint?: string;
  type?: "email" | "url" | "tel";
  autoComplete?: string;
  multiline?: boolean;
  wide?: boolean;
}

const FIELDS: readonly FieldSpec[] = [
  { name: "businessName", label: "Business name", hint: "The trading name employees see." },
  {
    name: "category",
    label: "Category (optional)",
    hint: "Free text, such as Restaurant or Fitness.",
  },
  {
    name: "description",
    label: "About the business (optional)",
    multiline: true,
  },
  { name: "contactName", label: "Contact person", autoComplete: "name" },
  { name: "contactEmail", label: "Contact email", type: "email", autoComplete: "email" },
  {
    name: "contactPhone",
    label: "Contact phone (optional)",
    type: "tel",
    autoComplete: "tel",
    hint: "International format, such as +9779801234567.",
  },
  { name: "website", label: "Website (optional)", type: "url", autoComplete: "url", wide: true },
];

/**
 * A partner's business profile. The API replaces every field on save, so clearing an optional
 * field removes it. Aayulogic's assisted edits require an audited reason; self-service saves
 * accept an optional note.
 */
export function ProfileForm({
  defaultValues,
  reasonRequired = false,
  submitLabel,
  onSubmit,
  onCancel,
  children,
}: {
  defaultValues: ProfileValues;
  reasonRequired?: boolean;
  submitLabel: string;
  /** Resolves on success or throws an ApiError, shown in the form. */
  onSubmit: (values: ProfileValues) => Promise<unknown>;
  onCancel?: () => void;
  /** Extra fields rendered before the profile (e.g. the organization for assisted intake). */
  children?: ReactNode;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(reasonRequired ? assistedProfileSchema : profileSchema),
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, PROFILE_FIELDS)) setFailure(errorMessage(error));
    }
  });

  const reasonHint = reasonRequired
    ? "Recorded in the audit log."
    : "Optional note, recorded in the audit log.";

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {failure ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}
      {children}
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const id = `partner-${field.name}`;
          const error = errors[field.name];
          const common = {
            id,
            disabled: isSubmitting,
            autoComplete: field.autoComplete,
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
              error={error?.message}
              className={cn((field.multiline || field.wide) && "sm:col-span-2")}
            >
              {field.multiline ? (
                <Textarea rows={4} {...common} />
              ) : (
                <Input type={field.type} {...common} />
              )}
            </FormField>
          );
        })}
        <FormField
          id="partner-reason"
          label={reasonRequired ? "Reason" : "Note (optional)"}
          hint={reasonHint}
          error={errors.reason?.message}
          className="sm:col-span-2"
        >
          <Textarea
            id="partner-reason"
            rows={2}
            disabled={isSubmitting}
            aria-invalid={errors.reason ? true : undefined}
            aria-describedby={fieldDescriptionIds("partner-reason", {
              hint: true,
              error: errors.reason,
            })}
            {...form.register("reason")}
          />
        </FormField>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
