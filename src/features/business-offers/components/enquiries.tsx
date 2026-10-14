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
import { BUSINESS_KIND_LABEL } from "@/features/offers/schemas/offer";
import { ApiError, isUuid } from "@/shared/api";
import {
  BusinessOfferPermission,
  OfferAdminPermission,
  PartnerAdminPermission,
  useCan,
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
import { useBusinessCan, useBusinessPortal, useOptionalBusinessPortal } from "./business-portal";
import { CloseEnquiryDialog } from "./enquiry-dialogs";

const ALL = "all";
const STATUSES: readonly { value: EnquiryStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

/** Who reads the enquiry: the business that sent it, the provider, or Aayulogic. */
type Reader = "sent" | "received" | "admin";

/** Where a reader's enquiries live: the acting business's portal, or administration. */
function useReaderPath(reader: Reader): string {
  const base = useOptionalBusinessPortal()?.base ?? "/business";
  if (reader === "admin") return "/admin/business-enquiries";
  return reader === "sent" ? `${base}/enquiries` : `${base}/leads`;
}

/** "Acme Group (Client group)": a business with its kind. */
function businessLabel(business: { name: string; kind: keyof typeof BUSINESS_KIND_LABEL }) {
  return `${business.name} (${BUSINESS_KIND_LABEL[business.kind]})`;
}

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
  const path = useReaderPath(reader);
  const href = (enquiry: Enquiry) => `${path}/${enquiry.id}`;
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
                {businessLabel(enquiry.offer.provider)}
              </p>
            </>
          ),
        }
      : {
          id: "business",
          header: "Business",
          cell: (enquiry) => (
            <>
              <Link href={href(enquiry)} className="font-medium hover:underline">
                {enquiry.business.name}
              </Link>
              <p className="text-muted-foreground text-xs">
                {BUSINESS_KIND_LABEL[enquiry.business.kind]} ·{" "}
                {reader === "admin"
                  ? `${enquiry.offer.title} · ${businessLabel(enquiry.offer.provider)}`
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
          placeholder="Search offer, business or contact"
          aria-label="Search enquiries by offer title, business or contact name"
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
                    ? "When another business enquires about one of your business offers, it appears here."
                    : undefined
            }
          />
        }
      />
    </div>
  );
}

/** The acting business's enquiries about other businesses' offers. */
export function SentEnquiries() {
  const { owner } = useBusinessPortal();
  const { filters, sort } = useEnquiryFilters();
  const paging = usePageParam();
  const query = useSentEnquiries(owner, filters, paging);
  return <EnquiryTable reader="sent" query={query} filters={filters} sort={sort} paging={paging} />;
}

/** Enquiries about the acting business's offers: its leads. */
export function Leads() {
  const { owner } = useBusinessPortal();
  const { filters, sort } = useEnquiryFilters();
  const paging = usePageParam();
  const query = useReceivedEnquiries(owner, filters, paging);
  return (
    <EnquiryTable reader="received" query={query} filters={filters} sort={sort} paging={paging} />
  );
}

/** Every business's enquiries, for Aayulogic oversight. */
export function AdminEnquiries() {
  const { filters, sort } = useEnquiryFilters();
  const paging = usePageParam();
  const query = useAdminEnquiries(filters, paging);
  return (
    <EnquiryTable reader="admin" query={query} filters={filters} sort={sort} paging={paging} />
  );
}

// --- One enquiry -----------------------------------------------------------------------

const BACK: Record<Reader, string> = {
  sent: "Sent enquiries",
  received: "Leads",
  admin: "Business enquiries",
};

function BackTo({ reader }: { reader: Reader }) {
  const path = useReaderPath(reader);
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href={path}>
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
          <Detail label="Provider">{businessLabel(enquiry.offer.provider)}</Detail>
          <Detail label="From">{businessLabel(enquiry.business)}</Detail>
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
            ? `${enquiry.offer.provider.name} follows up with your contact and closes the enquiry when done.`
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
        {reader === "sent" ? <p>You may enquire about the offer again.</p> : null}
      </AlertDescription>
    </Alert>
  );
}

export function SentEnquiry({ enquiryId }: { enquiryId: string }) {
  const { owner, base } = useBusinessPortal();
  const query = useSentEnquiry(owner, enquiryId);
  const canBrowse = useBusinessCan(BusinessOfferPermission.CATALOGUE_VIEW);
  return (
    <EnquiryLoader reader="sent" query={query}>
      {(enquiry) => (
        <div className="space-y-6">
          <BackTo reader="sent" />
          <PageHeader
            title={enquiry.offer.title}
            description={`Enquiry to ${enquiry.offer.provider.name}`}
            actions={<StatusBadge domain="enquiry" status={enquiry.status} />}
          />
          <ClosedCallout enquiry={enquiry} reader="sent" />
          <EnquiryCard
            enquiry={enquiry}
            offerLink={
              // The offer opens only while it is still live and available to the business.
              canBrowse ? (
                <Link href={`${base}/catalogue/${enquiry.offer.id}`} className="hover:underline">
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
  const { owner, base } = useBusinessPortal();
  const query = useReceivedEnquiry(owner, enquiryId);
  const canClose = useBusinessCan(BusinessOfferPermission.RECEIVED_ENQUIRY_MANAGE);
  const canViewOffers = useBusinessCan(BusinessOfferPermission.OFFER_VIEW);
  const close = useCloseEnquiry(owner, enquiryId);
  const [closing, setClosing] = useState(false);
  return (
    <EnquiryLoader reader="received" query={query}>
      {(enquiry) => (
        <div className="space-y-6">
          <BackTo reader="received" />
          <PageHeader
            title={enquiry.business.name}
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
                <Link href={`${base}/offers/${enquiry.offer.id}`} className="hover:underline">
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
            businessName={enquiry.business.name}
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
  const canViewPartners = useCan(PartnerAdminPermission.PARTNER_VIEW);
  return (
    <EnquiryLoader reader="admin" query={query}>
      {(enquiry) => (
        <div className="space-y-6">
          <BackTo reader="admin" />
          <PageHeader
            title={enquiry.offer.title}
            description={
              canViewPartners ? (
                <span className="flex flex-wrap items-center gap-x-2">
                  <Link href={`/admin/partners/${enquiry.business.id}`} className="hover:underline">
                    {businessLabel(enquiry.business)}
                  </Link>
                  <span aria-hidden>→</span>
                  <Link
                    href={`/admin/partners/${enquiry.offer.provider.id}`}
                    className="hover:underline"
                  >
                    {businessLabel(enquiry.offer.provider)}
                  </Link>
                </span>
              ) : (
                `${businessLabel(enquiry.business)} → ${businessLabel(enquiry.offer.provider)}`
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
