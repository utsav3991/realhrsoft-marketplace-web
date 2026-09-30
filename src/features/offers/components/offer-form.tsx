"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RefreshCw, X } from "lucide-react";
import { useState, type ReactNode } from "react";
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
import { errorMessage, type Schemas } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import {
  ACCEPTANCE_LABEL,
  APPROVAL_TTL_HOURS,
  generatePromoCode,
  AUDIENCE_LABEL,
  INSTRUCTION_METHODS,
  METHOD_FIELDS,
  OFFER_FIELDS,
  offerSchema,
  PRESENTATION_METHODS,
  type AudienceOrganization,
  type EmployeeTermsValues,
  type OfferValues,
} from "../schemas/offer";
import { BenefitValueFields } from "./benefit-value-fields";

export type OfferIntent = Schemas["AdminOfferCreate"]["intent"];

interface ControlledField {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

/** Props for the rich text and date-time controls, which take a value rather than a ref. */
export function controlledProps(field: ControlledField, disabled: boolean) {
  return { value: field.value, onChange: field.onChange, onBlur: field.onBlur, disabled };
}

interface AudienceShape {
  audienceOrganizations: AudienceOrganization[];
}

export interface IntentButton {
  intent: OfferIntent;
  label: string;
  /** The one cobalt button of the form; the others are outline. */
  primary?: boolean;
}

export interface CategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface OfferFormProps {
  defaultValues: OfferValues;
  categories: readonly CategoryOption[];
  /** Submit buttons, one per intent the actor may use here. */
  intents: readonly IntentButton[];
  /**
   * Adds audience organizations. Absent in the partner portal, which cannot browse
   * organizations: there an existing selection can only be kept or narrowed.
   */
  organizationPicker?: (props: {
    selected: readonly AudienceOrganization[];
    onAdd: (organization: AudienceOrganization) => void;
  }) => ReactNode;
  reasonHint: string;
  /**
   * The offer has been published: employees may hold its promo code, so it can no longer be
   * edited or regenerated.
   */
  promoCodeLocked?: boolean;
  /** Resolves on success or throws an ApiError, shown in the form. */
  onSubmit: (values: OfferValues, intent: OfferIntent) => Promise<unknown>;
  onCancel?: () => void;
  /** Extra fields rendered first (e.g. the partner for administrators). */
  children?: ReactNode;
}

/**
 * One version's terms: content, benefit value, how it is applied, how claims are accepted and
 * the audience. The API replaces every field on save and stores the presentation fields the
 * chosen method does not use as empty.
 */
export function OfferForm({
  defaultValues,
  categories,
  intents,
  organizationPicker,
  reasonHint,
  promoCodeLocked = false,
  onSubmit,
  onCancel,
  children,
}: OfferFormProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<OfferIntent | null>(null);
  // A new offer, or one switching to the promo code method, starts with a generated code.
  const [initialValues] = useState(() => ({
    ...defaultValues,
    promoCode: defaultValues.promoCode || generatePromoCode(),
  }));
  const form = useForm<OfferValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: initialValues,
  });
  const { isSubmitting } = form.formState;
  const audienceType = form.watch("audienceType");
  const canSelectOrganizations =
    Boolean(organizationPicker) || defaultValues.audienceOrganizations.length > 0;

  function submitWith(intent: OfferIntent) {
    return form.handleSubmit(async (values) => {
      setFailure(null);
      setPendingIntent(intent);
      try {
        await onSubmit(values, intent);
      } catch (error) {
        if (!applyApiFieldErrors(error, form, OFFER_FIELDS)) setFailure(errorMessage(error));
      } finally {
        setPendingIntent(null);
      }
    });
  }

  const controlled = (field: ControlledField) => controlledProps(field, isSubmitting);

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
          description="What employees see in the catalogue."
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
                  <Input placeholder="20% off main courses" {...field} />
                </FormControl>
                <FormDescription>The line employees see first on the offer card.</FormDescription>
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
                <FormLabel>Valid until</FormLabel>
                <FormControl>
                  <DateTimePicker defaultTime="23:59" {...controlled(field)} />
                </FormControl>
                <FormDescription>Claims close and issued vouchers expire then.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection
          title="Benefit"
          description="The value employees receive, frozen into every claim of this version."
          disabled={isSubmitting}
        >
          <BenefitValueFields disabled={isSubmitting} />
        </FormSection>

        <EmployeeTermsFields disabled={isSubmitting} promoCodeLocked={promoCodeLocked} />

        <FormSection title="Audience" columns={1} disabled={isSubmitting}>
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
                    <SelectItem value="all_eligible_users">
                      {AUDIENCE_LABEL.all_eligible_users}
                    </SelectItem>
                    {canSelectOrganizations ? (
                      <SelectItem value="selected_organizations">
                        {AUDIENCE_LABEL.selected_organizations}
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {audienceType === "selected_organizations" ? (
            <AudienceOrganizations
              picker={organizationPicker}
              fixedNote="Aayulogic chose these organizations. You can remove them or switch to all eligible users; ask Aayulogic to add others."
            />
          ) : null}
        </FormSection>

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

/** The chosen audience organizations as removable chips, plus the picker that adds more. */
export function AudienceOrganizations({
  picker,
  fixedNote,
}: {
  picker: OfferFormProps["organizationPicker"];
  /** Shown instead of a picker when the reader cannot browse organizations. */
  fixedNote: string;
}) {
  const { watch, setValue, formState } = useFormContext<AudienceShape>();
  const selected = watch("audienceOrganizations");
  const error = formState.errors.audienceOrganizations;
  const set = (next: AudienceOrganization[]) =>
    setValue("audienceOrganizations", next, { shouldDirty: true, shouldValidate: true });

  return (
    <div className="space-y-3">
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Selected organizations">
          {selected.map((organization) => (
            <li
              key={organization.id}
              className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm"
            >
              {organization.name}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={`Remove ${organization.name}`}
                onClick={() => set(selected.filter((o) => o.id !== organization.id))}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {picker ? (
        picker({
          selected,
          onAdd: (organization) => {
            if (!selected.some((o) => o.id === organization.id)) set([...selected, organization]);
          },
        })
      ) : (
        <p className="text-muted-foreground text-xs">{fixedNote}</p>
      )}
      {error?.message ? <p className="text-destructive text-sm">{error.message}</p> : null}
    </div>
  );
}

/**
 * How employees apply the benefit and how their claims are accepted, inside a form whose values
 * carry the employee terms (marketplace offers, and business offers shown to employees).
 */
export function EmployeeTermsFields({
  disabled,
  promoCodeLocked = false,
}: {
  disabled: boolean;
  /** Employees may hold the published promo code, so it can no longer change. */
  promoCodeLocked?: boolean;
}) {
  const { control, watch, setValue } = useFormContext<EmployeeTermsValues>();
  const method = watch("presentationMethod");
  const acceptanceMode = watch("acceptanceMode");
  const used = METHOD_FIELDS[method];

  return (
    <>
    <FormSection
      title="How it is applied"
      description="Codes, links and instructions reach employees only with an issued voucher. The voucher's own QR code proves use; this method is how you apply the benefit."
      disabled={disabled}
    >
      <FormField
        control={control}
        name="presentationMethod"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Method</FormLabel>
            <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
              <FormControl>
                <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {PRESENTATION_METHODS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {used.includes("customMethodName") ? (
        <FormField
          control={control}
          name="customMethodName"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Method name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      {used.includes("promoCode") ? (
        <FormField
          control={control}
          name="promoCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Promo code</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    className="font-mono uppercase"
                    autoComplete="off"
                    spellCheck={false}
                    readOnly={promoCodeLocked}
                    {...field}
                    onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  disabled={promoCodeLocked || disabled}
                  onClick={() =>
                    setValue("promoCode", generatePromoCode(), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <RefreshCw aria-hidden />
                  Regenerate
                </Button>
              </div>
              <FormDescription>
                {promoCodeLocked
                  ? "Shared code your cashier applies. It is fixed once the offer has been published."
                  : "Shared code your cashier applies; 3-64 upper case letters, digits, hyphens or underscores."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      {used.includes("redemptionUrl") ? (
        <FormField
          control={control}
          name="redemptionUrl"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Booking link</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://" {...field} />
              </FormControl>
              <FormDescription>Must start with https://.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      {used.includes("redemptionInstructions") ? (
        <FormField
          control={control}
          name="redemptionInstructions"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel optional={!INSTRUCTION_METHODS.includes(method)}>Instructions</FormLabel>
              <FormControl>
                <RichTextEditor {...controlledProps(field, disabled)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </FormSection>

    <FormSection
      title="Claims"
      description="Whether a claim is accepted at once or waits for the partner. Accepting a claim issues its voucher."
      disabled={disabled}
    >
      <FormField
        control={control}
        name="acceptanceMode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Acceptance</FormLabel>
            <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
              <FormControl>
                <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="auto_accept">{ACCEPTANCE_LABEL.auto_accept}</SelectItem>
                <SelectItem value="partner_approval_required">
                  {ACCEPTANCE_LABEL.partner_approval_required}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Each employee can request the offer once, whatever the decision.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      {acceptanceMode === "partner_approval_required" ? (
        <FormField
          control={control}
          name="approvalTtlHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Decision window (hours)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={APPROVAL_TTL_HOURS.min}
                  max={APPROVAL_TTL_HOURS.max}
                  step={1}
                  className="sm:w-40"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A request expires if not decided in time, and never later than the offer
                ends. {APPROVAL_TTL_HOURS.min}-{APPROVAL_TTL_HOURS.max} hours.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </FormSection>
    </>
  );
}
