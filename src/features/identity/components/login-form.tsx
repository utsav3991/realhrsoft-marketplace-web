"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import { Label } from "@/design-system/primitives/label";
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
  const { errors, isSubmitting } = form.formState;

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
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {failure ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>Sign-in failed</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...form.register("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-destructive text-sm">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...form.register("password")}
        />
        {errors.password ? (
          <p id="password-error" className="text-destructive text-sm">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Sign in
      </Button>
    </form>
  );
}
