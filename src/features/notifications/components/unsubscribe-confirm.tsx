"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { errorMessage } from "@/shared/api";

import { useUnsubscribe } from "../api/mutations";
import { useUnsubscribeLink } from "../api/queries";

function SignInLink() {
  return (
    <Button asChild variant="outline" className="w-full">
      <Link href="/login">Go to sign in</Link>
    </Button>
  );
}

/**
 * The landing page of an email's unsubscribe link. Opening it changes nothing (mail scanners
 * prefetch links); only the button turns notification emails off. No session is involved.
 */
export function UnsubscribeConfirm({ token }: { token: string }) {
  const link = useUnsubscribeLink(token);
  const unsubscribe = useUnsubscribe();

  if (link.isPending) return <Skeleton className="h-32 w-full" />;
  if (unsubscribe.isSuccess) {
    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 aria-hidden />
          <AlertTitle>You are unsubscribed</AlertTitle>
          <AlertDescription>
            You will no longer get notification emails. Your notifications still appear in the app,
            and you can turn emails back on from its Notifications page.
          </AlertDescription>
        </Alert>
        <SignInLink />
      </div>
    );
  }
  if (link.isError || !link.data.valid) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>This link cannot be used</AlertTitle>
          <AlertDescription>
            It is invalid, or email was turned back on after it was sent. Sign in and use the
            Notifications page to change your email setting.
          </AlertDescription>
        </Alert>
        <SignInLink />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Stop notification emails such as new company benefits? Notifications will still appear in
        the app. Sign-in and password emails are not affected.
      </p>
      {unsubscribe.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {errorMessage(unsubscribe.error)}
        </p>
      ) : null}
      <Button
        className="w-full"
        disabled={unsubscribe.isPending}
        onClick={() => unsubscribe.mutate(token)}
      >
        {unsubscribe.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Unsubscribe
      </Button>
    </div>
  );
}
