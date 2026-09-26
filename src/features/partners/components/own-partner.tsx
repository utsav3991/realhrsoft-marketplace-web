"use client";

import { ArrowRight, Handshake, Lock, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError } from "@/shared/api";
import { useSelectedOrganizationId, useSession } from "@/shared/auth";
import { PartnerPermission, useCanInOrganization } from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";

import {
  useRegisterOwnPartner,
  useResubmitOwnPartner,
  useUpdateOwnPartner,
} from "../api/mutations";
import { useOwnPartner, useOwnPartnerDecisions, type Partner } from "../api/queries";
import { EMPTY_PROFILE, profileBody, profileValues } from "../schemas/partner";
import {
  DecisionHistoryCard,
  PartnerProfileCard,
  RegistrationCard,
  StatusCallout,
} from "./partner-details";
import { ProfileForm } from "./profile-form";

/** Whether the selected organization already has a partner registration (any status). */
function useIsRegistered(): boolean {
  const { actor } = useSession();
  const organizationId = useSelectedOrganizationId();
  return Boolean(actor?.memberships.find((m) => m.organizationId === organizationId)?.partner);
}

function NotRegistered() {
  const canCreate = useCanInOrganization(PartnerPermission.PROFILE_CREATE);
  return canCreate ? (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="text-primary size-4" aria-hidden />
          Become a marketplace partner
        </CardTitle>
        <CardDescription>
          Register your business so employees can discover your offers. Aayulogic verifies every
          partner before its content can be published.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild>
          <Link href="/partner/register">
            Register your business <ArrowRight aria-hidden />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  ) : (
    <EmptyState
      icon={Lock}
      title="Your organization is not a partner yet"
      description="Registering it needs the Register as a partner permission in this organization. Ask the person who manages your organization's roles."
    />
  );
}

/** Portal landing: registration status and the next step for the selected organization. */
export function PartnerDashboard() {
  const registered = useIsRegistered();
  const canView = useCanInOrganization(PartnerPermission.PROFILE_VIEW);
  if (!registered) return <NotRegistered />;
  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You cannot view this partner's profile"
        description="Ask for the View own partner profile permission in this organization."
      />
    );
  }
  return <RegistrationSummary />;
}

function RegistrationSummary() {
  const organizationId = useSelectedOrganizationId();
  const partner = useOwnPartner(organizationId);
  if (partner.isPending) return <Skeleton className="h-40 w-full" />;
  if (partner.isError) {
    return <ErrorState error={partner.error} onRetry={() => void partner.refetch()} />;
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>{partner.data.business_name}</CardTitle>
            <CardDescription>{partner.data.organization_name}</CardDescription>
          </div>
          <StatusBadge domain="partner" status={partner.data.status} />
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/partner/profile">
              Open business profile <ArrowRight aria-hidden />
            </Link>
          </Button>
        </CardFooter>
      </Card>
      <StatusCallout partner={partner.data} audience="applicant" />
    </div>
  );
}

/** Self-service registration for the selected organization. */
export function OwnPartnerRegistration() {
  const router = useRouter();
  const organizationId = useSelectedOrganizationId();
  const registered = useIsRegistered();
  const register = useRegisterOwnPartner(organizationId);

  if (registered && !register.isSuccess) {
    return (
      <EmptyState
        icon={Handshake}
        title="This organization is already registered"
        description="Each organization registers once. Edit or resubmit it from the business profile."
        action={
          <Button asChild variant="outline">
            <Link href="/partner/profile">Open business profile</Link>
          </Button>
        }
      />
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business details</CardTitle>
        <CardDescription>
          Submitted for Aayulogic review as soon as you register. You can still correct the details
          while the review is pending.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          defaultValues={EMPTY_PROFILE}
          submitLabel="Register and submit for review"
          onSubmit={async (values) => {
            await register.mutateAsync(profileBody(values));
            toast.success("Registration submitted for review");
            router.push("/partner/profile");
          }}
        />
      </CardContent>
    </Card>
  );
}

/** The selected organization's partner profile: status, feedback, edits and history. */
export function OwnPartnerProfile() {
  const organizationId = useSelectedOrganizationId();
  const partner = useOwnPartner(organizationId);

  if (partner.isPending) return <Skeleton className="h-64 w-full" />;
  if (partner.isError) {
    return partner.error instanceof ApiError && partner.error.isNotFound ? (
      <NotRegistered />
    ) : (
      <ErrorState error={partner.error} onRetry={() => void partner.refetch()} />
    );
  }
  return <ProfileWorkspace partner={partner.data} organizationId={organizationId} />;
}

function ProfileWorkspace({
  partner,
  organizationId,
}: {
  partner: Partner;
  organizationId: string;
}) {
  const canUpdate = useCanInOrganization(PartnerPermission.PROFILE_UPDATE);
  const canResubmit = useCanInOrganization(PartnerPermission.PROFILE_RESUBMIT);
  const canViewDecisions = useCanInOrganization(PartnerPermission.PROFILE_DECISION_VIEW);
  const [editing, setEditing] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const update = useUpdateOwnPartner(organizationId);
  const resubmit = useResubmitOwnPartner(organizationId);

  return (
    <div className="space-y-6">
      <StatusCallout
        partner={partner}
        audience="applicant"
        action={
          partner.status === "rejected" && canResubmit ? (
            <Button variant="outline" size="sm" onClick={() => setResubmitting(true)}>
              <RotateCcw aria-hidden />
              Resubmit for review
            </Button>
          ) : null
        }
      />
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit business profile</CardTitle>
            <CardDescription>
              Saving replaces every field; clearing an optional field removes it. The status stays{" "}
              {partner.status}
              {partner.status === "rejected" ? " until you resubmit" : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultValues={profileValues(partner)}
              submitLabel="Save changes"
              onCancel={() => setEditing(false)}
              onSubmit={async (values) => {
                await update.mutateAsync({
                  ...profileBody(values),
                  expected_version: partner.version,
                });
                toast.success("Business profile saved");
                setEditing(false);
              }}
            />
          </CardContent>
        </Card>
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
      {canViewDecisions ? <OwnDecisions organizationId={organizationId} /> : null}

      <ConfirmDialog
        open={resubmitting}
        onOpenChange={setResubmitting}
        title="Resubmit for review?"
        description="Your registration returns to pending and Aayulogic reviews the current profile. Make sure it addresses the feedback first."
        confirmLabel="Resubmit"
        onConfirm={async () => {
          await resubmit.mutateAsync({ expected_version: partner.version, reason: "" });
          toast.success("Resubmitted for review");
        }}
      />
    </div>
  );
}

function OwnDecisions({ organizationId }: { organizationId: string }) {
  const paging = usePageParam("decisions_");
  return (
    <DecisionHistoryCard
      decisions={useOwnPartnerDecisions(organizationId, paging)}
      paging={paging}
    />
  );
}
