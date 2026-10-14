"use client";

import { CheckCircle2, Clock, History, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { RichText } from "@/design-system/components/rich-text-editor";
import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type ResultsQuery } from "@/shared/components/query-data-table";
import type { PageState } from "@/shared/hooks/use-page-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDateTime } from "@/shared/lib/format";

import type { IntakePath, Partner, PartnerDecision, PartnerSource } from "../api/queries";

export const INTAKE_LABEL: Record<IntakePath, string> = {
  self_service: "Self-service",
  assisted: "Assisted by Aayulogic",
  realhrsoft_sync: "Synchronized from RealHRSoft",
};

/** What kind of business the partner is; set by Aayulogic, independent of the intake path. */
export const SOURCE_LABEL: Record<PartnerSource, string> = {
  partner_organization: "Partner organization",
  external: "External partner",
  realhrsoft: "RealHRsoft partner",
};

export const SOURCE_HINT: Record<PartnerSource, string> = {
  partner_organization: "A business whose members use the Partner portal.",
  external: "No portal login; Aayulogic posts offers for it.",
  realhrsoft: "An organization that is also a RealHRsoft client.",
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
            {partner.description ? <RichText value={partner.description} /> : "—"}
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
          <Detail label="Partner type">{SOURCE_LABEL[partner.source]}</Detail>
          <Detail label="Submitted for review">{formatDateTime(partner.submitted_at)}</Detail>
          <Detail label="Organization">{partner.organization_name ?? "None (a client group)"}</Detail>
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
          <p className="whitespace-pre-line">{decision?.reason ?? "No feedback was recorded."}</p>
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

const DECISION_COLUMNS: DataTableColumns<PartnerDecision> = [
  {
    id: "outcome",
    header: "Outcome",
    cell: (decision) => <StatusBadge domain="partner" status={decision.outcome} />,
  },
  {
    id: "reason",
    header: "Reason",
    cellClassName: "max-w-md whitespace-pre-line",
    cell: (decision) => decision.reason,
  },
  {
    id: "version",
    header: "Version",
    cellClassName: "text-muted-foreground",
    cell: (decision) => decision.partner_version,
  },
  {
    id: "decided",
    header: "Decided",
    cellClassName: "text-muted-foreground",
    cell: (decision) => formatDateTime(decision.decided_at),
  },
];

/** Every verify/reject decision, newest first, with the version it was made on. */
export function DecisionHistoryCard({
  decisions,
  paging,
}: {
  decisions: ResultsQuery<PartnerDecision>;
  paging: PageState;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision history</CardTitle>
        <CardDescription>Every verification decision, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <QueryDataTable
          aria-label="Decision history"
          query={decisions}
          paging={paging}
          columns={DECISION_COLUMNS}
          rowKey={(decision) => decision.id}
          skeletonRows={2}
          className="rounded-lg"
          empty={<EmptyState icon={History} title="No decisions yet" className="py-8" />}
        />
      </CardContent>
    </Card>
  );
}
