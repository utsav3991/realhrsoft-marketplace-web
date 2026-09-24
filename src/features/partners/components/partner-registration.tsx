"use client";

import { ArrowLeft, ArrowRight, Info, Lock, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
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
import { ApiError, type Schemas } from "@/shared/api";
import { PartnerApplicantPermission, useCan } from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ErrorState } from "@/shared/feedback/states";
import { cn } from "@/shared/lib/cn";

import {
  useRegisterPartner,
  useRemoveDocument,
  useSubmitRegistration,
  useUpdatePartnerProfile,
  type PartnerTarget,
} from "../api/mutations";
import { usePartnerRegistration } from "../api/queries";
import { EMPTY_PROFILE, profileBody, profileValues } from "../schemas/partner";
import { ContactsCard } from "./contacts-card";
import { LocationsCard } from "./locations-card";
import { PartnerBusinessCard, PartnerStandingBadges } from "./partner-details";
import { ProfileForm } from "./profile-form";
import { outstandingCount, RequirementsList, VerificationCard } from "./verification-details";

type Registration = Schemas["PartnerRegistrationView"];

const STEPS = ["Business details", "Contacts", "Locations", "Documents", "Review and submit"];
const EDITABLE = new Set(["draft", "changes_requested"]);

const STATUS_MESSAGE: Record<string, string> = {
  submitted: "Submitted. Aayulogic will review your registration.",
  under_review: "Aayulogic is reviewing your registration.",
  rejected: "Your registration was not accepted.",
};

/**
 * The applicant's Partner registration before verification (global applicant grants, no
 * organization). Draft and changes-requested registrations are edited step by step and then
 * submitted; afterwards they are read-only until Aayulogic decides.
 */
export function PartnerRegistration() {
  const canRead = useCan(PartnerApplicantPermission.READ_OWN);
  const canCreate = useCan(PartnerApplicantPermission.CREATE);
  const registration = usePartnerRegistration({ enabled: canRead });

  if (!canRead && !canCreate) {
    return (
      <EmptyState
        icon={Lock}
        title="Partner registration is not enabled for your account"
        description="Aayulogic enables registration for the accounts it provisions for Partner businesses. Contact Aayulogic if your business wants to join the marketplace."
      />
    );
  }
  if (canRead && registration.isPending) return <Skeleton className="h-64 w-full" />;
  if (canRead && registration.isSuccess) {
    return <RegistrationWorkspace registration={registration.data} />;
  }
  const none =
    !canRead || (registration.error instanceof ApiError && registration.error.isNotFound);
  if (!none) {
    return <ErrorState error={registration.error} onRetry={() => void registration.refetch()} />;
  }
  return canCreate ? (
    <StartRegistration />
  ) : (
    <EmptyState
      title="No open registration"
      description="Your account has no Partner registration awaiting verification. A verified Partner is managed in its organization's portal."
    />
  );
}

function StepIndicator({ step, onSelect }: { step: number; onSelect?: (step: number) => void }) {
  return (
    <nav aria-label="Registration steps">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li key={label}>
            <Button
              type="button"
              size="sm"
              variant={index === step ? "secondary" : "ghost"}
              aria-current={index === step ? "step" : undefined}
              disabled={!onSelect}
              onClick={() => onSelect?.(index)}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-xs",
                  index === step && "border-primary text-primary",
                )}
                aria-hidden
              >
                {index + 1}
              </span>
              {label}
            </Button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function StartRegistration() {
  const register = useRegisterPartner();
  return (
    <div className="space-y-6">
      <StepIndicator step={0} />
      <Card>
        <CardHeader>
          <CardTitle>Register your business</CardTitle>
          <CardDescription>
            Start with the business details. You add contacts, locations and documents next, then
            submit everything for verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultValues={EMPTY_PROFILE}
            submitLabel="Save and continue"
            onSubmit={async (values) => {
              await register.mutateAsync(profileBody(values));
              toast.success("Registration started");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RegistrationWorkspace({ registration }: { registration: Registration }) {
  const { profile, verification } = registration;
  const target: PartnerTarget = { kind: "registration", partnerId: profile.partner_id };
  const canEditProfile = useCan(PartnerApplicantPermission.UPDATE_OWN);
  const canContacts = useCan(PartnerApplicantPermission.CONTACT_MANAGE_OWN);
  const canLocations = useCan(PartnerApplicantPermission.LOCATION_MANAGE_OWN);
  const canDocuments = useCan(PartnerApplicantPermission.DOCUMENT_MANAGE_OWN);
  const canSubmit = useCan(PartnerApplicantPermission.VERIFICATION_SUBMIT);
  const [step, setStep] = useState(0);
  const update = useUpdatePartnerProfile(target);
  const removeDocument = useRemoveDocument(profile.partner_id);
  const [removing, setRemoving] = useState<
    Registration["verification"]["documents"][number] | null
  >(null);

  const header = (
    <Card>
      <CardHeader>
        <CardTitle>{profile.display_name}</CardTitle>
        <CardDescription>
          Your Partner registration. Access to the Partner portal follows verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PartnerStandingBadges
          verificationStatus={profile.verification_status}
          operationalStatus={profile.operational_status}
          marketplaceEligible={profile.marketplace_eligible}
        />
      </CardContent>
    </Card>
  );

  if (!EDITABLE.has(profile.verification_status)) {
    return (
      <div className="space-y-6">
        {header}
        <Alert>
          <Info aria-hidden />
          <AlertDescription>
            {STATUS_MESSAGE[profile.verification_status] ?? "Your registration is read-only."}
          </AlertDescription>
        </Alert>
        <VerificationCard verification={verification} />
        <PartnerBusinessCard profile={profile} />
        <ContactsCard contacts={profile.contacts} />
        <LocationsCard locations={profile.locations} />
      </div>
    );
  }

  const version = profile.version;
  const outstanding = outstandingCount(verification.requirements);
  const last = STEPS.length - 1;

  return (
    <div className="space-y-6">
      {header}
      {profile.verification_status === "changes_requested" ? (
        <Alert>
          <Info aria-hidden />
          <AlertTitle>Aayulogic asked for changes</AlertTitle>
          <AlertDescription>
            {verification.review_note ?? "Correct the details below, then submit again."}
          </AlertDescription>
        </Alert>
      ) : null}
      <StepIndicator step={step} onSelect={setStep} />

      {step === 0 ? (
        canEditProfile ? (
          <Card>
            <CardHeader>
              <CardTitle>Business details</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm
                key={version}
                defaultValues={profileValues(profile)}
                submitLabel="Save and continue"
                onSubmit={async (values) => {
                  await update.mutateAsync({ ...profileBody(values), version });
                  toast.success("Business details saved");
                  setStep(1);
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <PartnerBusinessCard profile={profile} />
        )
      ) : null}
      {step === 1 ? (
        <ContactsCard
          contacts={profile.contacts}
          editor={canContacts ? { target, version } : undefined}
        />
      ) : null}
      {step === 2 ? (
        <LocationsCard
          locations={profile.locations}
          editor={canLocations ? { target, version } : undefined}
        />
      ) : null}
      {step === 3 ? (
        <div className="space-y-4">
          <Alert>
            <Info aria-hidden />
            <AlertTitle>Document upload is not available yet</AlertTitle>
            <AlertDescription>
              Aayulogic attaches verification documents from its secure storage once uploads are
              enabled. Documents already attached are listed below.
            </AlertDescription>
          </Alert>
          <VerificationCard
            verification={verification}
            onRemoveDocument={canDocuments ? setRemoving : undefined}
          />
        </div>
      ) : null}
      {step === last ? (
        <Card>
          <CardHeader>
            <CardTitle>Review and submit</CardTitle>
            <CardDescription>
              {outstanding > 0
                ? `${outstanding} requirement${outstanding === 1 ? "" : "s"} still outstanding.`
                : "Everything required is supplied. Aayulogic reviews it after you submit."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RequirementsList requirements={verification.requirements} />
            {canSubmit ? (
              <SubmitButton
                partnerId={profile.partner_id}
                version={version}
                disabled={outstanding > 0}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
          <ArrowLeft aria-hidden />
          Back
        </Button>
        {step < last ? (
          <Button variant="outline" onClick={() => setStep(step + 1)}>
            Next
            <ArrowRight aria-hidden />
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.file_name ?? "document"}?`}
        description="The document is detached from your registration."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          await removeDocument.mutateAsync({ documentId: removing.id, version });
          toast.success("Document removed");
        }}
      />
    </div>
  );
}

function SubmitButton({
  partnerId,
  version,
  disabled,
}: {
  partnerId: string;
  version: number;
  disabled: boolean;
}) {
  const submit = useSubmitRegistration(partnerId);
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Button onClick={() => setConfirming(true)} disabled={disabled}>
        <Send aria-hidden />
        Submit for verification
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Submit for verification?"
        description="You cannot change the registration while Aayulogic reviews it."
        confirmLabel="Submit"
        onConfirm={async () => {
          await submit.mutateAsync(version);
          toast.success("Submitted for verification");
        }}
      />
    </>
  );
}
