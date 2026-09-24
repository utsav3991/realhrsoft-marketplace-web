"use client";

import { ArrowLeft, BadgeCheck, MessageSquareWarning, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError, type Schemas } from "@/shared/api";
import { IdentityPermission, OrganizationAdminPermission, useCan } from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import { useDecideApplication, type ApplicationDecision } from "../api/mutations";
import { usePartnerApplication } from "../api/queries";
import { BusinessSummary } from "./application-summary";

type Application = Schemas["PartnerApplicationResponse"];

const VERIFY_FIELDS = [
  {
    name: "organization_id",
    label: "Existing organization ID",
    kind: "uuid",
    optional: true,
    hint: "Attach the Partner profile to an organization that already exists (for example an Employer). Leave empty to create a new organization named after the legal name.",
  },
] as const;

function BackToQueue() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/partner-applications">
        <ArrowLeft aria-hidden />
        Partner applications
      </Link>
    </Button>
  );
}

export function ApplicationReview({ applicationId }: { applicationId: string }) {
  const application = usePartnerApplication(applicationId);

  if (application.isPending) {
    return (
      <div className="space-y-6">
        <BackToQueue />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (application.isError) {
    return (
      <div className="space-y-6">
        <BackToQueue />
        {application.error instanceof ApiError && application.error.isNotFound ? (
          <EmptyState title="Application not found" />
        ) : (
          <ErrorState error={application.error} onRetry={() => void application.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedApplication application={application.data} />;
}

const DECISION_COPY: Record<
  ApplicationDecision,
  { title: string; description: string; confirm: string }
> = {
  "request-changes": {
    title: "Request changes?",
    description:
      "The applicant sees your reason, corrects the application and resubmits it. Write the reason for them.",
    confirm: "Request changes",
  },
  reject: {
    title: "Reject this application?",
    description:
      "Rejection is final: there is no reapplication path yet. The applicant sees your reason.",
    confirm: "Reject application",
  },
};

function LoadedApplication({ application }: { application: Application }) {
  const { verify, decide } = useDecideApplication(application.id);
  const canReview = useCan(OrganizationAdminPermission.APPLICATION_REVIEW);
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const [verifying, setVerifying] = useState(false);
  const [decision, setDecision] = useState<ApplicationDecision | null>(null);
  const reviewable = canReview && application.status === "submitted";
  const copy = decision ? DECISION_COPY[decision] : undefined;

  return (
    <div className="space-y-6">
      <BackToQueue />
      <PageHeader
        title={application.details.display_name}
        description={application.details.legal_name}
        actions={
          reviewable ? (
            <>
              <Button variant="outline" onClick={() => setDecision("request-changes")}>
                <MessageSquareWarning aria-hidden />
                Request changes
              </Button>
              <Button variant="outline" onClick={() => setDecision("reject")}>
                <XCircle aria-hidden />
                Reject
              </Button>
              <Button onClick={() => setVerifying(true)}>
                <BadgeCheck aria-hidden />
                Verify
              </Button>
            </>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Review</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Status">
              <StatusBadge domain="application" status={application.status} />
            </Detail>
            <Detail label="Intake">
              {application.intake === "assisted" ? "Aayulogic-assisted" : "Self-service"}
            </Detail>
            <Detail label="Submitted">{formatDateTime(application.submitted_at)}</Detail>
            <Detail label="Applicant" className="sm:col-span-2">
              {canViewUsers ? (
                <Link
                  href={`/admin/users/${application.applicant_user_id}`}
                  className="font-mono text-xs hover:underline"
                >
                  {application.applicant_user_id}
                </Link>
              ) : (
                <span className="font-mono text-xs">{application.applicant_user_id}</span>
              )}
            </Detail>
            <Detail label="Version">{application.version}</Detail>
            {application.review_note ? (
              <Detail label="Last review note" className="sm:col-span-2 lg:col-span-3">
                {application.review_note}
                {application.reviewed_at ? (
                  <span className="text-muted-foreground ml-2 text-xs">
                    {formatDateTime(application.reviewed_at)}
                  </span>
                ) : null}
              </Detail>
            ) : null}
            {application.organization_id ? (
              <Detail label="Organization" className="sm:col-span-2 lg:col-span-3">
                {canViewOrganizations ? (
                  <Link
                    href={`/admin/organizations/${application.organization_id}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {application.organization_id}
                  </Link>
                ) : (
                  <span className="font-mono text-xs">{application.organization_id}</span>
                )}
              </Detail>
            ) : null}
          </DetailList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessSummary details={application.details} />
        </CardContent>
      </Card>

      <FieldsDialog
        open={verifying}
        onOpenChange={setVerifying}
        title="Verify this Partner?"
        description="This creates the Partner profile and records the applicant as a member. It grants no permissions: afterwards, grant the applicant the Partner administrator role in the organization."
        confirmLabel="Verify partner"
        fields={VERIFY_FIELDS}
        onConfirm={async ({ organization_id, reason }) => {
          const result = await verify.mutateAsync({
            version: application.version,
            organization_id: organization_id ?? null,
            reason,
          });
          toast.success(`Verified ${application.details.display_name}`, {
            description: `Organization ${result.organization_id}`,
          });
        }}
      />
      <ReasonDialog
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
        title={copy?.title ?? ""}
        description={copy?.description ?? ""}
        confirmLabel={copy?.confirm ?? "Confirm"}
        destructive={decision === "reject"}
        onConfirm={async (reason) => {
          if (!decision) return;
          await decide.mutateAsync({ decision, version: application.version, reason });
          toast.success(copy?.confirm ?? "Done");
        }}
      />
    </div>
  );
}
