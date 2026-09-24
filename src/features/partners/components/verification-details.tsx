import { CheckCircle2, Circle, FileText, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Detail, DetailList } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { cn } from "@/shared/lib/cn";
import { formatDateTime } from "@/shared/lib/format";

import type { PartnerRequirement, PartnerVerification } from "../api/queries";

const NOT_YET = "—";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Governance's requirements evaluated against the Partner. "Supplied" means the information is
 * present, not that a reviewer has accepted it.
 */
export function RequirementsList({
  requirements,
}: {
  requirements: readonly PartnerRequirement[];
}) {
  if (requirements.length === 0) {
    return <p className="text-muted-foreground text-sm">No requirements apply.</p>;
  }
  return (
    <ul className="space-y-2 text-sm" aria-label="Verification requirements">
      {requirements.map((requirement) => (
        <li key={requirement.code} className="flex items-start gap-2">
          {requirement.satisfied ? (
            <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <span className={cn(!requirement.satisfied && "text-muted-foreground")}>
            {requirement.description}
            <span className="sr-only">
              {requirement.satisfied ? " (supplied)" : " (still needed)"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function outstandingCount(requirements: readonly PartnerRequirement[]): number {
  return requirements.filter((requirement) => !requirement.satisfied).length;
}

/**
 * Verification status, requirements and documents. ``actions`` renders in the header (review
 * decisions); ``onRemoveDocument`` offers removal while the documents can still change.
 */
export function VerificationCard({
  verification,
  actions,
  onRemoveDocument,
}: {
  verification: PartnerVerification;
  actions?: ReactNode;
  onRemoveDocument?: (document: PartnerVerification["documents"][number]) => void;
}) {
  const outstanding = outstandingCount(verification.requirements);
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            Verification
            <StatusBadge domain="partnerVerification" status={verification.verification_status} />
          </CardTitle>
          <CardDescription>
            Aayulogic verifies every Partner before it can take part in the marketplace.
          </CardDescription>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <DetailList>
          <Detail label="Submitted">
            {verification.submitted_at ? formatDateTime(verification.submitted_at) : NOT_YET}
          </Detail>
          <Detail label="Review started">
            {verification.review_started_at
              ? formatDateTime(verification.review_started_at)
              : NOT_YET}
          </Detail>
          <Detail label="Decision applied">
            {verification.decision_applied_at
              ? formatDateTime(verification.decision_applied_at)
              : NOT_YET}
          </Detail>
          {verification.review_note ? (
            <Detail label="Note from Aayulogic" className="sm:col-span-2 lg:col-span-3">
              {verification.review_note}
            </Detail>
          ) : null}
        </DetailList>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            Requirements
            {outstanding > 0 ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                · {outstanding} outstanding
              </span>
            ) : null}
          </h3>
          <RequirementsList requirements={verification.requirements} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Documents</h3>
          {verification.documents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No documents uploaded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {verification.documents.map((document) => (
                <li key={document.id} className="flex items-start gap-2">
                  <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{document.file_name}</p>
                    <p className="text-muted-foreground text-xs">
                      {document.document_type} · {formatBytes(document.size_bytes)} · uploaded{" "}
                      {formatDateTime(document.uploaded_at)}
                    </p>
                  </div>
                  {onRemoveDocument ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove document ${document.file_name}`}
                      onClick={() => onRemoveDocument(document)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
