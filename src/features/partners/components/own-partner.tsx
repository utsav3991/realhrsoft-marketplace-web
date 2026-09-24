"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { useSelectedOrganizationId } from "@/shared/auth";
import { PartnerPermission, useCanInOrganization } from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";

import {
  useOwnPartner,
  useOwnPartnerEligibility,
  useOwnPartnerRequirements,
  useOwnPartnerVerification,
} from "../api/queries";
import { useUpdatePartnerProfile, type PartnerTarget } from "../api/mutations";
import type { PartnerProfile } from "../api/queries";
import { profileBody, profileValues } from "../schemas/partner";
import { ContactsCard } from "./contacts-card";
import { LocationsCard } from "./locations-card";
import { PartnerBusinessCard, PartnerStandingBadges } from "./partner-details";
import { ProfileForm } from "./profile-form";
import { outstandingCount, RequirementsList, VerificationCard } from "./verification-details";

/** The selected organization's verified Partner: standing, verification and editable profile. */
export function OwnPartnerProfile() {
  const organizationId = useSelectedOrganizationId();
  const partner = useOwnPartner(organizationId);
  const canEdit = useCanInOrganization(PartnerPermission.PROFILE_EDIT);
  const canContacts = useCanInOrganization(PartnerPermission.CONTACT_MANAGE);
  const canLocations = useCanInOrganization(PartnerPermission.LOCATION_MANAGE);

  if (partner.isPending) return <Skeleton className="h-64 w-full" />;
  if (partner.isError) {
    return <ErrorState error={partner.error} onRetry={() => void partner.refetch()} />;
  }
  const profile = partner.data;
  const target: PartnerTarget = { kind: "organization", organizationId };
  const editor = { target, version: profile.version };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{profile.display_name}</CardTitle>
          <CardDescription>{profile.legal_business_name}</CardDescription>
        </CardHeader>
        <CardContent>
          <PartnerStandingBadges
            verificationStatus={profile.verification_status}
            operationalStatus={profile.operational_status}
            marketplaceEligible={profile.marketplace_eligible}
          />
        </CardContent>
      </Card>
      <OwnVerification organizationId={organizationId} />
      <BusinessDetails profile={profile} target={target} canEdit={canEdit} />
      <ContactsCard contacts={profile.contacts} editor={canContacts ? editor : undefined} />
      <LocationsCard locations={profile.locations} editor={canLocations ? editor : undefined} />
    </div>
  );
}

function BusinessDetails({
  profile,
  target,
  canEdit,
}: {
  profile: PartnerProfile;
  target: PartnerTarget;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const update = useUpdatePartnerProfile(target);
  if (!editing) {
    return (
      <PartnerBusinessCard
        profile={profile}
        action={
          canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              Edit
            </Button>
          ) : null
        }
      />
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit business details</CardTitle>
        <CardDescription>
          The verified legal name, registration number and tax identifier can only change through
          re-verification by Aayulogic.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          defaultValues={profileValues(profile)}
          lockVerified={profile.verification_status === "verified"}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await update.mutateAsync({ ...profileBody(values), version: profile.version });
            toast.success("Profile updated");
            setEditing(false);
          }}
        />
      </CardContent>
    </Card>
  );
}

function OwnVerification({ organizationId }: { organizationId: string }) {
  const verification = useOwnPartnerVerification(organizationId);
  if (verification.isPending) return <Skeleton className="h-40 w-full" />;
  if (verification.isError) {
    return <ErrorState error={verification.error} onRetry={() => void verification.refetch()} />;
  }
  return <VerificationCard verification={verification.data} />;
}

/** Dashboard summary: marketplace eligibility (verified AND active) and requirements. */
export function OwnPartnerStanding() {
  const organizationId = useSelectedOrganizationId();
  const eligibility = useOwnPartnerEligibility(organizationId);
  const requirements = useOwnPartnerRequirements(organizationId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketplace standing</CardTitle>
        <CardDescription>
          Eligibility needs verification and an active standing. Commercial status and content
          approval are separate gates for each offer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {eligibility.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : eligibility.isError ? (
          <ErrorState error={eligibility.error} onRetry={() => void eligibility.refetch()} />
        ) : (
          <DetailList>
            <Detail label="Marketplace">
              <StatusBadge
                domain="marketplaceEligibility"
                status={eligibility.data.marketplace_eligible ? "eligible" : "ineligible"}
              />
            </Detail>
            <Detail label="Verification">
              <StatusBadge
                domain="partnerVerification"
                status={eligibility.data.verification_status}
              />
            </Detail>
            <Detail label="Standing">
              <StatusBadge
                domain="partnerOperational"
                status={eligibility.data.operational_status}
              />
            </Detail>
          </DetailList>
        )}
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            Verification requirements
            {requirements.isSuccess && outstandingCount(requirements.data) > 0 ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                · {outstandingCount(requirements.data)} outstanding
              </span>
            ) : null}
          </h3>
          {requirements.isPending ? (
            <Skeleton className="h-16 w-full" />
          ) : requirements.isError ? (
            <ErrorState error={requirements.error} onRetry={() => void requirements.refetch()} />
          ) : (
            <RequirementsList requirements={requirements.data} />
          )}
        </section>
      </CardContent>
    </Card>
  );
}
