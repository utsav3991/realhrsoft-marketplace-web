"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { PROFILE_FIELDS, profileSchema, type ProfileValues } from "../schemas/partner";
import { TextFields, type TextFieldSpec } from "./text-fields";

function fieldsFor(lockVerified: boolean): readonly TextFieldSpec<ProfileValues>[] {
  const verifiedHint = lockVerified
    ? "Verified: changing it needs re-verification by Aayulogic."
    : undefined;
  return [
    {
      name: "legalName",
      label: "Legal business name",
      hint: verifiedHint ?? "As registered with the authorities.",
      locked: lockVerified,
    },
    { name: "displayName", label: "Display name", hint: "Shown to marketplace users." },
    {
      name: "registrationNumber",
      label: "Registration number",
      hint: verifiedHint ?? "Required before submission.",
      locked: lockVerified,
    },
    {
      name: "taxIdentifier",
      label: "Tax identifier (optional)",
      hint: verifiedHint,
      locked: lockVerified,
    },
    { name: "website", label: "Website (optional)", type: "url", wide: true },
    { name: "description", label: "About the business (optional)", multiline: true },
  ];
}

/**
 * The Partner's business profile. Once verified, the legal name, registration number and tax
 * identifier are fixed (they are sent unchanged; the server rejects any change).
 */
export function ProfileForm({
  defaultValues,
  lockVerified = false,
  submitLabel,
  onSubmit,
  onCancel,
  footer,
}: {
  defaultValues: ProfileValues;
  lockVerified?: boolean;
  submitLabel: string;
  /** Resolves on success or throws an ApiError, shown in the form. */
  onSubmit: (values: ProfileValues) => Promise<unknown>;
  onCancel?: () => void;
  footer?: ReactNode;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });
  const { isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, PROFILE_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {failure ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}
      <TextFields
        form={form}
        fields={fieldsFor(lockVerified)}
        idPrefix="profile"
        disabled={isSubmitting}
      />
      {footer}
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
