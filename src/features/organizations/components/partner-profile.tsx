"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useSelectedOrganizationId } from "@/shared/auth";
import { Alert, AlertDescription } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { errorMessage, type Schemas } from "@/shared/api";
import { PartnerPermission, useCanInOrganization } from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { formatDateTime } from "@/shared/lib/format";

import { useUpdatePartnerProfile } from "../api/mutations";
import { usePartnerProfile } from "../api/queries";
import {
  CONTACT_FIELDS,
  businessValues,
  contactBody,
  contactSchema,
  type ContactValues,
} from "../schemas/business";
import { BusinessSummary } from "./application-summary";
import { BusinessFields } from "./business-fields";

type Profile = Schemas["PartnerProfileResponse"];

/** The selected organization's Partner profile. The verified legal name is fixed. */
export function PartnerProfile() {
  const organizationId = useSelectedOrganizationId();
  const profile = usePartnerProfile(organizationId);
  if (profile.isPending) return <Skeleton className="h-64 w-full" />;
  if (profile.isError) {
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  }
  return <LoadedProfile profile={profile.data} />;
}

function LoadedProfile({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const canEdit = useCanInOrganization(PartnerPermission.PROFILE_EDIT);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Status">
              <StatusBadge domain="partnerProfile" status={profile.status} />
            </Detail>
            <Detail label="Verified">{formatDateTime(profile.verified_at)}</Detail>
            <Detail label="Legal name">{profile.details.legal_name}</Detail>
          </DetailList>
        </CardContent>
      </Card>

      {editing ? (
        <EditContact profile={profile} onDone={() => setEditing(false)} />
      ) : (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <CardTitle>Business details</CardTitle>
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden />
                Edit
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <BusinessSummary details={profile.details} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EditContact({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const update = useUpdatePartnerProfile(profile.organization_id);
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: businessValues(profile.details),
  });
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await update.mutateAsync({ ...contactBody(values), version: profile.version });
      toast.success("Profile updated");
      onDone();
    } catch (error) {
      if (!applyApiFieldErrors(error, form, CONTACT_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Edit business details</CardTitle>
          <CardDescription>
            The verified legal name can only change through Aayulogic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {failure ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}
          <BusinessFields form={form} includeLegalName={false} disabled={isSubmitting} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
