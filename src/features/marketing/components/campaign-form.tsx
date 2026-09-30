"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { DateTimePicker } from "@/design-system/components/date-picker";
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
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import {
  CAMPAIGN_FIELDS,
  campaignSchema,
  EMPTY_FLIGHT,
  MAX_FLIGHTS,
  OBJECTIVES,
  type CampaignValues,
} from "../schemas/campaign";

interface CampaignFormProps {
  defaultValues: CampaignValues;
  submitLabel: string;
  reasonHint: string;
  /** Resolves on success or throws an ApiError, shown in the form. */
  onSubmit: (values: CampaignValues) => Promise<unknown>;
  onCancel?: () => void;
}

/**
 * A campaign's definition and its flights. The API replaces every field on save, flights
 * included; it never changes the campaign's status.
 */
export function CampaignForm({
  defaultValues,
  submitLabel,
  reasonHint,
  onSubmit,
  onCancel,
}: CampaignFormProps) {
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<CampaignValues>({ resolver: zodResolver(campaignSchema), defaultValues });
  const flights = useFieldArray({ control: form.control, name: "flights" });
  const { isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, CAMPAIGN_FIELDS)) setFailure(errorMessage(error));
    }
  });

  const controlled = (field: { value: string; onChange: (v: string) => void; onBlur: () => void }) => ({
    value: field.value,
    onChange: field.onChange,
    onBlur: field.onBlur,
    disabled: isSubmitting,
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="space-y-8">
        {failure ? <FormAlert>{failure}</FormAlert> : null}

        <FormSection
          title="Campaign"
          description="Groups advertisements; never shown to employees."
          disabled={isSubmitting}
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="objective"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Objective</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OBJECTIVES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Descriptive only; it does not change serving.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel optional>Description</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startsAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>Starts</FormLabel>
                <FormControl>
                  <DateTimePicker clearable {...controlled(field)} />
                </FormControl>
                <FormDescription>Your local time. Empty starts at once.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endsAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>Ends</FormLabel>
                <FormControl>
                  <DateTimePicker clearable defaultTime="23:59" {...controlled(field)} />
                </FormControl>
                <FormDescription>
                  Empty runs until paused or archived. An ended window hides its advertisements.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection
          title="Flights"
          description="Optional windows inside the campaign when placements run. Without flights, placements run across the whole campaign window."
          columns={1}
          disabled={isSubmitting}
        >
          {flights.fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">No flights: runs across the campaign.</p>
          ) : (
            <ol className="space-y-4">
              {flights.fields.map((flight, index) => (
                <li key={flight.id} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name={`flights.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Flight {index + 1} label</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`flights.${index}.startsAt`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starts</FormLabel>
                        <FormControl>
                          <DateTimePicker {...controlled(field)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`flights.${index}.endsAt`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel optional>Ends</FormLabel>
                          <FormControl>
                            <DateTimePicker clearable defaultTime="23:59" {...controlled(field)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6"
                      aria-label={`Remove flight ${index + 1}`}
                      onClick={() => flights.remove(index)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={flights.fields.length >= MAX_FLIGHTS}
              onClick={() => flights.append(EMPTY_FLIGHT)}
            >
              <Plus aria-hidden />
              Add flight
            </Button>
          </div>
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {submitLabel}
          </Button>
        </FormActions>
      </form>
    </Form>
  );
}
