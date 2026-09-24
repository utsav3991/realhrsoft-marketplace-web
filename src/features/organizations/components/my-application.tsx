"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Info, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError, errorMessage, type Schemas } from "@/shared/api";
import { Detail, DetailList } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { formatDateTime } from "@/shared/lib/format";

import {
  useCorrectApplication,
  useResubmitApplication,
  useSubmitApplication,
} from "../api/mutations";
import { useMyApplication } from "../api/queries";
import {
  BUSINESS_FIELDS,
  businessBody,
  businessSchema,
  businessValues,
  EMPTY_BUSINESS,
  type BusinessValues,
} from "../schemas/business";
import { BusinessSummary } from "./application-summary";
import { BusinessFields } from "./business-fields";

type Application = Schemas["PartnerApplicationResponse"];

/** The signed-in account's Partner application: submit one, or follow and correct it. */
export function MyApplication() {
  const application = useMyApplication();

  if (application.isPending) return <Skeleton className="h-64 w-full" />;
  if (application.isError) {
    if (application.error instanceof ApiError && application.error.isNotFound) {
      return <ApplicationForm mode={{ kind: "submit" }} />;
    }
    return <ErrorState error={application.error} onRetry={() => void application.refetch()} />;
  }
  return <ApplicationStatus application={application.data} />;
}

const STATUS_MESSAGE: Record<string, string> = {
  submitted: "Aayulogic is reviewing your application.",
  changes_requested: "Aayulogic asked for changes. Correct the details below and resubmit.",
  verified:
    "Your business is a verified Partner. An administrator grants your account access to the Partner portal.",
  rejected: "Your application was not accepted.",
};

function ApplicationStatus({ application }: { application: Application }) {
  const resubmit = useResubmitApplication(application.id);
  const [editing, setEditing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const correcting = application.status === "changes_requested";

  async function onResubmit() {
    setFailure(null);
    try {
      await resubmit.mutateAsync({ version: application.version });
      toast.success("Application resubmitted");
    } catch (error) {
      setFailure(errorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              Your application <StatusBadge domain="application" status={application.status} />
            </CardTitle>
            <CardDescription>{STATUS_MESSAGE[application.status]}</CardDescription>
          </div>
          {correcting ? (
            <div className="flex gap-2">
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Correct details
                </Button>
              ) : null}
              <Button size="sm" onClick={() => void onResubmit()} disabled={resubmit.isPending}>
                {resubmit.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Send aria-hidden />
                )}
                Resubmit
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {failure ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}
          <DetailList>
            <Detail label="Submitted">{formatDateTime(application.submitted_at)}</Detail>
            <Detail label="Last updated">{formatDateTime(application.updated_at)}</Detail>
            {application.review_note ? (
              <Detail label="Note from Aayulogic" className="sm:col-span-2 lg:col-span-3">
                {application.review_note}
              </Detail>
            ) : null}
          </DetailList>
          {application.status === "verified" ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/partner">Open the Partner portal</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {correcting && editing ? (
        <ApplicationForm mode={{ kind: "correct", application }} onDone={() => setEditing(false)} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
          </CardHeader>
          <CardContent>
            <BusinessSummary details={application.details} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type Mode = { kind: "submit" } | { kind: "correct"; application: Application };

function ApplicationForm({ mode, onDone }: { mode: Mode; onDone?: () => void }) {
  const submit = useSubmitApplication();
  const correct = useCorrectApplication(mode.kind === "correct" ? mode.application.id : "");
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<BusinessValues>({
    resolver: zodResolver(businessSchema),
    defaultValues:
      mode.kind === "correct" ? businessValues(mode.application.details) : EMPTY_BUSINESS,
  });
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      if (mode.kind === "submit") {
        await submit.mutateAsync(businessBody(values));
        toast.success("Application submitted");
      } else {
        await correct.mutateAsync({ ...businessBody(values), version: mode.application.version });
        toast.success("Details corrected. Resubmit when you are ready.");
        onDone?.();
      }
    } catch (error) {
      if (!applyApiFieldErrors(error, form, BUSINESS_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode.kind === "submit" ? "Apply to become a Partner" : "Correct your application"}
          </CardTitle>
          <CardDescription>
            {mode.kind === "submit"
              ? "Aayulogic verifies every Partner before its offers can appear in the marketplace. Each account can submit one application."
              : "Update the details Aayulogic asked about, save, then resubmit."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {failure ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertTitle>Not saved</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}
          {mode.kind === "submit" ? (
            <Alert>
              <Info aria-hidden />
              <AlertDescription>
                Applying does not give you access to the Partner portal. That follows verification.
              </AlertDescription>
            </Alert>
          ) : null}
          <BusinessFields form={form} disabled={isSubmitting} />
          <div className="flex justify-end gap-2">
            {onDone ? (
              <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {mode.kind === "submit" ? "Submit application" : "Save corrections"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
