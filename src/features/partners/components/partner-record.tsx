"use client";

import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError } from "@/shared/api";
import { OrganizationAdminPermission, useCan } from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Detail, DetailList } from "@/shared/components/details";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import {
  usePartnerReview,
  usePartnerStanding,
  type ReviewDecision,
  type StandingAction,
} from "../api/mutations";
import { usePartner, usePartnerVerification, type PartnerProfile } from "../api/queries";
import { ContactsCard } from "./contacts-card";
import { LocationsCard } from "./locations-card";
import { PartnerBusinessCard, PartnerStandingBadges } from "./partner-details";
import { VerificationCard } from "./verification-details";

function BackToPartners() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/partners">
        <ArrowLeft aria-hidden />
        Partners
      </Link>
    </Button>
  );
}

/** Administrative Partner record: standing, verification review and business details. */
export function PartnerRecord({ partnerId }: { partnerId: string }) {
  const partner = usePartner(partnerId);

  if (partner.isPending) {
    return (
      <div className="space-y-6">
        <BackToPartners />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (partner.isError) {
    return (
      <div className="space-y-6">
        <BackToPartners />
        {partner.error instanceof ApiError && partner.error.isNotFound ? (
          <EmptyState title="Partner not found" />
        ) : (
          <ErrorState error={partner.error} onRetry={() => void partner.refetch()} />
        )}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <BackToPartners />
      <PageHeader
        title={partner.data.display_name}
        description={partner.data.legal_business_name}
      />
      <StandingCard profile={partner.data} />
      <VerificationReview profile={partner.data} />
      <PartnerBusinessCard profile={partner.data} />
      <ContactsCard contacts={partner.data.contacts} />
      <LocationsCard locations={partner.data.locations} />
    </div>
  );
}

const STANDING_COPY: Record<
  StandingAction,
  { title: string; description: string; confirm: string; destructive: boolean }
> = {
  suspend: {
    title: "Suspend this Partner?",
    description:
      "Its Offers go offline and it is no longer eligible for the marketplace until reinstated.",
    confirm: "Suspend",
    destructive: true,
  },
  reinstate: {
    title: "Reinstate this Partner?",
    description: "A verified Partner becomes eligible again; approved, entitled Offers go live.",
    confirm: "Reinstate",
    destructive: false,
  },
  close: {
    title: "Close this Partner permanently?",
    description: "Closing cannot be undone. Its Offers go offline for good.",
    confirm: "Close Partner",
    destructive: true,
  },
};

function StandingCard({ profile }: { profile: PartnerProfile }) {
  const canViewOrganization = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const allowed: Record<StandingAction, boolean> = {
    suspend: useCan(OrganizationAdminPermission.PARTNER_SUSPEND),
    reinstate: useCan(OrganizationAdminPermission.PARTNER_REINSTATE),
    close: useCan(OrganizationAdminPermission.PARTNER_CLOSE),
  };
  const standing = usePartnerStanding(profile.partner_id);
  const [pending, setPending] = useState<StandingAction | null>(null);
  const available: StandingAction[] =
    profile.operational_status === "closed"
      ? []
      : [profile.operational_status === "active" ? "suspend" : "reinstate", "close"];
  const copy = pending ? STANDING_COPY[pending] : undefined;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
        <CardTitle>Standing</CardTitle>
        <div className="flex flex-wrap gap-2">
          {available
            .filter((action) => allowed[action])
            .map((action) => (
              <Button
                key={action}
                variant={action === "reinstate" ? "outline" : "ghost"}
                size="sm"
                onClick={() => setPending(action)}
              >
                {STANDING_COPY[action].confirm}
              </Button>
            ))}
          {profile.organization_id && canViewOrganization ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/organizations/${profile.organization_id}`}>
                <Building2 aria-hidden />
                Open organization
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Status" className="sm:col-span-2 lg:col-span-3">
            <PartnerStandingBadges
              verificationStatus={profile.verification_status}
              operationalStatus={profile.operational_status}
              marketplaceEligible={profile.marketplace_eligible}
            />
          </Detail>
          <Detail label="Organization">
            {profile.organization_id ?? "Not attached (awaiting verification)"}
          </Detail>
          <Detail label="Created">{formatDateTime(profile.created_at)}</Detail>
          <Detail label="Version">{profile.version}</Detail>
        </DetailList>
      </CardContent>
      <ReasonDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={copy?.title ?? ""}
        description={copy?.description ?? ""}
        confirmLabel={copy?.confirm ?? "Confirm"}
        destructive={copy?.destructive}
        onConfirm={async (reason) => {
          if (!pending) return;
          await standing.mutateAsync({ action: pending, version: profile.version, reason });
          toast.success(`${copy?.confirm ?? "Updated"}: ${profile.display_name}`);
        }}
      />
    </Card>
  );
}

const VERIFY_FIELDS = [
  {
    name: "organization_id",
    label: "Existing organization ID (optional)",
    kind: "uuid",
    optional: true,
    hint: "Attach the Partner to an existing organization, for example one that is already an Employer. Leave empty to create a new organization named after the legal name.",
  },
] as const;

const DECISION_COPY: Record<ReviewDecision, { title: string; description: string; label: string }> =
  {
    "request-changes": {
      title: "Request changes?",
      description:
        "The applicant sees your reason, corrects the registration and submits it again.",
      label: "Request changes",
    },
    reject: {
      title: "Reject this Partner?",
      description: "Rejection is final for this registration.",
      label: "Reject",
    },
  };

/** Interim Governance review: start review, verify, reject or request changes. */
function VerificationReview({ profile }: { profile: PartnerProfile }) {
  const verification = usePartnerVerification(profile.partner_id);
  const canReview = useCan(OrganizationAdminPermission.PARTNER_VERIFICATION_REVIEW);
  const { startReview, verify, decide } = usePartnerReview(profile.partner_id);
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deciding, setDeciding] = useState<ReviewDecision | null>(null);
  const status = profile.verification_status;
  const decidable = status === "submitted" || status === "under_review";
  const version = profile.version;

  if (verification.isPending) return <Skeleton className="h-40 w-full" />;
  if (verification.isError) {
    return <ErrorState error={verification.error} onRetry={() => void verification.refetch()} />;
  }

  const actions =
    canReview && decidable ? (
      <>
        {status === "submitted" ? (
          <Button variant="outline" size="sm" onClick={() => setStarting(true)}>
            Start review
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => setDeciding("request-changes")}>
          Request changes
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDeciding("reject")}>
          Reject
        </Button>
        <Button size="sm" onClick={() => setVerifying(true)}>
          Verify
        </Button>
      </>
    ) : null;
  const copy = deciding ? DECISION_COPY[deciding] : undefined;

  return (
    <>
      <VerificationCard verification={verification.data} actions={actions} />
      <ConfirmDialog
        open={starting}
        onOpenChange={setStarting}
        title="Start the review?"
        description="The Partner is marked as under review by you."
        confirmLabel="Start review"
        onConfirm={async () => {
          await startReview.mutateAsync(version);
          toast.success("Review started");
        }}
      />
      <FieldsDialog
        open={verifying}
        onOpenChange={setVerifying}
        title="Verify this Partner?"
        description="Verification attaches the Partner to an organization and makes its applicant a member holding the Partner administrator role there."
        confirmLabel="Verify"
        fields={VERIFY_FIELDS}
        onConfirm={async ({ organization_id, reason }) => {
          await verify.mutateAsync({
            version,
            reason,
            organization_id: organization_id ?? null,
          });
          toast.success(`Verified ${profile.display_name}`);
        }}
      />
      <ReasonDialog
        open={deciding !== null}
        onOpenChange={(open) => !open && setDeciding(null)}
        title={copy?.title ?? ""}
        description={copy?.description ?? ""}
        confirmLabel={copy?.label ?? "Confirm"}
        destructive={deciding === "reject"}
        onConfirm={async (reason) => {
          if (!deciding) return;
          await decide.mutateAsync({ decision: deciding, version, reason });
          toast.success(copy?.label ?? "Decision recorded");
        }}
      />
    </>
  );
}
