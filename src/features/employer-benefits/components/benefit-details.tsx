"use client";

import { Archive, CalendarClock, EyeOff, FilePen, Gift, PauseCircle } from "lucide-react";
import type { ReactNode } from "react";

import { RichText } from "@/design-system/components/rich-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Badge } from "@/design-system/primitives/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import type { DisplayStatus } from "@/features/offers/api/queries";
import { AVAILABILITY_LABEL } from "@/features/offers/components/offer-details";
import { benefitSummary } from "@/features/offers/schemas/benefit-value";
import { Detail, DetailList } from "@/shared/components/details";
import { formatDateTime } from "@/shared/lib/format";

import type { Benefit } from "../api/queries";
import { benefitVersion } from "../schemas/benefit";

export { validity } from "@/features/offers/components/offer-details";

export const BENEFIT_STATUSES: readonly { value: DisplayStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
  { value: "paused", label: "Paused" },
  { value: "suspended", label: "Suspended" },
  { value: "retired", label: "Retired" },
];

export function benefitStatusFrom(value: string | null): DisplayStatus | null {
  return BENEFIT_STATUSES.find((option) => option.value === value)?.value ?? null;
}

// --- Lifecycle guards: mirror the API's conflicts; the API still decides ---------------

const isRetired = (benefit: Benefit) => benefit.availability === "retired";
export const isSuspended = (benefit: Benefit) => Boolean(benefit.suspended_at);
/** Retirement is final; a live benefit's edit publishes a new version at once. */
export const isEditable = (benefit: Benefit) => !isRetired(benefit);
export const isLive = (benefit: Benefit) => benefit.current_version !== null;
export const isPublishable = (benefit: Benefit) =>
  !isRetired(benefit) && !isLive(benefit) && benefit.working_version?.state === "draft";
export const isUnpublishable = (benefit: Benefit) => !isRetired(benefit) && isLive(benefit);
export const isPausable = (benefit: Benefit) => benefit.availability === "enabled";
export const isResumable = (benefit: Benefit) => benefit.availability === "paused";
export const isRetirable = (benefit: Benefit) => !isRetired(benefit);

export function usageLimit(max: number): string {
  return max === 1 ? "Once per employee" : `${max} times per employee`;
}

/** The benefit's lifetime limit from the terms shown, when there are any. */
export function benefitLimit(benefit: Benefit): number | null {
  return benefitVersion(benefit)?.benefit_policy?.max_claims_per_beneficiary ?? null;
}

/**
 * Marks a Company Benefit so it is never mistaken for a marketplace offer: it comes from the
 * employer, not a partner, and nothing is bought.
 */
export function CompanyBenefitBadge() {
  return (
    <Badge intent="outline">
      <Gift aria-hidden />
      Company benefit
    </Badge>
  );
}

/** Only a badge: employees see the benefit only while every availability rule holds. */
export function AvailabilityBadge({ benefit }: { benefit: Pick<Benefit, "visible_to_employees"> }) {
  return benefit.visible_to_employees ? (
    <Badge
      intent="success"
      title="Published, enabled, not suspended, inside its dates, and the Employer capacity is on"
    >
      Available to employees
    </Badge>
  ) : (
    <Badge intent="outline" title="At least one availability rule does not hold">
      <EyeOff aria-hidden />
      Hidden
    </Badge>
  );
}

export function BenefitContentCard({
  benefit,
  action,
}: {
  benefit: Benefit;
  action?: ReactNode;
}) {
  const version = benefitVersion(benefit);
  const policy = version?.benefit_policy;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Benefit</CardTitle>
          <CardDescription>
            {isLive(benefit)
              ? "Saving an edit publishes it at once as a new version; past uses keep the version they used."
              : "A draft; employees see it once you publish it."}
          </CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent>
        {version ? (
          <DetailList>
            <Detail label="Title">{version.title}</Detail>
            <Detail label="Headline">{version.headline}</Detail>
            <Detail label="Value">{benefitSummary(version.benefit)}</Detail>
            <Detail label="Valid from">{formatDateTime(version.valid_from)}</Detail>
            <Detail label="Valid until">
              {version.valid_until ? formatDateTime(version.valid_until) : "Open-ended"}
            </Detail>
            {policy ? (
              <Detail label="Usage limit">{usageLimit(policy.max_claims_per_beneficiary)}</Detail>
            ) : null}
            <Detail label="Audience">Own employees of {benefit.provider_organization.name}</Detail>
            <Detail label="Version">{version.number}</Detail>
            <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
              <RichText value={version.description} />
            </Detail>
            <Detail label="How to use it" className="sm:col-span-2 lg:col-span-3">
              {policy?.usage_rules ? <RichText value={policy.usage_rules} /> : "—"}
            </Detail>
            <Detail label="Terms and conditions" className="sm:col-span-2 lg:col-span-3">
              {version.terms ? <RichText value={version.terms} /> : "—"}
            </Detail>
          </DetailList>
        ) : (
          <p className="text-muted-foreground text-sm">No terms yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function LifecycleCard({ benefit }: { benefit: Benefit }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lifecycle</CardTitle>
        <CardDescription>
          Every change is recorded in the audit log. Usage counts are in the usage report.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Availability">{AVAILABILITY_LABEL[benefit.availability]}</Detail>
          <Detail label="Live version">
            {benefit.current_version ? benefit.current_version.number : "None"}
          </Detail>
          <Detail label="First published">
            {benefit.first_published_at ? formatDateTime(benefit.first_published_at) : "Not yet"}
          </Detail>
          <Detail label="Created">{formatDateTime(benefit.created_at)}</Detail>
          <Detail label="Last updated">{formatDateTime(benefit.updated_at)}</Detail>
          {benefit.suspended_at ? (
            <Detail label="Suspended">{formatDateTime(benefit.suspended_at)}</Detail>
          ) : null}
          {benefit.retired_at ? (
            <Detail label="Retired">{formatDateTime(benefit.retired_at)}</Detail>
          ) : null}
          <Detail label="Record version">{benefit.version}</Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}

/** Explains why employees can or cannot see the benefit, for its owner or a moderator. */
export function BenefitStatusCallout({
  benefit,
  audience,
}: {
  benefit: Benefit;
  audience: "employer" | "admin";
}) {
  if (isRetired(benefit)) {
    return (
      <Alert>
        <Archive aria-hidden />
        <AlertTitle>Retired</AlertTitle>
        <AlertDescription>
          Final: employees can no longer use it. Past uses stay in their history and the usage
          report.
        </AlertDescription>
      </Alert>
    );
  }
  if (isSuspended(benefit)) {
    return (
      <Alert variant="destructive">
        <PauseCircle aria-hidden />
        <AlertTitle>Suspended by Aayulogic</AlertTitle>
        <AlertDescription>
          <p>Employees cannot see or use it. Reason: {benefit.suspension_reason || "—"}</p>
          {audience === "employer" ? (
            <p>Editing, resuming or publishing does not lift it; only Aayulogic can reinstate it.</p>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }
  if (benefit.availability === "paused") {
    return (
      <Alert>
        <PauseCircle aria-hidden />
        <AlertTitle>Paused</AlertTitle>
        <AlertDescription>
          {audience === "employer"
            ? "Employees cannot see or use it until you resume it."
            : "The employer paused it; employees cannot see or use it."}
        </AlertDescription>
      </Alert>
    );
  }
  if (audience === "admin") return null;
  const version = benefitVersion(benefit);
  switch (benefit.display_status) {
    case "draft":
      return (
        <Alert>
          <FilePen aria-hidden />
          <AlertTitle>Draft</AlertTitle>
          <AlertDescription>
            Only your organization sees it. Publish it to offer it to your employees; there is no
            review.
          </AlertDescription>
        </Alert>
      );
    case "scheduled":
      return (
        <Alert>
          <CalendarClock aria-hidden />
          <AlertTitle>Scheduled</AlertTitle>
          <AlertDescription>
            Published. Employees see it from{" "}
            {version ? formatDateTime(version.valid_from) : "its start date"}.
          </AlertDescription>
        </Alert>
      );
    case "expired":
      return (
        <Alert>
          <CalendarClock aria-hidden />
          <AlertTitle>Expired</AlertTitle>
          <AlertDescription>
            Its end date passed, so employees no longer see it. Edit the end date to offer it
            again.
          </AlertDescription>
        </Alert>
      );
    default:
      return null;
  }
}
