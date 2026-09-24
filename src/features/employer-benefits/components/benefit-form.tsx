"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import {
  BENEFIT_FIELDS,
  BENEFIT_TYPES,
  benefitSchema,
  type BenefitValues,
} from "../schemas/benefit";

type TextField = Exclude<FieldPath<BenefitValues>, "benefitType">;

interface Spec {
  name: TextField;
  label: string;
  hint?: string;
  kind?: "textarea" | "datetime" | "number" | "url" | "email" | "tel";
  wide?: boolean;
}

const SECTIONS: readonly { legend: string; fields: readonly Spec[] }[] = [
  {
    legend: "Details",
    fields: [
      { name: "description", label: "Description", kind: "textarea", wide: true },
      {
        name: "usageInstructions",
        label: "How to use it (optional)",
        kind: "textarea",
        wide: true,
        hint: "Tell employees how to claim or use this benefit.",
      },
      { name: "terms", label: "Terms (optional)", kind: "textarea", wide: true },
      {
        name: "externalUrl",
        label: "Link (optional)",
        kind: "url",
        wide: true,
        hint: "A full https:// link to more information.",
      },
    ],
  },
  {
    legend: "Availability",
    fields: [
      { name: "validFrom", label: "Valid from (optional)", kind: "datetime" },
      { name: "validUntil", label: "Valid until (optional)", kind: "datetime" },
      {
        name: "usageLimit",
        label: "Uses per employee (optional)",
        kind: "number",
        hint: "Leave empty for no limit.",
      },
    ],
  },
  {
    legend: "Contact (optional)",
    fields: [
      { name: "contactName", label: "Name" },
      { name: "contactEmail", label: "Email", kind: "email" },
      { name: "contactPhone", label: "Phone", kind: "tel" },
    ],
  },
];

const INPUT_TYPES = {
  datetime: "datetime-local",
  number: "number",
  url: "url",
  email: "email",
  tel: "tel",
} as const;

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

  function renderField(field: Spec) {
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
            type={field.kind ? INPUT_TYPES[field.kind] : "text"}
            min={field.kind === "number" ? 1 : undefined}
            {...common}
          />
        )}
      </FormField>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {failure ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertTitle>Not saved</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {renderField({ name: "title", label: "Title" })}
            <FormField id="benefit-benefitType" label="Type" error={errors.benefitType?.message}>
              <Controller
                control={form.control}
                name="benefitType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="benefit-benefitType"
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={errors.benefitType ? true : undefined}
                      aria-describedby={fieldDescriptionIds("benefit-benefitType", {
                        error: errors.benefitType,
                      })}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BENEFIT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          {SECTIONS.map((section) => (
            <fieldset key={section.legend} className="space-y-3">
              <legend className="text-sm font-medium">{section.legend}</legend>
              <div className="grid gap-4 sm:grid-cols-2">{section.fields.map(renderField)}</div>
            </fieldset>
          ))}
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
