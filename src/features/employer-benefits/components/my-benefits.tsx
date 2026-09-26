"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Gift,
  History,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { RichText, richTextPreview } from "@/design-system/components/rich-text-editor";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable } from "@/shared/components/query-data-table";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";

import { useClaimBenefit } from "../api/mutations";
import {
  BENEFIT_CLAIM_SORTS,
  useMyBenefit,
  useMyBenefitClaims,
  useMyBenefits,
  type EmployeeBenefit,
} from "../api/queries";
import { CompanyBenefitBadge, usageLimit, validity } from "./benefit-details";

const isForbidden = (error: unknown) => error instanceof ApiError && error.isForbidden;

/** A 403 means the viewer is not an eligible employee; anything else is a plain error. */
function BenefitsErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}): ReactNode {
  if (isForbidden(error)) {
    return (
      <EmptyState
        icon={UserX}
        title="Company benefits are for employees"
        description="Your employer's benefits appear here once Aayulogic records your current employment. If you recently changed employer, ask your administrator."
      />
    );
  }
  return <ErrorState error={error} onRetry={onRetry} />;
}

function remaining(benefit: EmployeeBenefit): string {
  if (benefit.claims_remaining === 0) return "Limit reached";
  return benefit.max_claims_per_employee === 1
    ? "Not used yet"
    : `${benefit.claims_remaining} of ${benefit.max_claims_per_employee} uses left`;
}

/** E08: the employee's own employer's benefits, then their benefit history. */
export function MyBenefits() {
  const benefits = useMyBenefits();
  const rows = benefits.data?.pages.flatMap((page) => page.results) ?? [];
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {benefits.isPending ? (
          <ListSkeleton />
        ) : benefits.isError ? (
          <BenefitsErrorState error={benefits.error} onRetry={() => void benefits.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No company benefits right now"
            description="Benefits your employer offers you appear here while they are available."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((benefit) => (
              <BenefitCard key={benefit.id} benefit={benefit} />
            ))}
          </div>
        )}
        {benefits.hasNextPage ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => void benefits.fetchNextPage()}
              disabled={benefits.isFetchingNextPage}
            >
              {benefits.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </div>
      <ClaimHistory title="Your benefit history" />
    </div>
  );
}

function BenefitCard({ benefit }: { benefit: EmployeeBenefit }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CompanyBenefitBadge />
        </div>
        <p className="text-muted-foreground text-sm">From {benefit.organization_name}</p>
        <CardTitle className="text-lg">{benefit.title}</CardTitle>
        <CardDescription className="line-clamp-3">
          {richTextPreview(benefit.description)}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex flex-col items-stretch gap-3">
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden />
            {benefit.valid_until
              ? validity(benefit.valid_from, benefit.valid_until)
              : "No end date"}
          </span>
          <span>{remaining(benefit)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link
              href={`/marketplace/company-benefits/${benefit.id}`}
              aria-label={`View ${benefit.title}`}
            >
              Details
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <ClaimAction benefit={benefit} compact />
        </div>
      </CardFooter>
    </Card>
  );
}

function BackToBenefits() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/marketplace/company-benefits">
        <ArrowLeft aria-hidden />
        Company benefits
      </Link>
    </Button>
  );
}

export function MyBenefit({ benefitId }: { benefitId: string }) {
  const benefit = useMyBenefit(benefitId);

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
          <EmptyState
            icon={Gift}
            title="Benefit not available"
            description="It may have ended, or your employer no longer offers it."
          />
        ) : (
          <BenefitsErrorState error={benefit.error} onRetry={() => void benefit.refetch()} />
        )}
      </div>
    );
  }
  const data = benefit.data;
  return (
    <div className="space-y-6">
      <BackToBenefits />
      <PageHeader
        title={data.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <CompanyBenefitBadge />
            From {data.organization_name}
          </span>
        }
        actions={<ClaimAction benefit={data} />}
      />
      <Card>
        <CardHeader>
          <CardTitle>About this benefit</CardTitle>
          <CardDescription>
            Your employer offers it to its own employees. It is not a marketplace offer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Valid from">{formatDateTime(data.valid_from)}</Detail>
            <Detail label="Valid until">
              {data.valid_until ? formatDateTime(data.valid_until) : "No end date"}
            </Detail>
            <Detail label="Usage">
              {usageLimit(data.max_claims_per_employee)} · {remaining(data)}
            </Detail>
            <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
              <RichText value={data.description} />
            </Detail>
            <Detail label="How to use it" className="sm:col-span-2 lg:col-span-3">
              {data.usage_rules ? <RichText value={data.usage_rules} /> : "—"}
            </Detail>
          </DetailList>
        </CardContent>
      </Card>
      <ClaimHistory title="When you used it" benefitId={data.id} />
    </div>
  );
}

/**
 * Claiming is the use: there is no separate confirmation. Each attempt gets one
 * Idempotency-Key, reused if the same attempt is retried, so a retry never uses it twice.
 */
function ClaimAction({
  benefit,
  compact = false,
}: {
  benefit: EmployeeBenefit;
  compact?: boolean;
}) {
  const router = useRouter();
  const size = compact ? "sm" : "default";
  const claim = useClaimBenefit();
  const [open, setOpen] = useState(false);
  const idempotencyKey = useRef<string | null>(null);

  if (benefit.claims_remaining === 0) {
    return (
      <Badge intent="neutral">
        <CheckCircle2 aria-hidden />
        {benefit.max_claims_per_employee === 1 ? "Used" : "Limit reached"}
      </Badge>
    );
  }

  return (
    <>
      <Button
        size={size}
        // Cards are promotional; the benefit page keeps its single primary action.
        variant={compact ? "ink" : "default"}
        onClick={() => {
          idempotencyKey.current = crypto.randomUUID();
          setOpen(true);
        }}
      >
        <Gift aria-hidden />
        Use benefit
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Use ${benefit.title}?`}
        description={
          <span className="space-y-2">
            <span className="block">
              This records one use now; there is nothing to show or confirm later.{" "}
              {benefit.claims_remaining === 1
                ? "It is your last remaining use."
                : `You have ${benefit.claims_remaining} uses left.`}
            </span>
            {benefit.usage_rules ? (
              <span className="block">{richTextPreview(benefit.usage_rules)}</span>
            ) : null}
          </span>
        }
        confirmLabel="Use benefit"
        onConfirm={async () => {
          const key = idempotencyKey.current ?? crypto.randomUUID();
          idempotencyKey.current = key;
          await claim.mutateAsync({ benefitId: benefit.id, idempotencyKey: key });
          toast.success("Benefit used");
          if (compact) router.push(`/marketplace/company-benefits/${benefit.id}`);
        }}
      />
    </>
  );
}

/**
 * Benefit claims with the title and rules shown when claimed; one benefit's when given. History
 * stays readable after employment ends; a non-employee account (403) sees nothing here, since
 * the benefit list above already explains why.
 */
function ClaimHistory({ title, benefitId = null }: { title: string; benefitId?: string | null }) {
  const sort = useSortParam(BENEFIT_CLAIM_SORTS, "history_ordering");
  const paging = usePageParam("history_");
  const claims = useMyBenefitClaims(benefitId, sort.value, paging);
  if (claims.isError && isForbidden(claims.error)) return null;

  return (
    <section className="space-y-3" aria-labelledby="benefit-history">
      <h2 id="benefit-history" className="text-lg font-medium">
        {title}
      </h2>
      <QueryDataTable
        aria-labelledby="benefit-history"
        query={claims}
        sort={sort}
        paging={paging}
        rowKey={(claim) => claim.id}
        skeletonRows={2}
        empty={
          <EmptyState
            icon={History}
            title="Not used yet"
            description="Each time you use a company benefit it is listed here."
            className="py-8"
          />
        }
        columns={[
          {
            id: "used",
            header: "Used",
            sortKey: "claimed_at",
            cell: (claim) => formatDateTime(claim.claimed_at),
          },
          {
            id: "benefit",
            header: "Benefit",
            sortKey: "title",
            cell: (claim) => (
              <>
                <p className="font-medium">{claim.title}</p>
                <p className="text-muted-foreground text-xs">{claim.organization_name}</p>
              </>
            ),
          },
          {
            id: "how-to-use",
            header: "How to use it",
            cellClassName: "text-muted-foreground",
            cell: (claim) => richTextPreview(claim.usage_rules) || "—",
          },
        ]}
      />
    </section>
  );
}
