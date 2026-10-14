"use client";

import { ArrowLeft, Check, Pencil, Plus, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { RedemptionControl } from "@/features/redemptions/components/redemption-blocks";
import { ApiError } from "@/shared/api";
import {
  OfferAdminPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  useCan,
} from "@/shared/authorization";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";

import { usePartnerDecisions, usePartner, type Partner, type PartnerSource } from "../api/queries";
import {
  useRejectPartner,
  useResubmitPartner,
  useUpdatePartner,
  useVerifyPartner,
} from "../api/mutations";
import { profileBody, profileValues } from "../schemas/partner";
import {
  DecisionHistoryCard,
  PartnerProfileCard,
  RegistrationCard,
  StatusCallout,
} from "./partner-details";
import { ClientAdministration } from "./client-administration";
import { ProfileForm } from "./profile-form";
import { SourceField } from "./source-field";

type Decision = "verify" | "reject" | "resubmit";

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

/** One partner registration for Aayulogic review and assisted edits. */
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
  return <PartnerWorkspace partner={partner.data} />;
}

function PartnerWorkspace({ partner }: { partner: Partner }) {
  const canVerify = useCan(PartnerAdminPermission.PARTNER_VERIFY);
  const canReject = useCan(PartnerAdminPermission.PARTNER_REJECT);
  const canResubmit = useCan(PartnerAdminPermission.PARTNER_RESUBMIT);
  const canUpdate = useCan(PartnerAdminPermission.PARTNER_UPDATE);
  const canViewDecisions = useCan(PartnerAdminPermission.PARTNER_DECISION_VIEW);
  const canViewOrganization = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const canPostOffer = useCan(OfferAdminPermission.OFFER_CREATE);
  const [deciding, setDeciding] = useState<Decision | null>(null);
  const [editing, setEditing] = useState(false);

  const pending = partner.status === "pending";
  const rejected = partner.status === "rejected";

  return (
    <div className="space-y-6">
      <BackToPartners />
      <PageHeader
        title={partner.business_name}
        description={
          !partner.organization_id ? (
            "RealHRSoft client"
          ) : canViewOrganization ? (
            <Link
              href={`/admin/organizations/${partner.organization_id}`}
              className="hover:underline"
            >
              {partner.organization_name}
            </Link>
          ) : (
            partner.organization_name
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="partner" status={partner.status} />
            {pending && canReject ? (
              <Button variant="outline" onClick={() => setDeciding("reject")}>
                <X aria-hidden />
                Reject
              </Button>
            ) : null}
            {pending && canVerify ? (
              <Button onClick={() => setDeciding("verify")}>
                <Check aria-hidden />
                Verify
              </Button>
            ) : null}
            {partner.status === "verified" && canPostOffer ? (
              <Button asChild variant="outline">
                <Link href={`/admin/offers/new?partner=${partner.id}`}>
                  <Plus aria-hidden />
                  Post offer
                </Link>
              </Button>
            ) : null}
            {rejected && canResubmit ? (
              <Button variant="outline" onClick={() => setDeciding("resubmit")}>
                <RotateCcw aria-hidden />
                Resubmit for review
              </Button>
            ) : null}
          </div>
        }
      />
      <StatusCallout partner={partner} audience="reviewer" />
      {editing ? (
        <AssistedEdit partner={partner} onDone={() => setEditing(false)} />
      ) : (
        <PartnerProfileCard
          partner={partner}
          action={
            canUpdate ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden />
                Edit
              </Button>
            ) : null
          }
        />
      )}
      <RegistrationCard partner={partner} />
      {partner.external_uuid ? <ClientAdministration partner={partner} /> : null}
      <RedemptionControl scope="partner" targetId={partner.id} />
      {canViewDecisions ? <Decisions partnerId={partner.id} /> : null}
      <DecisionDialogs partner={partner} decision={deciding} onClose={() => setDeciding(null)} />
    </div>
  );
}

function Decisions({ partnerId }: { partnerId: string }) {
  const paging = usePageParam("decisions_");
  return <DecisionHistoryCard decisions={usePartnerDecisions(partnerId, paging)} paging={paging} />;
}

function AssistedEdit({ partner, onDone }: { partner: Partner; onDone: () => void }) {
  const update = useUpdatePartner(partner.id);
  const [source, setSource] = useState<PartnerSource>(partner.source);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit business profile</CardTitle>
        <CardDescription>
          Edits on the partner&apos;s behalf are audited with your reason. The status stays{" "}
          {partner.status}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          defaultValues={profileValues(partner)}
          reasonRequired
          submitLabel="Save changes"
          onCancel={onDone}
          onSubmit={async (values) => {
            await update.mutateAsync({
              ...profileBody(values),
              reason: values.reason,
              expected_version: partner.version,
              source,
            });
            toast.success("Partner profile updated");
            onDone();
          }}
        >
          <SourceField value={source} onChange={setSource} />
        </ProfileForm>
      </CardContent>
    </Card>
  );
}

const DIALOG: Record<
  Decision,
  { title: string; description: string; confirmLabel: string; done: string; destructive?: boolean }
> = {
  verify: {
    title: "Verify this partner?",
    description:
      "Confirms the business passed verification at the version you reviewed. It does not publish offers or grant commercial eligibility.",
    confirmLabel: "Verify partner",
    done: "Partner verified",
  },
  reject: {
    title: "Reject this registration?",
    description:
      "The reason is shown to the applicant as feedback. They can edit the profile and resubmit it.",
    confirmLabel: "Reject registration",
    done: "Registration rejected",
    destructive: true,
  },
  resubmit: {
    title: "Resubmit on the partner's behalf?",
    description:
      "Returns the registration to pending for a new review. Earlier decisions stay in the history.",
    confirmLabel: "Resubmit",
    done: "Registration resubmitted",
  },
};

function DecisionDialogs({
  partner,
  decision,
  onClose,
}: {
  partner: Partner;
  decision: Decision | null;
  onClose: () => void;
}) {
  const mutations = {
    verify: useVerifyPartner(partner.id),
    reject: useRejectPartner(partner.id),
    resubmit: useResubmitPartner(partner.id),
  };
  const copy = decision ? DIALOG[decision] : DIALOG.verify;
  return (
    <ReasonDialog
      open={decision !== null}
      onOpenChange={(open) => !open && onClose()}
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirmLabel}
      destructive={copy.destructive}
      onConfirm={async (reason) => {
        if (!decision) return;
        await mutations[decision].mutateAsync({ reason, expected_version: partner.version });
        toast.success(copy.done);
      }}
    />
  );
}
