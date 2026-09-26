"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

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
import { useSession } from "@/shared/auth";
import { defaultPortalPath } from "@/shared/navigation/portals";
import { safeNextPath } from "@/shared/navigation/safe-redirect";

import { loginSchema, type LoginValues } from "../schemas/login";

function loginFailureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "The email or password is incorrect.";
    if (error.status === 429) return "Too many sign-in attempts. Wait a minute and try again.";
  }
  return errorMessage(error);
}

export function LoginForm() {
  const { status, actor, login } = useSession();
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [failure, setFailure] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { isSubmitting } = form.formState;

  // Already signed in (or just signed in): continue to the requested page.
  useEffect(() => {
    if (status === "authenticated") router.replace(next ?? defaultPortalPath(actor));
  }, [status, actor, next, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await login(values);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field === "email" || field === "password") form.setError(field, { message });
        }
        return;
      }
      setFailure(loginFailureMessage(error));
    }
  });

  const busy = isSubmitting || status === "authenticated";

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {failure ? <FormAlert title="Sign-in failed">{failure}</FormAlert> : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Sign in
        </Button>
      </form>
    </Form>
  );
}
