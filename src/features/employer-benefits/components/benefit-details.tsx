"use client";

import { CalendarClock, EyeOff, Gift, PauseCircle } from "lucide-react";
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
import { Detail, DetailList } from "@/shared/components/details";
import { formatDate, formatDateTime } from "@/shared/lib/format";

import type { Benefit, BenefitDisplayStatus } from "../api/queries";

export const BENEFIT_STATUSES: readonly { value: BenefitDisplayStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
  { value: "suspended", label: "Suspended" },
  { value: "retired", label: "Retired" },
];

export function benefitStatusFrom(value: string | null): BenefitDisplayStatus | null {
  return BENEFIT_STATUSES.find((option) => option.value === value)?.value ?? null;
}

/** A retired benefit is final; every other status can be edited (changes apply at once). */
export function isEditable(benefit: Benefit): boolean {
  return benefit.status !== "retired";
}

export function isPublishable(benefit: Benefit): boolean {
  return benefit.status === "draft";
}

export function isRetirable(benefit: Benefit): boolean {
  return benefit.status !== "retired";
}

export function usageLimit(max: number): string {
  return max === 1 ? "Once per employee" : `${max} times per employee`;
}

/** "1 Oct 2026 – 30 Sep 2027", or "From 1 Oct 2026" when open-ended. */
export function validity(validFrom: string, validUntil: string | null): string {
  return validUntil
    ? `${formatDate(validFrom)} – ${formatDate(validUntil)}`
    : `From ${formatDate(validFrom)}`;
}

/**
 * Marks a Company Benefit so it is never mistaken for a marketplace offer (EMP-02): it comes
 * from the employer, not a partner, and nothing is bought.
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
export function AvailabilityBadge({ benefit }: { benefit: Benefit }) {
  return benefit.available_to_employees ? (
    <Badge intent="success" title="Active, inside its dates, and the Employer capacity is on">
      Available to employees
    </Badge>
  ) : (
    <Badge intent="outline" title="Not active, outside its dates, or the Employer capacity is off">
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
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Benefit</CardTitle>
          <CardDescription>
            Edits apply at once, also to employees who can already see it.
          </CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Title">{benefit.title}</Detail>
          <Detail label="Valid from">{formatDateTime(benefit.valid_from)}</Detail>
          <Detail label="Valid until">
            {benefit.valid_until ? formatDateTime(benefit.valid_until) : "Open-ended"}
          </Detail>
          <Detail label="Usage limit">{usageLimit(benefit.max_claims_per_employee)}</Detail>
          <Detail label="Audience">Own employees of {benefit.organization_name}</Detail>
          <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
            <RichText value={benefit.description} />
          </Detail>
          <Detail label="How to use it" className="sm:col-span-2 lg:col-span-3">
            {benefit.usage_rules ? <RichText value={benefit.usage_rules} /> : "—"}
          </Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}

export function LifecycleCard({ benefit }: { benefit: Benefit }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lifecycle</CardTitle>
        <CardDescription>Every change is recorded in the audit log.</CardDescription>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Claims so far">{benefit.claim_count}</Detail>
          <Detail label="Created">{formatDateTime(benefit.created_at)}</Detail>
          <Detail label="Last updated">{formatDateTime(benefit.updated_at)}</Detail>
          <Detail label="Published">
            {benefit.published_at ? formatDateTime(benefit.published_at) : "Not yet"}
          </Detail>
          {benefit.suspended_at ? (
            <Detail label="Suspended">{formatDateTime(benefit.suspended_at)}</Detail>
          ) : null}
          {benefit.retired_at ? (
            <Detail label="Retired">{formatDateTime(benefit.retired_at)}</Detail>
          ) : null}
          <Detail label="Version">{benefit.version}</Detail>
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
  if (benefit.status === "suspended") {
    return (
      <Alert variant="destructive">
        <PauseCircle aria-hidden />
        <AlertTitle>Suspended by Aayulogic</AlertTitle>
        <AlertDescription>
          <p>Employees cannot see or claim it. Reason: {benefit.suspension_reason || "—"}</p>
          {audience === "employer" ? (
            <p>You can still edit or retire it; only Aayulogic can reinstate it.</p>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }
  if (audience === "admin") return null;
  switch (benefit.display_status) {
    case "draft":
      return (
        <Alert>
          <Gift aria-hidden />
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
            Published. Employees see it from {formatDateTime(benefit.valid_from)}.
          </AlertDescription>
        </Alert>
      );
    case "expired":
      return (
        <Alert>
          <CalendarClock aria-hidden />
          <AlertTitle>Expired</AlertTitle>
          <AlertDescription>
            Its end date passed, so employees no longer see it. Extend the end date to offer it
            again.
          </AlertDescription>
        </Alert>
      );
    default:
      return null;
  }
}
