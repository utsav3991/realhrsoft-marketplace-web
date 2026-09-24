"use client";

import { Tag } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import type { Schemas } from "@/shared/api";
import { StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate } from "@/shared/lib/format";

import type { OfferStatus } from "../api/offers";
import { LiveBadge } from "./publication-panel";

type Offer = Schemas["OfferResponse"];

export const OFFER_FILTERS: { value: OfferStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "In review" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function parseOfferStatus(value: string | null): OfferStatus | undefined {
  return OFFER_FILTERS.find((filter) => filter.value === value)?.value;
}

interface InfiniteOffers {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
  data?: { pages: { items: Offer[] }[] };
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

/** Offer table shared by the Partner list and the moderation queue. */
export function OffersTable({
  offers,
  hrefFor,
  filter,
  onFilter,
  emptyTitle,
  action,
}: {
  offers: InfiniteOffers;
  hrefFor: (offer: Offer) => string;
  filter: OfferStatus | undefined;
  onFilter: (status: OfferStatus | undefined) => void;
  emptyTitle: string;
  action?: ReactNode;
}) {
  const rows = offers.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
          {OFFER_FILTERS.map((option) => (
            <Button
              key={option.label}
              size="sm"
              variant={filter === option.value ? "secondary" : "ghost"}
              aria-pressed={filter === option.value}
              onClick={() => onFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {action}
      </div>

      {offers.isPending ? (
        <ListSkeleton />
      ) : offers.isError ? (
        <ErrorState error={offers.error} onRetry={() => void offers.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Tag} title={emptyTitle} />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link href={hrefFor(offer)} className="font-medium hover:underline">
                        {offer.title}
                      </Link>
                      <span className="text-muted-foreground text-xs">{offer.category}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge domain="offer" status={offer.status} />
                  </TableCell>
                  <TableCell>
                    <LiveBadge publication={offer.publication} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(offer.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {offers.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void offers.fetchNextPage()}
            disabled={offers.isFetchingNextPage}
          >
            {offers.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Replaces the ?status= search param. */
export function useStatusParam(fallback?: OfferStatus) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("status");
  const status = raw === "all" ? undefined : (parseOfferStatus(raw) ?? fallback);
  return {
    status,
    setStatus: (next: OfferStatus | undefined) =>
      router.replace(`${pathname}?status=${next ?? "all"}`),
  };
}
