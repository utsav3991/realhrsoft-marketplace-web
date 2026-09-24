"use client";

import { Handshake, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import { isUuid } from "@/shared/api";
import { OrganizationAdminPermission, useCan } from "@/shared/authorization";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { STATUS_DEFINITIONS, StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate } from "@/shared/lib/format";

import { useAssistedRegistration } from "../api/mutations";
import {
  OPERATIONAL_STATUSES,
  PARTNER_SORTS,
  usePartners,
  VERIFICATION_STATUSES,
  type PartnerSearch,
  type PartnerSort,
} from "../api/queries";

const ASSISTED_FIELDS = [
  {
    name: "applicant_user_id",
    label: "Applicant user ID",
    kind: "uuid",
    hint: "The existing account that will complete and submit the registration.",
  },
  { name: "legal_name", label: "Legal business name", maxLength: 200 },
  { name: "display_name", label: "Display name", maxLength: 150 },
] as const;

// Radix Select cannot hold an empty value, so "any status" has its own sentinel.
const ANY = "any";

const VIEWS = [
  { value: "all", label: "All partners" },
  { value: "verified", label: "Verified" },
] as const;

const SORT_LABELS: Record<PartnerSort, string> = {
  "-created_at": "Newest first",
  created_at: "Oldest first",
};

function pick<T extends string>(options: readonly T[], value: string | null): T | undefined {
  return options.find((option) => option === value);
}

/** Reads the URL into a search. Unknown values fall back to the defaults rather than erroring. */
export function parsePartnerSearch(params: URLSearchParams): PartnerSearch {
  const organizationId = params.get("organization_id");
  return {
    verifiedOnly: params.get("view") === "verified",
    search: params.get("q")?.trim() ?? "",
    verificationStatus: pick(VERIFICATION_STATUSES, params.get("verification_status")),
    operationalStatus: pick(OPERATIONAL_STATUSES, params.get("operational_status")),
    organizationId: organizationId && isUuid(organizationId) ? organizationId : undefined,
    sort: pick(PARTNER_SORTS, params.get("sort")) ?? "-created_at",
  };
}

/** Search, filters, sort and the verified view live in the URL; pages follow the keyset cursor. */
export function PartnersDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parsePartnerSearch(new URLSearchParams(searchParams));
  const [draft, setDraft] = useState(filters.search);
  const [assisting, setAssisting] = useState(false);
  const partners = usePartners(filters);
  const assisted = useAssistedRegistration();
  const canAssist = useCan(OrganizationAdminPermission.APPLICATION_CREATE);
  const rows = partners.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered =
    filters.search !== "" ||
    filters.verificationStatus !== undefined ||
    filters.operationalStatus !== undefined ||
    filters.organizationId !== undefined;

  function updateUrl(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl({ q: draft.trim() || undefined });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="View" className="flex flex-wrap gap-1">
          {VIEWS.map((view) => {
            const active = (view.value === "verified") === filters.verifiedOnly;
            return (
              <Button
                key={view.value}
                size="sm"
                variant={active ? "secondary" : "ghost"}
                aria-pressed={active}
                onClick={() =>
                  updateUrl({ view: view.value === "verified" ? "verified" : undefined })
                }
              >
                {view.label}
              </Button>
            );
          })}
        </div>
        {canAssist ? (
          <Button onClick={() => setAssisting(true)}>
            <Plus aria-hidden />
            Assisted registration
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={onSearch} role="search" className="flex w-full max-w-sm gap-2">
          <Input
            type="search"
            maxLength={200}
            placeholder="Name or registration number"
            aria-label="Search partners by name or registration number"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" variant="outline" size="icon" aria-label="Search">
            <Search aria-hidden />
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {filters.verifiedOnly ? null : (
            <Select
              value={filters.verificationStatus ?? ANY}
              onValueChange={(value) =>
                updateUrl({ verification_status: value === ANY ? undefined : value })
              }
            >
              <SelectTrigger className="w-44" aria-label="Filter by verification status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any verification</SelectItem>
                {VERIFICATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_DEFINITIONS.partnerVerification[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={filters.operationalStatus ?? ANY}
            onValueChange={(value) =>
              updateUrl({ operational_status: value === ANY ? undefined : value })
            }
          >
            <SelectTrigger className="w-40" aria-label="Filter by operational status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any standing</SelectItem>
              {OPERATIONAL_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_DEFINITIONS.partnerOperational[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.sort}
            onValueChange={(value) =>
              updateUrl({ sort: value === "-created_at" ? undefined : value })
            }
          >
            <SelectTrigger className="w-36" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["-created_at", "created_at"] as const).map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filters.organizationId ? (
        <div className="flex items-center gap-2 text-sm">
          <Badge intent="outline">Organization {filters.organizationId}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateUrl({ organization_id: undefined })}
          >
            <X aria-hidden />
            Clear
          </Button>
        </div>
      ) : null}

      {partners.isPending ? (
        <ListSkeleton />
      ) : partners.isError ? (
        <ErrorState error={partners.error} onRetry={() => void partners.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No partners found"
          description={filtered ? "Try a different search or filter." : undefined}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Standing</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((partner) => (
                <TableRow key={partner.partner_id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/admin/partners/${partner.partner_id}`}
                        className="font-medium hover:underline"
                      >
                        {partner.display_name}
                      </Link>
                      <span className="text-muted-foreground text-xs">
                        {partner.legal_business_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      domain="partnerVerification"
                      status={partner.verification_status}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge domain="partnerOperational" status={partner.operational_status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      domain="marketplaceEligibility"
                      status={partner.marketplace_eligible ? "eligible" : "ineligible"}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(partner.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FieldsDialog
        open={assisting}
        onOpenChange={setAssisting}
        title="Assisted registration"
        description="Registers a Partner on behalf of an existing account. The applicant then adds contacts and locations and submits it; granting them the Partner applicant role is a separate step."
        confirmLabel="Register Partner"
        fields={ASSISTED_FIELDS}
        onConfirm={async ({ applicant_user_id, legal_name, display_name, reason }) => {
          const { id } = await assisted.mutateAsync({
            applicant_user_id: applicant_user_id ?? "",
            legal_name: legal_name ?? "",
            display_name: display_name ?? "",
            reason,
          });
          toast.success(`Registered ${display_name ?? "Partner"}`);
          router.push(`/admin/partners/${id}`);
        }}
      />

      {partners.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void partners.fetchNextPage()}
            disabled={partners.isFetchingNextPage}
          >
            {partners.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
