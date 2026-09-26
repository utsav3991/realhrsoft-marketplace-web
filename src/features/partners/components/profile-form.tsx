"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, type FieldPath } from "react-hook-form";

import { RichTextEditor } from "@/design-system/components/rich-text-editor";
import { Button } from "@/design-system/primitives/button";
import {
  Form,
  FormActions,
  FormAlert,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
} from "@/design-system/primitives/form";
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
  name: Exclude<FieldPath<ProfileValues>, "reason">;
  label: string;
  optional?: boolean;
  hint?: string;
  placeholder?: string;
  type?: "email" | "url" | "tel";
  autoComplete?: string;
  multiline?: boolean;
  wide?: boolean;
}

const BUSINESS_FIELDS: readonly FieldSpec[] = [
  { name: "businessName", label: "Business name", hint: "The trading name employees see." },
  {
    name: "category",
    label: "Category",
    optional: true,
    placeholder: "Restaurant, Fitness, …",
    hint: "Free text.",
  },
  { name: "description", label: "About the business", optional: true, multiline: true },
  {
    name: "website",
    label: "Website",
    optional: true,
    type: "url",
    autoComplete: "url",
    placeholder: "https://",
    wide: true,
  },
];

const CONTACT_FIELDS: readonly FieldSpec[] = [
  { name: "contactName", label: "Contact person", autoComplete: "name" },
  { name: "contactEmail", label: "Contact email", type: "email", autoComplete: "email" },
  {
    name: "contactPhone",
    label: "Contact phone",
    optional: true,
    type: "tel",
    autoComplete: "tel",
    placeholder: "+9779801234567",
    hint: "International format.",
  },
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
  const { isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, PROFILE_FIELDS)) setFailure(errorMessage(error));
    }
  });

  const renderField = (spec: FieldSpec) => (
    <FormField
      key={spec.name}
      control={form.control}
      name={spec.name}
      render={({ field }) => (
        <FormItem className={cn((spec.multiline || spec.wide) && "sm:col-span-2")}>
          <FormLabel optional={spec.optional}>{spec.label}</FormLabel>
          <FormControl>
            {spec.multiline ? (
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isSubmitting}
              />
            ) : (
              <Input
                type={spec.type}
                autoComplete={spec.autoComplete}
                placeholder={spec.placeholder}
                {...field}
              />
            )}
          </FormControl>
          {spec.hint ? <FormDescription>{spec.hint}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="space-y-8">
        {failure ? <FormAlert>{failure}</FormAlert> : null}
        {children}
        <FormSection title="Business" disabled={isSubmitting}>
          {BUSINESS_FIELDS.map(renderField)}
        </FormSection>
        <FormSection
          title="Contact"
          description="Who Aayulogic contacts about this partnership."
          disabled={isSubmitting}
        >
          {CONTACT_FIELDS.map(renderField)}
        </FormSection>
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional={!reasonRequired}>{reasonRequired ? "Reason" : "Note"}</FormLabel>
              <FormControl>
                <Textarea rows={2} disabled={isSubmitting} {...field} />
              </FormControl>
              <FormDescription>Recorded in the audit log.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormActions>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {submitLabel}
          </Button>
        </FormActions>
      </form>
    </Form>
  );
}
