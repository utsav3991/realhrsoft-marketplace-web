"use client";

import { ClipboardCheck, Plus, Search, Star, Tag } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { SOURCE_LABEL } from "@/features/partners/components/partner-details";
import { OfferAdminPermission, useCan } from "@/shared/authorization";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDate } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { PartnerFilter } from "@/features/partners/components/partner-filter";
import { OrganizationFilter } from "@/features/organizations/components/organization-filter";
import { isUuid } from "@/shared/api";

import {
  OFFER_SORTS,
  useOffers,
  type AcceptanceMode,
  type DisplayStatus,
  type OfferPostedVia,
  type PartnerSource,
} from "../api/queries";
import { benefitSummary } from "../schemas/benefit-value";
import { ACCEPTANCE_LABEL } from "../schemas/offer";
import { POSTED_VIA_LABEL, shownVersion, validity, VisibilityBadge } from "./offer-details";

const ALL = "all";
export const OFFER_STATUSES: readonly { value: DisplayStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "rejected", label: "Rejected" },
  { value: "retracted", label: "Retracted" },
  { value: "expired", label: "Expired" },
  { value: "paused", label: "Paused" },
  { value: "suspended", label: "Suspended" },
  { value: "retired", label: "Retired" },
];
const SOURCES = Object.keys(SOURCE_LABEL) as PartnerSource[];
const POSTED_VIA: readonly OfferPostedVia[] = ["partner_portal", "admin_on_behalf"];
const ACCEPTANCE_MODES = Object.keys(ACCEPTANCE_LABEL) as AcceptanceMode[];

const uuidParam = (value: string | null) => (value && isUuid(value) ? value : null);

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.find((candidate) => candidate === value) ?? null;
}

/** Filters and search live in the URL, so the review queue can be shared and reloaded. */
export function OffersDirectory() {
  const { searchParams, set } = useUrlParams();
  const search = searchParams.get("search") ?? "";
  const status = oneOf(
    searchParams.get("status"),
    OFFER_STATUSES.map((s) => s.value),
  );
  const source = oneOf(searchParams.get("source"), SOURCES);
  const postedVia = oneOf(searchParams.get("posted_via"), POSTED_VIA);
  const featured = searchParams.get("featured") === "true" ? true : null;
  const inReview = searchParams.get("in_review") === "true" ? true : null;
  const acceptanceMode = oneOf(searchParams.get("acceptance_mode"), ACCEPTANCE_MODES);
  const partnerId = uuidParam(searchParams.get("partner_id"));
  const organizationId = uuidParam(searchParams.get("organization_id"));
  const [draft, setDraft] = useState(search);
  const sort = useSortParam(OFFER_SORTS);
  const paging = usePageParam();
  const offers = useOffers(
    {
      search,
      status,
      inReview,
      acceptanceMode,
      source,
      postedVia,
      featured,
      partnerId,
      organizationId,
      ordering: sort.value,
    },
    paging,
  );
  const canCreate = useCan(OfferAdminPermission.OFFER_CREATE);
  const canViewCategories = useCan(OfferAdminPermission.CATEGORY_VIEW);

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParam("search", draft.trim() || null);
  }

  const columns: DataTableColumns<RowOf<typeof offers>> = [
    {
      id: "offer",
      header: "Offer",
      cell: (offer) => {
        const version = shownVersion(offer);
        return (
          <>
            <Link href={`/admin/offers/${offer.id}`} className="font-medium hover:underline">
              {version?.title ?? "Untitled offer"}
            </Link>
            {offer.is_featured ? (
              <Star className="text-primary ml-1 inline size-3.5" aria-label="Featured" />
            ) : null}
            <p className="text-muted-foreground text-xs">
              {version ? benefitSummary(version.benefit) : null}
            </p>
          </>
        );
      },
    },
    {
      id: "partner",
      header: "Partner",
      sortKey: "partner",
      cell: (offer) =>
        offer.partner ? (
          <>
            <p>{offer.partner.business_name}</p>
            <p className="text-muted-foreground text-xs">{SOURCE_LABEL[offer.partner.source]}</p>
          </>
        ) : (
          "—"
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (offer) => (
        <span className="flex flex-wrap items-center gap-1">
          <StatusBadge domain="offer" status={offer.display_status} />
          {offer.working_version?.state === "in_review" && offer.display_status !== "in_review" ? (
            <StatusBadge domain="offerVersion" status="in_review" />
          ) : null}
        </span>
      ),
    },
    {
      id: "employees",
      header: "Employees",
      className: "hidden md:table-cell",
      cell: (offer) => <VisibilityBadge offer={offer} />,
    },
    {
      id: "valid",
      header: "Valid",
      cellClassName: "text-muted-foreground",
      cell: (offer) => {
        const version = shownVersion(offer);
        return version ? validity(version.valid_from, version.valid_until) : "—";
      },
    },
    {
      id: "updated",
      header: "Updated",
      sortKey: "updated_at",
      className: "hidden xl:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (offer) => formatDate(offer.updated_at),
    },
    {
      id: "posted-via",
      header: "Posted via",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (offer) => POSTED_VIA_LABEL[offer.posted_via],
    },
  ];
  const filtered = Boolean(
    search ||
      status ||
      inReview ||
      acceptanceMode ||
      source ||
      postedVia ||
      featured ||
      partnerId ||
      organizationId,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={onSearch} role="search" className="flex w-full max-w-sm gap-2">
            <Input
              type="search"
              maxLength={255}
              placeholder="Search title, headline or partner"
              aria-label="Search offers by title, headline or partner name"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button type="submit" variant="outline" size="icon" aria-label="Search">
              <Search aria-hidden />
            </Button>
          </form>
          <Select
            value={status ?? ALL}
            onValueChange={(value) => setParam("status", value === ALL ? null : value)}
          >
            <SelectTrigger className="w-48" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {OFFER_STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PartnerFilter value={partnerId} onChange={(id) => setParam("partner_id", id)} />
          <OrganizationFilter
            label="Audience organization"
            allLabel="Any audience organization"
            value={organizationId}
            onChange={(id) => setParam("organization_id", id)}
          />
          <Select
            value={source ?? ALL}
            onValueChange={(value) => setParam("source", value === ALL ? null : value)}
          >
            <SelectTrigger className="w-52" aria-label="Filter by partner type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any partner type</SelectItem>
              {SOURCES.map((option) => (
                <SelectItem key={option} value={option}>
                  {SOURCE_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={postedVia ?? ALL}
            onValueChange={(value) => setParam("posted_via", value === ALL ? null : value)}
          >
            <SelectTrigger className="w-48" aria-label="Filter by how it was posted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Posted any way</SelectItem>
              {POSTED_VIA.map((option) => (
                <SelectItem key={option} value={option}>
                  {POSTED_VIA_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={acceptanceMode ?? ALL}
            onValueChange={(value) => setParam("acceptance_mode", value === ALL ? null : value)}
          >
            <SelectTrigger className="w-56" aria-label="Filter by claim acceptance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any claim acceptance</SelectItem>
              {ACCEPTANCE_MODES.map((option) => (
                <SelectItem key={option} value={option}>
                  {ACCEPTANCE_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={inReview ? "secondary" : "ghost"}
            aria-pressed={inReview === true}
            onClick={() => setParam("in_review", inReview ? null : "true")}
          >
            <ClipboardCheck aria-hidden />
            Awaiting review
          </Button>
          <Button
            variant={featured ? "secondary" : "ghost"}
            aria-pressed={featured === true}
            onClick={() => setParam("featured", featured ? null : "true")}
          >
            <Star aria-hidden />
            Featured
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewCategories ? (
            <Button asChild variant="outline">
              <Link href="/admin/offer-categories">
                <Tag aria-hidden />
                Categories
              </Link>
            </Button>
          ) : null}
          {canCreate ? (
            <Button asChild>
              <Link href="/admin/offers/new">
                <Plus aria-hidden />
                Post offer
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <QueryDataTable
        aria-label="Offers"
        query={offers}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(offer) => offer.id}
        empty={
          <EmptyState
            icon={Tag}
            title={inReview ? "Nothing awaiting review" : "No offers found"}
            description={filtered ? "Try different filters." : undefined}
          />
        }
      />
    </div>
  );
}
