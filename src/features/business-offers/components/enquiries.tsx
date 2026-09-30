"use client";

import { ArrowLeft, CheckCircle2, Inbox, Send, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { type DataTableColumns, type DataTableSort } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError, isUuid } from "@/shared/api";
import { useSelectedOrganizationId } from "@/shared/auth";
import {
  BusinessOfferPermission,
  OfferAdminPermission,
  OrganizationAdminPermission,
  useCan,
  useCanInOrganization,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type ResultsQuery } from "@/shared/components/query-data-table";
import { SearchField } from "@/shared/components/search-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam, type PageState } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDate, formatDateTime } from "@/shared/lib/format";

import { useCloseEnquiry } from "../api/mutations";
import {
  ENQUIRY_SORTS,
  useAdminEnquiries,
  useAdminEnquiry,
  useReceivedEnquiries,
  useReceivedEnquiry,
  useSentEnquiries,
  useSentEnquiry,
  type Enquiry,
  type EnquiryFilters,
  type EnquiryStatus,
} from "../api/queries";
import { CloseEnquiryDialog } from "./enquiry-dialogs";

const ALL = "all";
const STATUSES: readonly { value: EnquiryStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

/** Who reads the enquiry: the organization that sent it, the provider, or Aayulogic. */
type Reader = "sent" | "received" | "admin";

const DETAIL_PATH: Record<Reader, string> = {
  sent: "/business/enquiries",
  received: "/business/leads",
  admin: "/admin/business-enquiries",
};

/** Filters every enquiry list shares; they live in the URL. */
type EnquirySort = DataTableSort<(typeof ENQUIRY_SORTS)[number]>;

function useEnquiryFilters(): { filters: EnquiryFilters; sort: EnquirySort } {
  const { searchParams } = useUrlParams();
  const sort = useSortParam(ENQUIRY_SORTS);
  const offerId = searchParams.get("offer_id");
  return {
    sort,
    filters: {
      search: searchParams.get("search") ?? "",
      status: STATUSES.find((s) => s.value === searchParams.get("status"))?.value ?? null,
      offerId: offerId && isUuid(offerId) ? offerId : null,
      ordering: sort.value,
    },
  };
}

function EnquiryTable({
  reader,
  query,
  filters,
  sort,
  paging,
}: {
  reader: Reader;
  query: ResultsQuery<Enquiry>;
  filters: EnquiryFilters;
  sort: EnquirySort;
  paging: PageState;
}) {
  const { set } = useUrlParams();
  const href = (enquiry: Enquiry) => `${DETAIL_PATH[reader]}/${enquiry.id}`;
  const columns: DataTableColumns<Enquiry> = [
    reader === "sent"
      ? {
          id: "offer",
          header: "Offer",
          cell: (enquiry) => (
            <>
              <Link href={href(enquiry)} className="font-medium hover:underline">
                {enquiry.offer.title}
              </Link>
              <p className="text-muted-foreground text-xs">
                {enquiry.offer.provider_organization.name}
              </p>
            </>
          ),
        }
      : {
          id: "organization",
          header: "Organization",
          cell: (enquiry) => (
            <>
              <Link href={href(enquiry)} className="font-medium hover:underline">
                {enquiry.organization.name}
              </Link>
              <p className="text-muted-foreground text-xs">
                {reader === "admin"
                  ? `${enquiry.offer.title} · ${enquiry.offer.provider_organization.name}`
                  : enquiry.offer.title}
              </p>
            </>
          ),
        },
    {
      id: "contact",
      header: "Contact",
      className: "hidden md:table-cell",
      cell: (enquiry) => (
        <>
          <p>{enquiry.contact_name}</p>
          <p className="text-muted-foreground text-xs">{enquiry.contact_email}</p>
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (enquiry) => <StatusBadge domain="enquiry" status={enquiry.status} />,
    },
    {
      id: "sent",
      header: "Sent",
      sortKey: "created_at",
      cellClassName: "text-muted-foreground",
      cell: (enquiry) => formatDate(enquiry.created_at),
    },
    {
      id: "closed",
      header: "Closed",
      sortKey: "closed_at",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (enquiry) => (enquiry.closed_at ? formatDate(enquiry.closed_at) : "—"),
    },
  ];
  const filtered = Boolean(filters.search || filters.status || filters.offerId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          placeholder="Search offer, organization or contact"
          aria-label="Search enquiries by offer title, organization or contact name"
          className="max-w-sm"
        />
        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) => set({ status: value === ALL ? null : value })}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filters.offerId ? (
          <Badge intent="outline" className="gap-1.5 py-1.5 pr-1.5">
            One offer
            <button
              type="button"
              className="hover:bg-secondary rounded-full p-0.5"
              aria-label="Clear offer filter"
              onClick={() => set({ offer_id: null })}
            >
              <X aria-hidden />
            </button>
          </Badge>
        ) : null}
      </div>
      <QueryDataTable
        aria-label="Enquiries"
        query={query}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(enquiry) => enquiry.id}
        empty={
          <EmptyState
            icon={reader === "sent" ? Send : Inbox}
            title={filtered ? "No enquiries match" : "No enquiries yet"}
            description={
              filtered
                ? "Try different filters."
                : reader === "sent"
                  ? "Enquiries you send about other businesses' offers appear here."
                  : reader === "received"
                    ? "When another organization enquires about one of your business offers, it appears here."
                    : undefined
            }
          />
        }
      />
    </div>
  );
}

/** The selected organization's enquiries about other businesses' offers. */
export function SentEnquiries() {
  const organizationId = useSelectedOrganizationId();
  const { filters, sort } = useEnquiryFilters();
  const paging = usePageParam();
  const query = useSentEnquiries(organizationId, filters, paging);
  return <EnquiryTable reader="sent" query={query} filters={filters} sort={sort} paging={paging} />;
}

/** Enquiries about the selected organization's business offers: its leads. */
export function Leads() {
  const organizationId = useSelectedOrganizationId();
  const { filters, sort } = useEnquiryFilters();
  const paging = usePageParam();
  const query = useReceivedEnquiries(organizationId, filters, paging);
  return (
    <EnquiryTable reader="received" query={query} filters={filters} sort={sort} paging={paging} />
  );
}

/** Every organization's enquiries, for Aayulogic oversight. */
export function AdminEnquiries() {
  const { filters, sort } = useEnquiryFilters();
  const paging = usePageParam();
  const query = useAdminEnquiries(filters, paging);
  return <EnquiryTable reader="admin" query={query} filters={filters} sort={sort} paging={paging} />;
}

// --- One enquiry -----------------------------------------------------------------------

const BACK: Record<Reader, string> = {
  sent: "Sent enquiries",
  received: "Leads",
  admin: "Business enquiries",
};

function BackTo({ reader }: { reader: Reader }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href={DETAIL_PATH[reader]}>
        <ArrowLeft aria-hidden />
        {BACK[reader]}
      </Link>
    </Button>
  );
}

function EnquiryLoader({
  reader,
  query,
  children,
}: {
  reader: Reader;
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data?: Enquiry;
    refetch: () => unknown;
  };
  children: (enquiry: Enquiry) => ReactNode;
}) {
  if (query.isPending) {
    return (
      <div className="space-y-6">
        <BackTo reader={reader} />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="space-y-6">
        <BackTo reader={reader} />
        {query.error instanceof ApiError && query.error.isNotFound ? (
          <EmptyState icon={Inbox} title="Enquiry not found" />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )}
      </div>
    );
  }
  return <>{children(query.data)}</>;
}

/** The enquiry's facts: what was asked, by whom, how to reach them and how it ended. */
function EnquiryCard({ enquiry, offerLink }: { enquiry: Enquiry; offerLink: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enquiry</CardTitle>
        <CardDescription>
          About version {enquiry.offer.version_number}: {enquiry.offer.headline}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Offer">{offerLink}</Detail>
          <Detail label="Provider">{enquiry.offer.provider_organization.name}</Detail>
          <Detail label="From">{enquiry.organization.name}</Detail>
          <Detail label="Message" className="sm:col-span-2 lg:col-span-3">
            <span className="whitespace-pre-line">{enquiry.message}</span>
          </Detail>
          <Detail label="Contact">{enquiry.contact_name}</Detail>
          <Detail label="Email">
            <a href={`mailto:${enquiry.contact_email}`} className="text-primary hover:underline">
              {enquiry.contact_email}
            </a>
          </Detail>
          <Detail label="Phone">
            {enquiry.contact_phone ? (
              <a href={`tel:${enquiry.contact_phone}`} className="text-primary hover:underline">
                {enquiry.contact_phone}
              </a>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Sent">{formatDateTime(enquiry.created_at)}</Detail>
          {enquiry.closed_at ? (
            <Detail label="Closed">{formatDateTime(enquiry.closed_at)}</Detail>
          ) : null}
        </DetailList>
      </CardContent>
    </Card>
  );
}

/** A closed enquiry's outcome, in the provider's words. */
function ClosedCallout({ enquiry, reader }: { enquiry: Enquiry; reader: Reader }) {
  if (enquiry.status !== "closed") {
    return (
      <Alert>
        <Inbox aria-hidden />
        <AlertTitle>Open</AlertTitle>
        <AlertDescription>
          {reader === "sent"
            ? `${enquiry.offer.provider_organization.name} follows up with your contact and closes the enquiry when done.`
            : reader === "received"
              ? "Follow up with the contact, then close the enquiry with a note on the outcome."
              : "The provider follows up and closes it."}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <CheckCircle2 aria-hidden />
      <AlertTitle>Closed {enquiry.closed_at ? formatDateTime(enquiry.closed_at) : ""}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="whitespace-pre-line">{enquiry.closing_note || "No note was left."}</p>
        {reader === "sent" ? <p>Your organization may enquire about the offer again.</p> : null}
      </AlertDescription>
    </Alert>
  );
}

export function SentEnquiry({ enquiryId }: { enquiryId: string }) {
  const organizationId = useSelectedOrganizationId();
  const query = useSentEnquiry(organizationId, enquiryId);
  const canBrowse = useCanInOrganization(BusinessOfferPermission.CATALOGUE_VIEW);
  return (
    <EnquiryLoader reader="sent" query={query}>
      {(enquiry) => (
        <div className="space-y-6">
          <BackTo reader="sent" />
          <PageHeader
            title={enquiry.offer.title}
            description={`Enquiry to ${enquiry.offer.provider_organization.name}`}
            actions={<StatusBadge domain="enquiry" status={enquiry.status} />}
          />
          <ClosedCallout enquiry={enquiry} reader="sent" />
          <EnquiryCard
            enquiry={enquiry}
            offerLink={
              // The offer opens only while it is still live and available to the organization.
              canBrowse ? (
                <Link href={`/business/catalogue/${enquiry.offer.id}`} className="hover:underline">
                  {enquiry.offer.title}
                </Link>
              ) : (
                enquiry.offer.title
              )
            }
          />
        </div>
      )}
    </EnquiryLoader>
  );
}

export function Lead({ enquiryId }: { enquiryId: string }) {
  const organizationId = useSelectedOrganizationId();
  const query = useReceivedEnquiry(organizationId, enquiryId);
  const canClose = useCanInOrganization(BusinessOfferPermission.RECEIVED_ENQUIRY_MANAGE);
  const canViewOffers = useCanInOrganization(BusinessOfferPermission.OFFER_VIEW);
  const close = useCloseEnquiry(organizationId, enquiryId);
  const [closing, setClosing] = useState(false);
  return (
    <EnquiryLoader reader="received" query={query}>
      {(enquiry) => (
        <div className="space-y-6">
          <BackTo reader="received" />
          <PageHeader
            title={enquiry.organization.name}
            description={`Enquiry about ${enquiry.offer.title}`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge domain="enquiry" status={enquiry.status} />
                {canClose && enquiry.status === "open" ? (
                  <Button onClick={() => setClosing(true)}>
                    <CheckCircle2 aria-hidden />
                    Close enquiry
                  </Button>
                ) : null}
              </div>
            }
          />
          <ClosedCallout enquiry={enquiry} reader="received" />
          <EnquiryCard
            enquiry={enquiry}
            offerLink={
              canViewOffers ? (
                <Link href={`/business/offers/${enquiry.offer.id}`} className="hover:underline">
                  {enquiry.offer.title}
                </Link>
              ) : (
                enquiry.offer.title
              )
            }
          />
          <CloseEnquiryDialog
            open={closing}
            onOpenChange={setClosing}
            organizationName={enquiry.organization.name}
            onSubmit={async ({ closingNote }) => {
              await close.mutateAsync({ closing_note: closingNote });
              toast.success("Enquiry closed");
            }}
          />
        </div>
      )}
    </EnquiryLoader>
  );
}

export function AdminEnquiry({ enquiryId }: { enquiryId: string }) {
  const query = useAdminEnquiry(enquiryId);
  const canViewOffers = useCan(OfferAdminPermission.OFFER_VIEW);
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  return (
    <EnquiryLoader reader="admin" query={query}>
      {(enquiry) => (
        <div className="space-y-6">
          <BackTo reader="admin" />
          <PageHeader
            title={enquiry.offer.title}
            description={
              canViewOrganizations ? (
                <span className="flex flex-wrap items-center gap-x-2">
                  <Link
                    href={`/admin/organizations/${enquiry.organization.id}`}
                    className="hover:underline"
                  >
                    {enquiry.organization.name}
                  </Link>
                  <span aria-hidden>→</span>
                  <Link
                    href={`/admin/organizations/${enquiry.offer.provider_organization.id}`}
                    className="hover:underline"
                  >
                    {enquiry.offer.provider_organization.name}
                  </Link>
                </span>
              ) : (
                `${enquiry.organization.name} → ${enquiry.offer.provider_organization.name}`
              )
            }
            actions={<StatusBadge domain="enquiry" status={enquiry.status} />}
          />
          <ClosedCallout enquiry={enquiry} reader="admin" />
          <EnquiryCard
            enquiry={enquiry}
            offerLink={
              canViewOffers ? (
                <Link
                  href={`/admin/business-offers/${enquiry.offer.id}`}
                  className="hover:underline"
                >
                  {enquiry.offer.title}
                </Link>
              ) : (
                enquiry.offer.title
              )
            }
          />
        </div>
      )}
    </EnquiryLoader>
  );
}
