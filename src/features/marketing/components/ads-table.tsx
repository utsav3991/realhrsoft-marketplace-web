"use client";

import { Megaphone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { formatDate } from "@/shared/lib/format";

import {
  AD_SORTS,
  useAds,
  type AdDisplayStatus,
  type AdFilters,
  type Workspace,
} from "../api/queries";
import { creativeView, CREATIVE_LABEL } from "../schemas/advertisement";
import { adHref, campaignHref, POSTED_VIA_LABEL } from "./ad-details";

export const AD_STATUSES: readonly { value: AdDisplayStatus; label: string }[] = [
  { value: "approved", label: "Approved" },
  { value: "in_review", label: "In review" },
  { value: "draft", label: "Draft" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "rejected", label: "Rejected" },
  { value: "campaign_inactive", label: "Campaign inactive" },
  { value: "paused", label: "Paused" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
];

/**
 * Advertisements matching `filters`, paged and sorted through the URL (`prefix` keeps a second
 * table on a page apart; only the directory sorts).
 */
export function AdsTable({
  workspace,
  filters,
  prefix = "",
  showCampaign = true,
  sortable = true,
  empty,
}: {
  workspace: Workspace;
  filters: Omit<AdFilters, "ordering">;
  prefix?: string;
  showCampaign?: boolean;
  sortable?: boolean;
  empty: ReactNode;
}) {
  const sort = useSortParam(AD_SORTS);
  const paging = usePageParam(prefix);
  const ads = useAds(workspace, { ...filters, ordering: sortable ? sort.value : null }, paging);
  const admin = workspace.kind === "admin";

  const columns: DataTableColumns<RowOf<typeof ads>> = [
    {
      id: "ad",
      header: "Advertisement",
      sortKey: "name",
      cell: (ad) => {
        const revision = ad.working_revision ?? ad.current_revision;
        return (
          <>
            <Link href={adHref(workspace, ad.id)} className="font-medium hover:underline">
              {ad.name}
            </Link>
            <p className="text-muted-foreground text-xs">
              {revision ? CREATIVE_LABEL[creativeView(revision).type] : "No content"}
            </p>
          </>
        );
      },
    },
    admin && {
      id: "owner",
      header: "Owner",
      cell: (ad) => ad.owner_organization.name,
    },
    showCampaign && {
      id: "campaign",
      header: "Campaign",
      className: "hidden md:table-cell",
      cell: (ad) => (
        <Link href={campaignHref(workspace, ad.campaign.id)} className="hover:underline">
          {ad.campaign.name}
        </Link>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (ad) => (
        <span className="flex flex-wrap items-center gap-1">
          <StatusBadge domain="advertisement" status={ad.display_status} />
          {ad.working_revision?.state === "in_review" && ad.display_status !== "in_review" ? (
            <StatusBadge domain="adRevision" status="in_review" />
          ) : null}
        </span>
      ),
    },
    {
      id: "placements",
      header: "Placements",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (ad) =>
        (ad.working_revision ?? ad.current_revision)?.slots.map((slot) => slot.name).join(", ") ||
        "—",
    },
    admin && {
      id: "posted-via",
      header: "Posted via",
      className: "hidden xl:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (ad) => POSTED_VIA_LABEL[ad.posted_via],
    },
    {
      id: "updated",
      header: "Updated",
      sortKey: "updated_at",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (ad) => formatDate(ad.updated_at),
    },
  ];

  return (
    <QueryDataTable
      aria-label="Advertisements"
      query={ads}
      columns={columns}
      sort={sortable ? sort : undefined}
      paging={paging}
      rowKey={(ad) => ad.id}
      empty={empty}
    />
  );
}

export function NoAds({ title, description }: { title: string; description?: string }) {
  return <EmptyState icon={Megaphone} title={title} description={description} />;
}
