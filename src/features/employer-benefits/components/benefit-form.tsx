"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Users } from "lucide-react";
import { useState } from "react";
import { useForm, useFormContext } from "react-hook-form";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Textarea } from "@/design-system/primitives/textarea";
import { BenefitValueFields } from "@/features/offers/components/benefit-value-fields";
import { AudienceOrganizations } from "@/features/offers/components/offer-form";
import { errorMessage, type Schemas } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import {
  BENEFIT_FIELDS,
  benefitSchema,
  MAX_CLAIMS_PER_EMPLOYEE,
  type BenefitValues,
} from "../schemas/benefit";

export type BenefitIntent = NonNullable<Schemas["BenefitContent"]["intent"]>;

export interface BenefitIntentButton {
  intent: BenefitIntent;
  label: string;
  /** The one primary button of the form; the others are outline. */
  primary?: boolean;
}

/** A company the client may target, and whether its employees can receive benefits now. */
export interface AudienceCompany {
  id: string;
  name: string;
  employer: boolean;
}

/**
 * Who the benefit reaches. A company's benefit always goes to its own employees; a client's
 * to every company of the client (including ones added later) or the selected companies.
 */
export type BenefitFormAudience =
  | { kind: "organization"; organizationName: string }
  | { kind: "client"; clientName: string; companies: readonly AudienceCompany[] };

interface BenefitFormProps {
  defaultValues: BenefitValues;
  audience: BenefitFormAudience;
  /** Submit buttons, one per intent the member may use here. */
  intents: readonly BenefitIntentButton[];
  /** Resolves on success or throws an ApiError, shown in the form. */
  onSubmit: (values: BenefitValues, intent: BenefitIntent) => Promise<unknown>;
  onCancel?: () => void;
}

/**
 * Benefit content, value, validity, usage limit and, for a client, the audience. The API
 * replaces every field on save.
 */
export function BenefitForm({
  defaultValues,
  audience,
  intents,
  onSubmit,
  onCancel,
}: BenefitFormProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<BenefitIntent | null>(null);
  const form = useForm<BenefitValues>({ resolver: zodResolver(benefitSchema), defaultValues });
  const { isSubmitting } = form.formState;

  function submitWith(intent: BenefitIntent) {
    return form.handleSubmit(async (values) => {
      setFailure(null);
      setPendingIntent(intent);
      try {
        await onSubmit(values, intent);
      } catch (error) {
        if (!applyApiFieldErrors(error, form, BENEFIT_FIELDS)) setFailure(errorMessage(error));
      } finally {
        setPendingIntent(null);
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const primary = intents.find((i) => i.primary) ?? intents[0];
          if (primary) void submitWith(primary.intent)(event);
        }}
        noValidate
        className="space-y-8"
      >
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
            name="headline"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Headline</FormLabel>
                <FormControl>
                  <Input placeholder="One free check-up a year" {...field} />
                </FormControl>
                <FormDescription>The line employees see first on the benefit card.</FormDescription>
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
                  Instructions and conditions employees see before and after using it.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel optional>Terms and conditions</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection
          title="Value"
          description="What each use gives. Words are never read as a price."
          disabled={isSubmitting}
        >
          <BenefitValueFields disabled={isSubmitting} />
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
                  How many times each employee may use it over its lifetime, 1–
                  {MAX_CLAIMS_PER_EMPLOYEE}. Lowering it blocks further uses; past uses are kept.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection title="Audience" columns={1} disabled={isSubmitting}>
          {audience.kind === "organization" ? (
            <div className="bg-muted/50 flex items-start gap-3 rounded-lg border p-4">
              <Users className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Own employees of {audience.organizationName}
                </p>
                <p className="text-muted-foreground text-xs">
                  Company benefits always go to your own employees only. Other organizations never
                  see them.
                </p>
              </div>
            </div>
          ) : (
            <ClientAudienceFields clientName={audience.clientName} companies={audience.companies} />
          )}
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
          {intents.map((button) => (
            <Button
              key={button.intent}
              type="button"
              variant={button.primary ? "default" : "outline"}
              disabled={isSubmitting}
              onClick={(event) => void submitWith(button.intent)(event)}
            >
              {pendingIntent === button.intent ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : null}
              {button.label}
            </Button>
          ))}
        </FormActions>
      </form>
    </Form>
  );
}

/** A client benefit's audience: every company of the client, or the selected ones. */
function ClientAudienceFields({
  clientName,
  companies,
}: {
  clientName: string;
  companies: readonly AudienceCompany[];
}) {
  const { control, watch } = useFormContext<BenefitValues>();
  const audienceType = watch("audienceType");
  return (
    <>
      <FormField
        control={control}
        name="audienceType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Companies</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full sm:w-96">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="all_client_organizations">
                  Every {clientName} company, including ones added later
                </SelectItem>
                <SelectItem value="selected_organizations">Selected companies</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Only employees of companies with Employer capacity receive it, while the company
              is active in RealHRSoft. Each employee&apos;s uses count across all their companies.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      {audienceType === "selected_organizations" ? (
        <AudienceOrganizations
          picker={(props) => <CompanyPicker companies={companies} {...props} />}
          fixedNote=""
        />
      ) : null}
    </>
  );
}

/** Adds one of the client's companies to the selection. */
function CompanyPicker({
  companies,
  selected,
  onAdd,
}: {
  companies: readonly AudienceCompany[];
  selected: readonly { id: string }[];
  onAdd: (company: { id: string; name: string }) => void;
}) {
  const remaining = companies.filter((c) => !selected.some((s) => s.id === c.id));
  if (companies.length === 0) {
    return <p className="text-muted-foreground text-sm">This client has no active companies.</p>;
  }
  if (remaining.length === 0) {
    return <p className="text-muted-foreground text-sm">Every company is selected.</p>;
  }
  return (
    <Select
      value=""
      onValueChange={(id) => {
        const company = remaining.find((c) => c.id === id);
        if (company) onAdd({ id: company.id, name: company.name });
      }}
    >
      <SelectTrigger className="w-full sm:w-96" aria-label="Add a company">
        <SelectValue placeholder="Add a company" />
      </SelectTrigger>
      <SelectContent>
        {remaining.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
            {company.employer ? "" : " (no Employer capacity)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
