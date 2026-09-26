"use client";

import { AlertCircle } from "lucide-react";
import { Slot } from "radix-ui";
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Label } from "@/design-system/primitives/label";
import { cn } from "@/shared/lib/cn";

/*
 * shadcn's react-hook-form bindings. `FormField` connects a field to the form, `FormItem` gives
 * it ids, and `FormControl` hands the control its id, `aria-invalid` and `aria-describedby`, so
 * a field needs no hand-written ids or error wiring:
 *
 *   <FormField control={form.control} name="title" render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>Title</FormLabel>
 *       <FormControl><Input {...field} /></FormControl>
 *       <FormDescription>What employees see.</FormDescription>
 *       <FormMessage />
 *     </FormItem>
 *   )} />
 */

export const Form = FormProvider;

/** The label's id, for controls a `<label for>` cannot name (contenteditable, composite pickers). */
export function fieldLabelId(id: string): string {
  return `${id}-label`;
}

const FormFieldContext = createContext<{ name: string } | null>(null);

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

const FormItemContext = createContext<{ id: string } | null>(null);

export function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  if (!fieldContext) throw new Error("useFormField must be used within <FormField>");
  if (!itemContext) throw new Error("useFormField must be used within <FormItem>");
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: id,
    formDescriptionId: `${id}-description`,
    formMessageId: `${id}-message`,
    ...fieldState,
  };
}

export function FormItem({ className, id, ...props }: ComponentProps<"div">) {
  const generated = useId();
  return (
    <FormItemContext.Provider value={{ id: id ?? generated }}>
      <div data-slot="form-item" className={cn("grid content-start gap-3", className)} {...props} />
    </FormItemContext.Provider>
  );
}

export function FormLabel({
  className,
  optional = false,
  children,
  ...props
}: ComponentProps<typeof Label> & {
  /** Adds a muted "(optional)" after the label. */
  optional?: boolean;
}) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      id={fieldLabelId(formItemId)}
      data-slot="form-label"
      data-error={Boolean(error)}
      htmlFor={formItemId}
      className={cn("data-[error=true]:text-destructive", className)}
      {...props}
    >
      {children}
      {optional ? <span className="text-muted-foreground font-medium"> (optional)</span> : null}
    </Label>
  );
}

/**
 * Passes the field's id and a11y attributes to its one child. Controls that render a
 * `<label for>`-less widget read the label through `fieldLabelId(id)`.
 */
export function FormControl(props: ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={error ? true : undefined}
      {...props}
    />
  );
}

/** The field's hint. */
export function FormDescription({ className, ...props }: ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();
  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm leading-6 font-medium", className)}
      {...props}
    />
  );
}

/** The field's validation error, or `children` when there is none. Renders nothing when empty. */
export function FormMessage({ className, children, ...props }: ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? "") : children;
  if (!body) return null;
  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive flex items-start gap-1.5 text-sm font-semibold", className)}
      {...props}
    >
      {error ? <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : null}
      <span>{body}</span>
    </p>
  );
}

/**
 * A titled group of fields in a `<fieldset>` (so `disabled` disables them all). Consecutive
 * sections are divided by a hairline.
 */
export function FormSection({
  title,
  description,
  columns = 2,
  className,
  children,
  ...props
}: Omit<ComponentProps<"fieldset">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <div
      data-slot="form-section"
      className={cn(
        "[[data-slot=form-section]+&]:border-t [[data-slot=form-section]+&]:pt-6",
        className,
      )}
    >
      <fieldset className="min-w-0" {...props}>
        <legend className="text-lg font-semibold tracking-[-0.02em]">{title}</legend>
        {description ? <p className="text-muted-foreground mt-1 text-sm font-medium">{description}</p> : null}
        <div className={cn("mt-4 grid gap-x-4 gap-y-5", columns === 2 && "sm:grid-cols-2")}>
          {children}
        </div>
      </fieldset>
    </div>
  );
}

/** The form's buttons: end-aligned, stacked with the primary on top on mobile. */
export function FormActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="form-actions"
      className={cn(
        "flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:flex-wrap sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

/** A failure the form could not place on a field. */
export function FormAlert({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden />
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
