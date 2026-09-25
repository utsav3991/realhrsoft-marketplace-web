"use client";

import type { UseInfiniteQueryResult, InfiniteData } from "@tanstack/react-query";
import { CheckCircle2, Clock, History, XCircle } from "lucide-react";
import type { ReactNode } from "react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import { Detail, DetailList } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import type { IntakePath, Partner, PartnerDecision } from "../api/queries";

export const INTAKE_LABEL: Record<IntakePath, string> = {
  self_service: "Self-service",
  assisted: "Assisted by Aayulogic",
};

const empty = (value: string | undefined) => value || "—";

/** The business profile as the partner submitted it. */
export function PartnerProfileCard({ partner, action }: { partner: Partner; action?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Business profile</CardTitle>
          <CardDescription>
            What Aayulogic verifies. Editing it does not change the verification status.
          </CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Business name">{partner.business_name}</Detail>
          <Detail label="Category">{empty(partner.category)}</Detail>
          <Detail label="Website">
            {partner.website ? (
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {partner.website}
              </a>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Contact person">{partner.contact_name}</Detail>
          <Detail label="Contact email">{partner.contact_email}</Detail>
          <Detail label="Contact phone">{empty(partner.contact_phone)}</Detail>
          <Detail label="About" className="sm:col-span-2 lg:col-span-3">
            <span className="whitespace-pre-line">{empty(partner.description)}</span>
          </Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}

/** Registration facts: status, provenance and the version every write must send. */
export function RegistrationCard({ partner }: { partner: Partner }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Status">
            <StatusBadge domain="partner" status={partner.status} />
          </Detail>
          <Detail label="Intake">{INTAKE_LABEL[partner.intake_path]}</Detail>
          <Detail label="Submitted for review">{formatDateTime(partner.submitted_at)}</Detail>
          <Detail label="Organization">{partner.organization_name}</Detail>
          <Detail label="Version">{partner.version}</Detail>
          <Detail label="Last updated">{formatDateTime(partner.updated_at)}</Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}

/**
 * What the status means for the reader right now. A rejection shows the reviewer's feedback
 * (latest_decision.reason), which is what the applicant must address before resubmitting.
 */
export function StatusCallout({
  partner,
  audience,
  action,
}: {
  partner: Partner;
  audience: "applicant" | "reviewer";
  action?: ReactNode;
}) {
  const decision = partner.latest_decision;
  if (partner.status === "rejected") {
    return (
      <Alert variant="destructive">
        <XCircle aria-hidden />
        <AlertTitle>Registration rejected</AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="whitespace-pre-line">
            {decision?.reason ?? "No feedback was recorded."}
          </p>
          <p>
            {audience === "applicant"
              ? "Update the business profile to address this feedback, then resubmit it for review."
              : "The applicant can edit the profile and resubmit it for a new review."}
          </p>
          {action}
        </AlertDescription>
      </Alert>
    );
  }
  if (partner.status === "pending") {
    return (
      <Alert>
        <Clock aria-hidden />
        <AlertTitle>
          {audience === "applicant" ? "Awaiting Aayulogic review" : "Awaiting your review"}
        </AlertTitle>
        <AlertDescription>
          Submitted {formatDateTime(partner.submitted_at)}.{" "}
          {audience === "applicant"
            ? "You can still correct the profile while it waits."
            : "Verify or reject the profile at its current version."}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <CheckCircle2 aria-hidden />
      <AlertTitle>Verified partner</AlertTitle>
      <AlertDescription>
        Verification is one publishing gate. It does not publish offers or grant commercial
        eligibility by itself.
      </AlertDescription>
    </Alert>
  );
}

type DecisionPages = InfiniteData<{ count: number; results: PartnerDecision[] }>;

/** Every verify/reject decision, newest first, with the version it was made on. */
export function DecisionHistoryCard({
  decisions,
}: {
  decisions: UseInfiniteQueryResult<DecisionPages>;
}) {
  const rows = decisions.data?.pages.flatMap((page) => page.results) ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision history</CardTitle>
        <CardDescription>Every verification decision, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {decisions.isPending ? (
          <ListSkeleton rows={2} />
        ) : decisions.isError ? (
          <ErrorState error={decisions.error} onRetry={() => void decisions.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={History} title="No decisions yet" className="py-8" />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Decided</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((decision) => (
                  <TableRow key={decision.id}>
                    <TableCell>
                      <StatusBadge domain="partner" status={decision.outcome} />
                    </TableCell>
                    <TableCell className="max-w-md whitespace-pre-line">{decision.reason}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {decision.partner_version}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(decision.decided_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {decisions.hasNextPage ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => void decisions.fetchNextPage()}
              disabled={decisions.isFetchingNextPage}
            >
              {decisions.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
