"use client";

import { ArrowLeft, Check, Inbox, Ticket, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { type DataTableColumns } from "@/design-system/components/data-table";
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
import { StatusBadge } from "@/shared/components/status-badge";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import { useDecidePartnerClaim, type ClaimDecision } from "../api/mutations";
import {
  CLAIM_SORTS,
  usePartnerClaim,
  usePartnerClaims,
  type PartnerClaim,
} from "../api/queries";
import {
  CLAIM_STATUSES,
  ClaimStatusCallout,
  claimStatusFrom,
  DecisionDialog,
  decisionAttempt,
  DecisionFacts,
  type DecisionAttempt,
} from "./claim-details";

const ALL = "all";

/**
 * Claims of the selected partner organization's offers: the decision queue of requests that
 * need approval, then every claim. Accepting issues the voucher; confirming its use is a
 * separate step at the counter. Claimants are never named to the partner.
 */
export function PartnerClaims() {
  const isPartner = useIsPartner();

  if (!isPartner) {
    return (
      <NotAPartner description="Register the business and pass Aayulogic verification; employees can then claim your offers and you follow them here." />
    );
  }
  return (
    <div className="space-y-6">
      <DecisionQueue />
      <ClaimsList />
    </div>
  );
}

/** Whether the member may take each decision; the page opens with view alone. */
function useDecisionPermissions() {
  return {
    accept: useCanInOrganization(PartnerClaimPermission.CLAIM_ACCEPT),
    reject: useCanInOrganization(PartnerClaimPermission.CLAIM_REJECT),
  };
}

function DecisionButtons({
  onDecide,
  size = "sm",
}: {
  onDecide: (decision: ClaimDecision) => void;
  size?: "sm" | "default";
}) {
  const can = useDecisionPermissions();
  if (!can.accept && !can.reject) return null;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {can.reject ? (
        <Button variant="outline" size={size} onClick={() => onDecide("reject")}>
          <X aria-hidden />
          Reject
        </Button>
      ) : null}
      {can.accept ? (
        <Button variant={size === "sm" ? "outline" : "default"} size={size} onClick={() => onDecide("accept")}>
          <Check aria-hidden />
          Accept
        </Button>
      ) : null}
    </div>
  );
}

function PartnerDecisionDialog({
  claimId,
  attempt,
  onClose,
}: {
  claimId: string | null;
  attempt: DecisionAttempt | null;
  onClose: () => void;
}) {
  const organizationId = useSelectedOrganizationId();
  const decide = useDecidePartnerClaim(organizationId);
  return (
    <DecisionDialog
      attempt={attempt}
      onClose={onClose}
      onDecide={async (input) => {
        if (claimId) await decide.mutateAsync({ claimId, ...input });
      }}
    />
  );
}

/** Requests awaiting this partner, soonest deadline first. */
function DecisionQueue() {
  const organizationId = useSelectedOrganizationId();
  const paging = usePageParam("queue_");
  const claims = usePartnerClaims(organizationId, "requested", "decision_deadline", paging);
  const [deciding, setDeciding] = useState<{ claimId: string; attempt: DecisionAttempt } | null>(
    null,
  );

  const columns: DataTableColumns<RowOf<typeof claims>> = [
    {
      id: "offer",
      header: "Offer",
      cell: (claim) => (
        <>
          <Link href={`/partner/claims/${claim.id}`} className="font-medium hover:underline">
            {claim.title}
          </Link>
          <p className="text-muted-foreground text-xs">
            {claim.headline} · version {claim.version_number}
          </p>
        </>
      ),
    },
    {
      id: "requested",
      header: "Requested",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (claim) => formatDateTime(claim.requested_at),
    },
    {
      id: "deadline",
      header: "Decide by",
      cell: (claim) => (claim.decision_deadline ? formatDateTime(claim.decision_deadline) : "—"),
    },
    {
      id: "actions",
      header: <span className="sr-only">Decision</span>,
      cell: (claim) => (
        <DecisionButtons
          onDecide={(decision) =>
            setDeciding({ claimId: claim.id, attempt: decisionAttempt(decision) })
          }
        />
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Awaiting your decision</CardTitle>
        <CardDescription>
          Requests for offers that need your approval. Undecided requests expire at their
          deadline without a voucher.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <QueryDataTable
          aria-label="Requests awaiting your decision"
          query={claims}
          columns={columns}
          paging={paging}
          rowKey={(claim) => claim.id}
          skeletonRows={2}
          className="rounded-lg"
          empty={
            <EmptyState
              icon={Inbox}
              title="Nothing to decide"
              description="Requests appear here when employees ask for an offer that needs your approval."
              className="py-8"
            />
          }
        />
      </CardContent>
      <PartnerDecisionDialog
        claimId={deciding?.claimId ?? null}
        attempt={deciding?.attempt ?? null}
        onClose={() => setDeciding(null)}
      />
    </Card>
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
      id: "offer",
      header: "Offer",
      cell: (claim) => (
        <>
          <Link href={`/partner/claims/${claim.id}`} className="font-medium hover:underline">
            {claim.title}
          </Link>
          <p className="text-muted-foreground text-xs">Version {claim.version_number}</p>
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (claim) => <StatusBadge domain="claim" status={claim.status} />,
    },
    {
      id: "voucher",
      header: "Voucher",
      className: "hidden sm:table-cell",
      cell: (claim) =>
        claim.voucher ? (
          <StatusBadge domain="voucher" status={claim.voucher.status} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "requested",
      header: "Requested",
      sortKey: "requested_at",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (claim) => formatDate(claim.requested_at),
    },
    {
      id: "accepted",
      header: "Accepted",
      sortKey: "accepted_at",
      cellClassName: "text-muted-foreground",
      cell: (claim) => (claim.accepted_at ? formatDate(claim.accepted_at) : "—"),
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
          <SelectTrigger className="w-48" aria-label="Filter by status">
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
          rowKey={(claim) => claim.id}
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

function BackToClaims() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/partner/claims">
        <ArrowLeft aria-hidden />
        Claims
      </Link>
    </Button>
  );
}

/** One claim of the partner's offer: its decision and, once accepted, the voucher. */
export function PartnerClaimRecord({ claimId }: { claimId: string }) {
  const organizationId = useSelectedOrganizationId();
  const claim = usePartnerClaim(organizationId, claimId);

  if (claim.isPending) {
    return (
      <div className="space-y-6">
        <BackToClaims />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (claim.isError) {
    return (
      <div className="space-y-6">
        <BackToClaims />
        {claim.error instanceof ApiError && claim.error.isNotFound ? (
          <EmptyState icon={Ticket} title="Claim not found" />
        ) : (
          <ErrorState error={claim.error} onRetry={() => void claim.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedPartnerClaim claim={claim.data} />;
}

function LoadedPartnerClaim({ claim }: { claim: PartnerClaim }) {
  const [attempt, setAttempt] = useState<DecisionAttempt | null>(null);
  return (
    <div className="space-y-6">
      <BackToClaims />
      <PageHeader
        title={claim.title}
        description={claim.headline}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="claim" status={claim.status} />
            {claim.status === "requested" ? (
              <DecisionButtons
                size="default"
                onDecide={(decision) => setAttempt(decisionAttempt(decision))}
              />
            ) : null}
          </div>
        }
      />
      <ClaimStatusCallout claim={claim} audience="partner" />
      <Card>
        <CardHeader>
          <CardTitle>Claim</CardTitle>
          <CardDescription>
            The terms of version {claim.version_number} apply, whatever changed since.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Requested">{formatDateTime(claim.requested_at)}</Detail>
            {claim.decision_deadline ? (
              <Detail label="Decide by">{formatDateTime(claim.decision_deadline)}</Detail>
            ) : null}
            {claim.accepted_at ? (
              <Detail label="Accepted">{formatDateTime(claim.accepted_at)}</Detail>
            ) : null}
            <DecisionFacts claim={claim} />
          </DetailList>
        </CardContent>
      </Card>
      {claim.voucher ? (
        <Card>
          <CardHeader>
            <CardTitle>Voucher</CardTitle>
            <CardDescription>
              Issued on acceptance. Its use is confirmed separately when the employee presents it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DetailList>
              <Detail label="Voucher">
                <StatusBadge domain="voucher" status={claim.voucher.status} />
              </Detail>
              <Detail label="Usable until">{formatDateTime(claim.voucher.valid_until)}</Detail>
              {claim.voucher.used_at ? (
                <Detail label="Used">{formatDateTime(claim.voucher.used_at)}</Detail>
              ) : null}
              {claim.voucher.redemption?.reversed_at ? (
                <Detail label="Use corrected">
                  {formatDateTime(claim.voucher.redemption.reversed_at)}
                </Detail>
              ) : null}
            </DetailList>
          </CardContent>
        </Card>
      ) : null}
      <PartnerDecisionDialog
        claimId={claim.id}
        attempt={attempt}
        onClose={() => setAttempt(null)}
      />
    </div>
  );
}
