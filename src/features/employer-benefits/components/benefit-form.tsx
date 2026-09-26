"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Users } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { DateTimePicker } from "@/design-system/components/date-picker";
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

import {
  BENEFIT_FIELDS,
  benefitSchema,
  MAX_CLAIMS_PER_EMPLOYEE,
  type BenefitValues,
} from "../schemas/benefit";

interface BenefitFormProps {
  defaultValues: BenefitValues;
  /** The employer whose employees are the fixed audience. */
  organizationName: string;
  submitLabel: string;
  /** Resolves on success or throws an ApiError, shown in the form. */
  onSubmit: (values: BenefitValues) => Promise<unknown>;
  onCancel?: () => void;
}

/**
 * Benefit content, validity and usage limit. The API replaces every field on save. There is no
 * audience field: a Company Benefit always goes to the organization's own employees (EMR-03).
 */
export function BenefitForm({
  defaultValues,
  organizationName,
  submitLabel,
  onSubmit,
  onCancel,
}: BenefitFormProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<BenefitValues>({ resolver: zodResolver(benefitSchema), defaultValues });
  const { isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, BENEFIT_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={(event) => void submit(event)} noValidate className="space-y-8">
        {failure ? <FormAlert>{failure}</FormAlert> : null}

        <FormSection
          title="Benefit"
          description="What employees see in Company benefits."
          disabled={isSubmitting}
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Free annual health check-up" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>What the benefit gives.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="usageRules"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel optional>How to use it</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Instructions and conditions employees see before and after claiming.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection title="Validity and usage" disabled={isSubmitting}>
          <FormField
            control={form.control}
            name="validFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid from</FormLabel>
                <FormControl>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Your local time. Employees see it from this moment once published.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>Valid until</FormLabel>
                <FormControl>
                  <DateTimePicker
                    clearable
                    defaultTime="23:59"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>Leave empty for an open-ended benefit.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxClaims"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Uses per employee</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_CLAIMS_PER_EMPLOYEE}
                    step={1}
                    className="sm:w-40"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  How many times each employee may claim it, 1–{MAX_CLAIMS_PER_EMPLOYEE}. Lowering
                  it never removes claims already made.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection title="Audience" columns={1}>
          <div className="bg-muted/50 flex items-start gap-3 rounded-lg border p-4">
            <Users className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium">Own employees of {organizationName}</p>
              <p className="text-muted-foreground text-xs">
                Company benefits always go to your own employees only. Other organizations never see
                them.
              </p>
            </div>
          </div>
        </FormSection>

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Note</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
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
