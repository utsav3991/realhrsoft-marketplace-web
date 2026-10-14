"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
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
import { Skeleton } from "@/design-system/primitives/skeleton";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { useSetPassword } from "../api/mutations";
import { usePasswordSetupLink } from "../api/queries";
import { RequestSetupLinkForm } from "./request-setup-link-form";
import { setPasswordSchema, type SetPasswordValues } from "../schemas/login";

const FIELDS = [
  { name: "password", label: "New password", autoComplete: "new-password" },
  { name: "confirm_password", label: "Repeat password", autoComplete: "new-password" },
] as const;

function SignInLink() {
  return (
    <Button asChild className="w-full">
      <Link href="/login">Go to sign in</Link>
    </Button>
  );
}

/** Sets the password for an invited account from its emailed link. No session is involved. */
export function SetPasswordForm({ uidb64, token }: { uidb64: string; token: string }) {
  const link = usePasswordSetupLink(uidb64, token);
  const setPassword = useSetPassword(uidb64, token);
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirm_password: "" },
  });
  const { isSubmitting } = form.formState;

  if (link.isPending) return <Skeleton className="h-40 w-full" />;
  if (link.isError || !link.data.valid) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>This link cannot be used</AlertTitle>
          <AlertDescription>
            {link.isError
              ? errorMessage(link.error)
              : (link.data.message ?? "This link is invalid or has expired.")}{" "}
            Enter your email to get a new one.
          </AlertDescription>
        </Alert>
        <RequestSetupLinkForm />
      </div>
    );
  }
  if (setPassword.isSuccess) {
    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 aria-hidden />
          <AlertTitle>Password set</AlertTitle>
          <AlertDescription>You can now sign in with your email and new password.</AlertDescription>
        </Alert>
        <SignInLink />
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await setPassword.mutateAsync(values);
    } catch (error) {
      const mapping = { password: "password", confirm_password: "confirm_password" } as const;
      if (!applyApiFieldErrors(error, form, mapping)) setFailure(errorMessage(error));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {failure ? <FormAlert title="Password not set">{failure}</FormAlert> : null}

        {FIELDS.map((spec) => (
          <FormField
            key={spec.name}
            control={form.control}
            name={spec.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{spec.label}</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete={spec.autoComplete} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Set password
        </Button>
      </form>
    </Form>
  );
}
