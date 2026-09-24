"use client";

import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
import { StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import { usePartnerApplications, type ApplicationStatus } from "../api/queries";

const FILTERS: { value: ApplicationStatus | undefined; label: string }[] = [
  { value: "submitted", label: "To review" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: undefined, label: "All" },
];

function parseStatus(value: string | null): ApplicationStatus | undefined {
  if (value === "all") return undefined;
  return FILTERS.find((filter) => filter.value === value)?.value ?? "submitted";
}

/** The status filter lives in the URL; the default view is the review queue. */
export function ApplicationsQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = parseStatus(searchParams.get("status"));
  const applications = usePartnerApplications(status);
  const rows = applications.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter.label}
            size="sm"
            variant={status === filter.value ? "secondary" : "ghost"}
            aria-pressed={status === filter.value}
            onClick={() => router.replace(`${pathname}?status=${filter.value ?? "all"}`)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {applications.isPending ? (
        <ListSkeleton />
      ) : applications.isError ? (
        <ErrorState error={applications.error} onRetry={() => void applications.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No applications" />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Intake</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((application) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/admin/partner-applications/${application.id}`}
                        className="font-medium hover:underline"
                      >
                        {application.details.display_name}
                      </Link>
                      <span className="text-muted-foreground text-xs">
                        {application.details.legal_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge domain="application" status={application.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {application.intake === "assisted" ? "Assisted" : "Self-service"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(application.submitted_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {applications.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void applications.fetchNextPage()}
            disabled={applications.isFetchingNextPage}
          >
            {applications.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
