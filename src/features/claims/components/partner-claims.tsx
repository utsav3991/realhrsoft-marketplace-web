"use client";

import { BadgeCheck, ScanLine, SearchX, Ticket } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Field, fieldDescriptionIds } from "@/design-system/components/field";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { NotAPartner, useIsPartner } from "@/features/offers/components/own-offers";
import { ApiError } from "@/shared/api";
import { useSelectedOrganizationId } from "@/shared/auth";
import { PartnerClaimPermission, useCanInOrganization } from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import { useConfirmPartnerClaim } from "../api/mutations";
import {
  CLAIM_SORTS,
  normalizeReference,
  REFERENCE_PATTERN,
  usePartnerClaim,
  usePartnerClaims,
  type PartnerClaim,
} from "../api/queries";
import {
  CLAIM_STATUSES,
  ClaimStatusCallout,
  claimStatusFrom,
  methodLabel,
  ReferenceCode,
} from "./claim-details";

const ALL = "all";

/**
 * Claim verification for the selected partner organization. Viewing
 * (claims.partner_claim.view) looks references up and lists claims; confirming
 * (claims.partner_claim.confirm) marks an active one used. Either opens the page, so a
 * member who may only confirm can still redeem the reference an employee shows.
 */
export function PartnerClaims() {
  const isPartner = useIsPartner();
  const canView = useCanInOrganization(PartnerClaimPermission.CLAIM_VIEW);

  if (!isPartner) {
    return (
      <NotAPartner description="Register the business and pass Aayulogic verification; employees can then claim your offers and you confirm them here." />
    );
  }
  return (
    <div className="space-y-6">
      <VerifyClaim />
      {canView ? <ClaimsList /> : null}
    </div>
  );
}

function VerifyClaim() {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [reference, setReference] = useState<string | null>(null);
  const canView = useCanInOrganization(PartnerClaimPermission.CLAIM_VIEW);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = normalizeReference(draft);
    if (!REFERENCE_PATTERN.test(value)) {
      setError("A reference is 10 letters and digits");
      return;
    }
    setError(undefined);
    setDraft(value);
    setReference(value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redeem a claim</CardTitle>
        <CardDescription>
          {canView
            ? "Enter the reference the employee shows you, check it, then confirm the redemption."
            : "Enter the reference the employee shows you and confirm the redemption."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} noValidate className="flex max-w-md items-start gap-2">
          <Field id="claim-reference" label="Reference" error={error} className="flex-1">
            <Input
              id="claim-reference"
              autoComplete="off"
              spellCheck={false}
              maxLength={20}
              placeholder="e.g. 7KX2MQ9RTP"
              className="font-mono uppercase"
              aria-invalid={error ? true : undefined}
              aria-describedby={fieldDescriptionIds("claim-reference", { error })}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </Field>
          <Button type="submit" variant="outline" className="mt-5.5">
            <ScanLine aria-hidden />
            {canView ? "Look up" : "Continue"}
          </Button>
        </form>
        {reference === null ? null : canView ? (
          <LookedUpClaim key={reference} reference={reference} />
        ) : (
          <ConfirmWithoutLookup key={reference} reference={reference} />
        )}
      </CardContent>
    </Card>
  );
}

function LookedUpClaim({ reference }: { reference: string }) {
  const organizationId = useSelectedOrganizationId();
  const claim = usePartnerClaim(organizationId, reference);

  if (claim.isPending) return <Skeleton className="h-40 w-full" />;
  if (claim.isError) {
    return claim.error instanceof ApiError && claim.error.isNotFound ? (
      <EmptyState
        icon={SearchX}
        title="No claim with this reference"
        description="Check the reference with the employee. Only claims of your own offers can be found."
        className="py-8"
      />
    ) : (
      <ErrorState error={claim.error} onRetry={() => void claim.refetch()} />
    );
  }
  return <ClaimSummary claim={claim.data} />;
}

/** The claim's facts. The partner never sees who the employee is or who employs them. */
function ClaimSummary({ claim }: { claim: PartnerClaim }) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <ClaimStatusCallout claim={claim} audience="partner" />
      <DetailList>
        <Detail label="Reference">
          <ReferenceCode reference={claim.reference} />
        </Detail>
        <Detail label="Status">
          <StatusBadge domain="claim" status={claim.status} />
        </Detail>
        <Detail label="Offer">{claim.title}</Detail>
        <Detail label="Benefit">{claim.benefit}</Detail>
        <Detail label="Method">{methodLabel(claim)}</Detail>
        <Detail label="Claimed">{formatDateTime(claim.claimed_at)}</Detail>
        <Detail label="Use by">{formatDateTime(claim.expires_at)}</Detail>
        {claim.used_at ? <Detail label="Redeemed">{formatDateTime(claim.used_at)}</Detail> : null}
      </DetailList>
      {claim.status === "active" ? <ConfirmButton reference={claim.reference} /> : null}
    </div>
  );
}

function ConfirmButton({
  reference,
  onConfirmed,
}: {
  reference: string;
  onConfirmed?: (claim: PartnerClaim) => void;
}) {
  const organizationId = useSelectedOrganizationId();
  const canConfirm = useCanInOrganization(PartnerClaimPermission.CLAIM_CONFIRM);
  const confirm = useConfirmPartnerClaim(organizationId);
  const [open, setOpen] = useState(false);
  if (!canConfirm) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <BadgeCheck aria-hidden />
        Confirm redemption
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        optional
        title="Confirm this redemption?"
        description={
          <>
            Confirm only when the employee is redeeming the offer with you now. Claim{" "}
            <span className="font-mono">{reference}</span> is marked used and cannot be redeemed
            again.
          </>
        }
        confirmLabel="Confirm redemption"
        onConfirm={async (reason) => {
          const claim = await confirm.mutateAsync({ reference, reason });
          toast.success(`Claim ${claim.reference} redeemed`);
          onConfirmed?.(claim);
        }}
      />
    </>
  );
}

/** A member who may confirm but not view: the confirmation's answer is the only readout. */
function ConfirmWithoutLookup({ reference }: { reference: string }) {
  const [confirmed, setConfirmed] = useState<PartnerClaim | null>(null);
  if (confirmed) return <ClaimSummary claim={confirmed} />;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
      <ReferenceCode reference={reference} />
      <ConfirmButton reference={reference} onConfirmed={setConfirmed} />
    </div>
  );
}

function ClaimsList() {
  const { searchParams, set } = useUrlParams();
  const organizationId = useSelectedOrganizationId();
  const status = claimStatusFrom(searchParams.get("status"));
  const sort = useSortParam(CLAIM_SORTS);
  const paging = usePageParam();
  const claims = usePartnerClaims(organizationId, status, sort.value, paging);
  const columns: DataTableColumns<RowOf<typeof claims>> = [
    {
      id: "reference",
      header: "Reference",
      sortKey: "reference",
      cellClassName: "font-mono",
      cell: (claim) => claim.reference,
    },
    {
      id: "offer",
      header: "Offer",
      sortKey: "title",
      cell: (claim) => (
        <>
          <p className="font-medium">{claim.title}</p>
          <p className="text-muted-foreground text-xs">{methodLabel(claim)}</p>
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (claim) => <StatusBadge domain="claim" status={claim.status} />,
    },
    {
      id: "claimed",
      header: "Claimed",
      sortKey: "claimed_at",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (claim) => formatDate(claim.claimed_at),
    },
    {
      id: "use-by",
      header: "Use by",
      sortKey: "expires_at",
      cellClassName: "text-muted-foreground",
      cell: (claim) => formatDate(claim.expires_at),
    },
    {
      id: "redeemed",
      header: "Redeemed",
      sortKey: "used_at",
      cellClassName: "text-muted-foreground",
      cell: (claim) => (claim.used_at ? formatDate(claim.used_at) : "—"),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Claims of your offers</CardTitle>
          <CardDescription>
            Newest first unless sorted. Employee identity is never shown.
          </CardDescription>
        </div>
        <Select
          value={status ?? ALL}
          onValueChange={(value) => {
            set({ status: value === ALL ? null : value });
          }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {CLAIM_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <QueryDataTable
          aria-label="Claims of your offers"
          query={claims}
          columns={columns}
          sort={sort}
          paging={paging}
          rowKey={(claim) => claim.reference}
          skeletonRows={3}
          className="rounded-lg"
          empty={
            <EmptyState
              icon={Ticket}
              title={status ? "No claims with this status" : "No claims yet"}
              description={status ? undefined : "Claims appear when employees claim your offers."}
              className="py-8"
            />
          }
        />
      </CardContent>
    </Card>
  );
}
