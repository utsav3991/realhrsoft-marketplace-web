"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";

import { Button } from "@/design-system/primitives/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/primitives/dialog";
import {
  Form,
  FormAlert,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import { Input } from "@/design-system/primitives/input";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import {
  closeEnquirySchema,
  ENQUIRY_FIELDS,
  enquirySchema,
  type CloseEnquiryValues,
  type EnquiryValues,
} from "../schemas/business-offer";

/**
 * A dialog around one form. `onSubmit` resolves on success (the dialog closes) or throws: an
 * ApiError's field errors land on the fields, anything else above them. Returning false skips
 * the close and reset: the caller handled the outcome and keeps what was typed for a retry.
 */
function FormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  form,
  fields,
  title,
  description,
  confirmLabel,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<T>;
  /** Request body field → form field, for placing 422 errors. */
  fields: Partial<Record<string, Path<T>>>;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onSubmit: (values: T) => Promise<boolean | void>;
  children: ReactNode;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const { isSubmitting } = form.formState;

  function handleOpenChange(next: boolean) {
    if (isSubmitting) return;
    if (!next) {
      form.reset();
      setFailure(null);
    }
    onOpenChange(next);
  }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      if ((await onSubmit(values)) !== false) handleOpenChange(false);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, fields)) setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={submit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {failure ? <FormAlert>{failure}</FormAlert> : null}
            {children}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
                {confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Enquires on the acting business's behalf. The provider follows up outside the platform
 * with the contact given here.
 */
export function EnquireDialog({
  open,
  onOpenChange,
  offerTitle,
  providerName,
  instructions,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerTitle: string;
  providerName: string;
  instructions: string;
  onSubmit: (values: EnquiryValues) => Promise<boolean | void>;
}) {
  const form = useForm<EnquiryValues>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      message: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      fields={ENQUIRY_FIELDS}
      title={`Enquire about ${offerTitle}`}
      description={`${providerName} receives your message and contact details and follows up directly. You can have one open enquiry per offer.`}
      confirmLabel="Send enquiry"
      onSubmit={onSubmit}
    >
      <FormField
        control={form.control}
        name="message"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Message</FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} />
            </FormControl>
            <FormDescription className="whitespace-pre-line">
              {instructions || "What you need, e.g. quantities, locations and timing."}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="contactName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contact name</FormLabel>
            <FormControl>
              <Input autoComplete="name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Contact phone</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" placeholder="+9779801234567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormDialog>
  );
}

/** Closes a lead once followed up. The note is shown to the business that enquired. */
export function CloseEnquiryDialog({
  open,
  onOpenChange,
  businessName,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  onSubmit: (values: CloseEnquiryValues) => Promise<unknown>;
}) {
  const form = useForm<CloseEnquiryValues>({
    resolver: zodResolver(closeEnquirySchema),
    defaultValues: { closingNote: "" },
  });
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      fields={{ closing_note: "closingNote" }}
      title="Close this enquiry?"
      description={`Closing is final. ${businessName} is notified and may enquire again later.`}
      confirmLabel="Close enquiry"
      onSubmit={async (values) => {
        await onSubmit(values);
      }}
    >
      <FormField
        control={form.control}
        name="closingNote"
        render={({ field }) => (
          <FormItem>
            <FormLabel optional>Note to {businessName}</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="Quote sent on 3 October." {...field} />
            </FormControl>
            <FormDescription>The outcome, shown to the business that enquired.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  );
}
