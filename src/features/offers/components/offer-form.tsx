"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, type FieldPath } from "react-hook-form";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Input } from "@/design-system/primitives/input";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { OFFER_FIELDS, offerSchema, type OfferValues } from "../schemas/offer";

interface Spec {
  name: FieldPath<OfferValues>;
  label: string;
  hint?: string;
  kind?: "textarea" | "datetime";
  wide?: boolean;
}

const FIELDS: readonly Spec[] = [
  { name: "title", label: "Title", wide: true },
  { name: "category", label: "Category", hint: "For example travel, food or wellness." },
  { name: "description", label: "Description", kind: "textarea", wide: true },
  {
    name: "redemptionInstructions",
    label: "How to redeem",
    kind: "textarea",
    wide: true,
    hint: "A code, a link or instructions shown to users who claim the offer.",
  },
  { name: "terms", label: "Terms (optional)", kind: "textarea", wide: true },
  { name: "validFrom", label: "Valid from (optional)", kind: "datetime" },
  { name: "validUntil", label: "Valid until (optional)", kind: "datetime" },
];

interface OfferFormProps {
  title: string;
  initial: OfferValues;
  submitLabel: string;
  /** Throws an ApiError on failure (shown in the form). */
  onSubmit: (values: OfferValues) => Promise<unknown>;
  actions?: ReactNode;
}

export function OfferForm({ title, initial, submitLabel, onSubmit, actions }: OfferFormProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<OfferValues>({ resolver: zodResolver(offerSchema), defaultValues: initial });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, OFFER_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Offers reach all eligible marketplace users. Saving never publishes: submit the offer
            for Aayulogic review when it is ready.
          </CardDescription>
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
              const id = `offer-${field.name}`;
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
                      type={field.kind === "datetime" ? "datetime-local" : "text"}
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
