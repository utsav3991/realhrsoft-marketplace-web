"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";

import { BENEFIT_TYPES, type BenefitValueValues } from "../schemas/benefit-value";

interface BenefitShape {
  benefit: BenefitValueValues;
}

/**
 * The benefit's value, inside a form whose values carry a `benefit` envelope (offers and
 * company benefits). Only the fields of the chosen type are shown and sent.
 */
export function BenefitValueFields({ disabled }: { disabled: boolean }) {
  const { control, watch } = useFormContext<BenefitShape>();
  const type = watch("benefit.type");
  const descriptive = type === "descriptive";

  return (
    <>
      <FormField
        control={control}
        name="benefit.type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Benefit type</FormLabel>
            <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
              <FormControl>
                <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {BENEFIT_TYPES.map((option) => (
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
      {type === "percentage" ? (
        <FormField
          control={control}
          name="benefit.percent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Percent off</FormLabel>
              <FormControl>
                <Input inputMode="decimal" placeholder="20" {...field} />
              </FormControl>
              <FormDescription>Above 0 and at most 100.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      {type === "percentage" ? (
        <FormField
          control={control}
          name="benefit.maxDiscountAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Maximum discount</FormLabel>
              <FormControl>
                <Input inputMode="decimal" placeholder="500" {...field} />
              </FormControl>
              <FormDescription>A cap on the discount, in the currency below.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      {type === "fixed_amount" ? (
        <FormField
          control={control}
          name="benefit.amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount off</FormLabel>
              <FormControl>
                <Input inputMode="decimal" placeholder="200" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      {type === "percentage" || type === "fixed_amount" ? (
        <FormField
          control={control}
          name="benefit.currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input
                  className="w-28 font-mono uppercase"
                  maxLength={3}
                  autoComplete="off"
                  spellCheck={false}
                  {...field}
                />
              </FormControl>
              <FormDescription>ISO code, e.g. NPR.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      {type === "free_item" ? (
        <FormField
          control={control}
          name="benefit.item"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Free item</FormLabel>
              <FormControl>
                <Input placeholder="A regular coffee" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      <FormField
        control={control}
        name="benefit.description"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel optional={!descriptive}>
              {descriptive ? "Benefit" : "Benefit wording"}
            </FormLabel>
            <FormControl>
              <Input placeholder={descriptive ? "Free annual health check-up" : undefined} {...field} />
            </FormControl>
            <FormDescription>
              {descriptive
                ? "What employees get, in words. It is never read as a price."
                : "Optional wording shown with the value, e.g. exclusions."}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
