"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import {
  Form,
  FormAlert,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import { Input } from "@/design-system/primitives/input";
import { ApiError, errorMessage } from "@/shared/api";

import { useRequestPasswordSetupLink } from "../api/mutations";
import { requestSetupLinkSchema, type RequestSetupLinkValues } from "../schemas/login";

/**
 * Asks for a new set-password link by email. The backend answers the same way whether or not
 * the account exists, so this always shows one acknowledgement; only rate limiting differs.
 */
export function RequestSetupLinkForm() {
  const request = useRequestPasswordSetupLink();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<RequestSetupLinkValues>({
    resolver: zodResolver(requestSetupLinkSchema),
    defaultValues: { email: "" },
  });
  const { isSubmitting } = form.formState;

  if (request.isSuccess) {
    return (
      <Alert>
        <MailCheck aria-hidden />
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>
          If an account with this email still needs a password, we have sent it a new link. It
          expires in 24 hours, and earlier links no longer work.
        </AlertDescription>
      </Alert>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await request.mutateAsync(values);
    } catch (error) {
      setFailure(
        error instanceof ApiError && error.status === 429
          ? "Too many requests. Try again later."
          : errorMessage(error),
      );
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {failure ? <FormAlert title="Link not sent">{failure}</FormAlert> : null}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Send me a new link
        </Button>
      </form>
    </Form>
  );
}
