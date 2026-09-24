"use client";

import { ArrowLeft, Archive, Pencil, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { useSelectedOrganizationId } from "@/shared/auth";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError, type Schemas } from "@/shared/api";
import { EmployerPermission, useCanInOrganization } from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Detail, DetailList } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import { useBenefit, usePublishBenefit, useRetireBenefit, useUpdateBenefit } from "../api/benefits";
import { benefitBody, benefitValues } from "../schemas/benefit";
import { BenefitForm } from "./benefit-form";

type Benefit = Schemas["BenefitResponse"];

function BackToBenefits() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/employer">
        <ArrowLeft aria-hidden />
        Company benefits
      </Link>
    </Button>
  );
}

export function BenefitDetail({ benefitId }: { benefitId: string }) {
  const organizationId = useSelectedOrganizationId();
  const benefit = useBenefit(organizationId, benefitId);

  if (benefit.isPending) {
    return (
      <div className="space-y-6">
        <BackToBenefits />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (benefit.isError) {
    return (
      <div className="space-y-6">
        <BackToBenefits />
        {benefit.error instanceof ApiError && benefit.error.isNotFound ? (
          <EmptyState title="Benefit not found" />
        ) : (
          <ErrorState error={benefit.error} onRetry={() => void benefit.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedBenefit organizationId={organizationId} benefit={benefit.data} />;
}

function LoadedBenefit({ organizationId, benefit }: { organizationId: string; benefit: Benefit }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState<"publish" | "retire" | null>(null);
  const update = useUpdateBenefit(organizationId, benefit.id);
  const canEdit = useCanInOrganization(EmployerPermission.BENEFIT_EDIT);
  const canPublish = useCanInOrganization(EmployerPermission.BENEFIT_PUBLISH);
  const canRetire = useCanInOrganization(EmployerPermission.BENEFIT_RETIRE);
  const retired = benefit.status === "retired";

  return (
    <div className="space-y-6">
      <BackToBenefits />
      <PageHeader
        title={benefit.title}
        actions={
          <>
            {canEdit && !retired && !editing ? (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil aria-hidden />
                Edit
              </Button>
            ) : null}
            {canRetire && !retired ? (
              <Button variant="outline" onClick={() => setConfirming("retire")}>
                <Archive aria-hidden />
                Retire
              </Button>
            ) : null}
            {canPublish && benefit.status === "draft" ? (
              <Button onClick={() => setConfirming("publish")}>
                <Send aria-hidden />
                Publish
              </Button>
            ) : null}
          </>
        }
      />

      {editing ? (
        <BenefitForm
          title="Edit benefit"
          initial={benefitValues(benefit)}
          submitLabel="Save changes"
          actions={
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          }
          onSubmit={async (values) => {
            await update.mutateAsync({ ...benefitBody(values), version: benefit.version });
            toast.success("Benefit saved");
            setEditing(false);
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <Detail label="Status">
                <StatusBadge domain="benefit" status={benefit.status} />
              </Detail>
              <Detail label="Audience">Your organization&apos;s employees</Detail>
              <Detail label="Uses per employee">
                {benefit.usage_limit_per_employee ?? "No limit"}
              </Detail>
              <Detail label="Valid from">
                {benefit.valid_from ? formatDateTime(benefit.valid_from) : "Immediately"}
              </Detail>
              <Detail label="Valid until">
                {benefit.valid_until ? formatDateTime(benefit.valid_until) : "No end date"}
              </Detail>
              <Detail label="Published">
                {benefit.published_at ? formatDateTime(benefit.published_at) : "—"}
              </Detail>
              <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
                <span className="whitespace-pre-line">{benefit.description}</span>
              </Detail>
              <Detail label="Terms" className="sm:col-span-2 lg:col-span-3">
                <span className="whitespace-pre-line">{benefit.terms ?? "—"}</span>
              </Detail>
            </DetailList>
          </CardContent>
        </Card>
      )}

      <TransitionDialog
        organizationId={organizationId}
        benefit={benefit}
        action={confirming}
        onClose={() => setConfirming(null)}
      />
    </div>
  );
}

const COPY = {
  publish: {
    title: "Publish this benefit?",
    description: "It becomes visible to your organization's employees. You can retire it later.",
    confirm: "Publish",
  },
  retire: {
    title: "Retire this benefit?",
    description: "Employees stop seeing it. A retired benefit cannot be edited or republished.",
    confirm: "Retire",
  },
} as const;

/** Employer-controlled transitions; no Aayulogic approval (ADR-014). */
function TransitionDialog({
  organizationId,
  benefit,
  action,
  onClose,
}: {
  organizationId: string;
  benefit: Benefit;
  action: "publish" | "retire" | null;
  onClose: () => void;
}) {
  const publish = usePublishBenefit(organizationId, benefit.id);
  const retire = useRetireBenefit(organizationId, benefit.id);
  const copy = COPY[action ?? "publish"];

  return (
    <ConfirmDialog
      open={action !== null}
      onOpenChange={(open) => !open && onClose()}
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirm}
      destructive={action === "retire"}
      onConfirm={async () => {
        if (action === "publish") await publish.mutateAsync({ version: benefit.version });
        else await retire.mutateAsync({ version: benefit.version });
        toast.success(action === "publish" ? "Benefit published" : "Benefit retired");
      }}
    />
  );
}
