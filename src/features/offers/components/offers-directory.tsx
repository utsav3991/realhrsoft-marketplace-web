"use client";

import { Plus, Search, Star, Tag } from "lucide-react";
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
  type OfferStatus,
  type PartnerSource,
  type PostedVia,
} from "../api/queries";
import { POSTED_VIA_LABEL, VisibilityBadge } from "./offer-details";

const ALL = "all";
export const OFFER_STATUSES: readonly { value: OfferStatus; label: string }[] = [
  { value: "pending_review", label: "Pending review" },
  { value: "draft", label: "Draft" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "rejected", label: "Rejected" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
];
const SOURCES = Object.keys(SOURCE_LABEL) as PartnerSource[];
const POSTED_VIA = Object.keys(POSTED_VIA_LABEL) as PostedVia[];

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
  const partnerId = uuidParam(searchParams.get("partner_id"));
  const organizationId = uuidParam(searchParams.get("organization_id"));
  const [draft, setDraft] = useState(search);
  const sort = useSortParam(OFFER_SORTS);
  const paging = usePageParam();
  const offers = useOffers(
    {
      search,
      status,
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
      sortKey: "title",
      cell: (offer) => (
        <>
          <Link href={`/admin/offers/${offer.id}`} className="font-medium hover:underline">
            {offer.title}
          </Link>
          {offer.is_featured ? (
            <Star className="text-primary ml-1 inline size-3.5" aria-label="Featured" />
          ) : null}
          <p className="text-muted-foreground text-xs">{offer.category.name}</p>
        </>
      ),
    },
    {
      id: "partner",
      header: "Partner",
      sortKey: "partner",
      cell: (offer) => (
        <>
          <p>{offer.partner.business_name}</p>
          <p className="text-muted-foreground text-xs">{SOURCE_LABEL[offer.partner.source]}</p>
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (offer) => <StatusBadge domain="offer" status={offer.display_status} />,
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
      sortKey: "valid_from",
      cellClassName: "text-muted-foreground",
      cell: (offer) => `${formatDate(offer.valid_from)} – ${formatDate(offer.valid_until)}`,
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
    search || status || source || postedVia || featured || partnerId || organizationId,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={onSearch} role="search" className="flex w-full max-w-sm gap-2">
            <Input
              type="search"
              maxLength={255}
              placeholder="Search title, benefit or partner"
              aria-label="Search offers by title, benefit or partner name"
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
            title={status === "pending_review" ? "Nothing awaiting review" : "No offers found"}
            description={filtered ? "Try different filters." : undefined}
          />
        }
      />
    </div>
  );
}
