"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useSelectedOrganizationId } from "@/shared/auth";
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
import { OrganizationAdminPermission, useCan } from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import {
  useEntitlement,
  useGrantEntitlement,
  useOwnEntitlement,
  useRevokeEntitlement,
} from "../api/entitlements";

type Entitlement = Schemas["EntitlementResponse"];

const GRANT_FIELDS = [
  {
    name: "basis",
    label: "Commercial basis",
    maxLength: 200,
    hint: "For example the negotiated agreement or package reference.",
  },
  {
    name: "valid_until",
    label: "Valid until",
    kind: "datetime",
    optional: true,
    hint: "Leave empty for no end date.",
  },
] as const;

function EntitlementDetails({ entitlement }: { entitlement: Entitlement }) {
  return (
    <DetailList>
      <Detail label="Status">
        <StatusBadge domain="entitlement" status={entitlement.status} />
      </Detail>
      <Detail label="Commercially eligible">{entitlement.eligible ? "Yes" : "No"}</Detail>
      <Detail label="Valid until">
        {entitlement.valid_until ? formatDateTime(entitlement.valid_until) : "No end date"}
      </Detail>
      <Detail label="Basis" className="sm:col-span-2">
        {entitlement.basis ?? "—"}
      </Detail>
      <Detail label="Recorded">
        {entitlement.granted_at ? formatDateTime(entitlement.granted_at) : "—"}
      </Detail>
    </DetailList>
  );
}

/** Admin view of publication gate 2. It never implies verification or content approval. */
export function EntitlementCard({ organizationId }: { organizationId: string }) {
  const entitlement = useEntitlement(organizationId);
  const grant = useGrantEntitlement(organizationId);
  const revoke = useRevokeEntitlement(organizationId);
  const canManage = useCan(OrganizationAdminPermission.ENTITLEMENT_MANAGE);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState(false);

  // No Partner profile: commercial entitlement does not apply to this organization.
  if (entitlement.error instanceof ApiError && entitlement.error.isNotFound) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Commercial entitlement</CardTitle>
          <CardDescription>
            One of three independent publication gates, with Partner verification and content
            approval.
          </CardDescription>
        </div>
        {canManage && entitlement.isSuccess ? (
          <div className="flex gap-2">
            {entitlement.data.status === "active" ? (
              <Button variant="ghost" size="sm" onClick={() => setRevoking(true)}>
                Revoke
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setGranting(true)}>
              {entitlement.data.status === "none" ? "Record entitlement" : "Renew or change"}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {entitlement.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : entitlement.isError ? (
          <ErrorState error={entitlement.error} onRetry={() => void entitlement.refetch()} />
        ) : (
          <EntitlementDetails entitlement={entitlement.data} />
        )}
      </CardContent>

      <FieldsDialog
        open={granting}
        onOpenChange={setGranting}
        title="Record commercial entitlement"
        description="Replaces the current terms. Content still needs its own approval before anything is published."
        confirmLabel="Save entitlement"
        fields={GRANT_FIELDS}
        onConfirm={async ({ basis, valid_until, reason }) => {
          await grant.mutateAsync({ basis: basis ?? "", valid_until: valid_until ?? null, reason });
          toast.success("Entitlement recorded");
        }}
      />
      <ReasonDialog
        open={revoking}
        onOpenChange={setRevoking}
        title="Revoke the entitlement?"
        description="Every Offer from this Partner goes offline until an entitlement is recorded again."
        confirmLabel="Revoke entitlement"
        destructive
        onConfirm={async (reason) => {
          await revoke.mutateAsync({ reason });
          toast.success("Entitlement revoked");
        }}
      />
    </Card>
  );
}

/** Partner portal: the selected organization's commercial status (read-only). */
export function OwnEntitlementCard() {
  const organizationId = useSelectedOrganizationId();
  const entitlement = useOwnEntitlement(organizationId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commercial status</CardTitle>
        <CardDescription>
          Recorded by Aayulogic. Your offers can go live only while you are commercially eligible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entitlement.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : entitlement.isError ? (
          <ErrorState error={entitlement.error} onRetry={() => void entitlement.refetch()} />
        ) : (
          <EntitlementDetails entitlement={entitlement.data} />
        )}
      </CardContent>
    </Card>
  );
}
