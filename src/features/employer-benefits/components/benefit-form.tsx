"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, type FieldPath } from "react-hook-form";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Input } from "@/design-system/primitives/input";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { BENEFIT_FIELDS, benefitSchema, type BenefitValues } from "../schemas/benefit";

interface Spec {
  name: FieldPath<BenefitValues>;
  label: string;
  hint?: string;
  kind?: "textarea" | "datetime" | "number";
  wide?: boolean;
}

const FIELDS: readonly Spec[] = [
  { name: "title", label: "Title", wide: true },
  { name: "description", label: "Description", kind: "textarea", wide: true },
  { name: "terms", label: "Terms (optional)", kind: "textarea", wide: true },
  { name: "validFrom", label: "Valid from (optional)", kind: "datetime" },
  { name: "validUntil", label: "Valid until (optional)", kind: "datetime" },
  {
    name: "usageLimit",
    label: "Uses per employee (optional)",
    kind: "number",
    hint: "Leave empty for no limit.",
  },
];

interface BenefitFormProps {
  title: string;
  initial: BenefitValues;
  submitLabel: string;
  /** Throws an ApiError on failure (shown in the form). */
  onSubmit: (values: BenefitValues) => Promise<unknown>;
  actions?: ReactNode;
}

/** The audience is always your own employees; it is set by the server, not here. */
export function BenefitForm({ title, initial, submitLabel, onSubmit, actions }: BenefitFormProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<BenefitValues>({
    resolver: zodResolver(benefitSchema),
    defaultValues: initial,
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, BENEFIT_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {failure ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertTitle>Not saved</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => {
              const id = `benefit-${field.name}`;
              const error = errors[field.name];
              const common = {
                id,
                disabled: isSubmitting,
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
                  className={field.wide ? "sm:col-span-2" : undefined}
                >
                  {field.kind === "textarea" ? (
                    <Textarea rows={3} {...common} />
                  ) : (
                    <Input
                      type={
                        field.kind === "datetime"
                          ? "datetime-local"
                          : field.kind === "number"
                            ? "number"
                            : "text"
                      }
                      min={field.kind === "number" ? 1 : undefined}
                      {...common}
                    />
                  )}
                </FormField>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            {actions}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {submitLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
