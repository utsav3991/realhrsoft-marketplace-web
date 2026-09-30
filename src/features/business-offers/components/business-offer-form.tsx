"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Switch } from "@/design-system/primitives/switch";
import { Textarea } from "@/design-system/primitives/textarea";
import { BenefitValueFields } from "@/features/offers/components/benefit-value-fields";
import {
  AudienceOrganizations,
  controlledProps,
  EmployeeTermsFields,
  type CategoryOption,
  type IntentButton,
  type OfferIntent,
} from "@/features/offers/components/offer-form";
import {
  BUSINESS_AUDIENCE_LABEL,
  generatePromoCode,
  type AudienceOrganization,
} from "@/features/offers/schemas/offer";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import {
  BUSINESS_OFFER_FIELDS,
  businessOfferSchema,
  type BusinessOfferValues,
} from "../schemas/business-offer";

interface BusinessOfferFormProps {
  defaultValues: BusinessOfferValues;
  categories: readonly CategoryOption[];
  /** Submit buttons, one per intent the actor may use here. */
  intents: readonly IntentButton[];
  /** Adds audience organizations: the business directory, or the admin organization search. */
  organizationPicker: (props: {
    selected: readonly AudienceOrganization[];
    onAdd: (organization: AudienceOrganization) => void;
  }) => ReactNode;
  /**
   * Why the employee switch cannot be turned on (the offer is posted as an employer, not a
   * verified partner: vouchers are partner-bound), or null when it can. A switch already on
   * can still be turned off.
   */
  employeeSwitchBlocked: string | null;
  reasonHint: string;
  /** Employees may hold the published promo code, so it can no longer change. */
  promoCodeLocked?: boolean;
  /** Resolves on success or throws an ApiError, shown in the form. */
  onSubmit: (values: BusinessOfferValues, intent: OfferIntent) => Promise<unknown>;
  onCancel?: () => void;
  /** Extra fields rendered first (e.g. the provider for administrators). */
  children?: ReactNode;
}

/**
 * One version of a business offer's terms: content, benefit value, the business audience and
 * what enquirers should include, and the employee switch with its claim terms. The API replaces
 * every field on save.
 */
export function BusinessOfferForm({
  defaultValues,
  categories,
  intents,
  organizationPicker,
  employeeSwitchBlocked,
  reasonHint,
  promoCodeLocked = false,
  onSubmit,
  onCancel,
  children,
}: BusinessOfferFormProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<OfferIntent | null>(null);
  // Turning the switch on starts the employee terms with a generated promo code.
  const [initialValues] = useState(() => ({
    ...defaultValues,
    promoCode: defaultValues.promoCode || generatePromoCode(),
  }));
  const form = useForm<BusinessOfferValues>({
    resolver: zodResolver(businessOfferSchema),
    defaultValues: initialValues,
  });
  const { isSubmitting } = form.formState;
  const audienceType = form.watch("audienceType");
  const showToEmployees = form.watch("showToEmployees");
  const controlled = (field: Parameters<typeof controlledProps>[0]) =>
    controlledProps(field, isSubmitting);

  function submitWith(intent: OfferIntent) {
    return form.handleSubmit(async (values) => {
      setFailure(null);
      setPendingIntent(intent);
      try {
        await onSubmit(values, intent);
      } catch (error) {
        if (!applyApiFieldErrors(error, form, BUSINESS_OFFER_FIELDS)) setFailure(errorMessage(error));
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
        {children}

        <FormSection
          title="Offer"
          description="What other organizations see in their business catalogue."
          disabled={isSubmitting}
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.isActive ? category.name : `${category.name} (retired)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Input placeholder="30% off annual memberships for your staff" {...field} />
                </FormControl>
                <FormDescription>The line organizations see first on the offer card.</FormDescription>
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
                  <RichTextEditor {...controlled(field)} />
                </FormControl>
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
                  <RichTextEditor {...controlled(field)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="validFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid from</FormLabel>
                <FormControl>
                  <DateTimePicker {...controlled(field)} />
                </FormControl>
                <FormDescription>Your local time.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel optional={!showToEmployees}>Valid until</FormLabel>
                <FormControl>
                  <DateTimePicker defaultTime="23:59" clearable {...controlled(field)} />
                </FormControl>
                <FormDescription>
                  {showToEmployees
                    ? "Required while employees see it: claims close and vouchers expire then."
                    : "Leave empty for an open-ended offer."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection
          title="Benefit"
          description="The value you offer, frozen into every enquiry and claim of this version."
          disabled={isSubmitting}
        >
          <BenefitValueFields disabled={isSubmitting} />
        </FormSection>

        <FormSection
          title="Organizations"
          description="Which businesses (verified partners and employers) see it and may enquire. Your own organization never does."
          columns={1}
          disabled={isSubmitting}
        >
          <FormField
            control={form.control}
            name="audienceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Who can see it</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(["all_businesses", "selected_organizations"] as const).map((value) => (
                      <SelectItem key={value} value={value}>
                        {BUSINESS_AUDIENCE_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {audienceType === "selected_organizations" ? (
            <AudienceOrganizations
              picker={organizationPicker}
              fixedNote="Only businesses you choose see it."
            />
          ) : null}
          <FormField
            control={form.control}
            name="enquiryInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>Enquiry instructions</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Tell us your headcount and preferred locations."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Shown next to the enquiry form: what an organization should include.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection
          title="Employees"
          description="Optionally list it in the employee marketplace too, for the audience's employees to claim a voucher."
          columns={1}
          disabled={isSubmitting}
        >
          <FormField
            control={form.control}
            name="showToEmployees"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-3 rounded-md border p-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      disabled={isSubmitting || (!field.value && employeeSwitchBlocked !== null)}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel>Show to employees</FormLabel>
                    <FormDescription>
                      {employeeSwitchBlocked ??
                        (audienceType === "all_businesses"
                          ? "Every eligible employee sees it and can claim it; you confirm their vouchers."
                          : "The selected organizations' employees see it and can claim it; you confirm their vouchers.")}
                    </FormDescription>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>
        {showToEmployees ? (
          <EmployeeTermsFields disabled={isSubmitting} promoCodeLocked={promoCodeLocked} />
        ) : null}

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Note</FormLabel>
              <FormControl>
                <Textarea rows={2} disabled={isSubmitting} {...field} />
              </FormControl>
              <FormDescription>{reasonHint}</FormDescription>
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
