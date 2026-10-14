"use client";

import { ArrowLeft, ArrowRight, CalendarClock, Inbox, Send, Store, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { RichText } from "@/design-system/components/rich-text-editor";
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
import { benefitSummary } from "@/features/offers/schemas/benefit-value";
import { BUSINESS_KIND_LABEL } from "@/features/offers/schemas/offer";
import { ApiError, isUuid } from "@/shared/api";
import { BusinessOfferPermission } from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { SearchField } from "@/shared/components/search-field";
import { ErrorState } from "@/shared/feedback/states";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDate, formatDateTime } from "@/shared/lib/format";

import { useEnquire } from "../api/mutations";
import {
  useBusinessCatalogue,
  useBusinessCatalogueCategories,
  useBusinessCatalogueOffer,
  type CatalogueOffer,
} from "../api/queries";
import { enquiryBody } from "../schemas/business-offer";
import { useBusinessCan, useBusinessPortal } from "./business-portal";
import { EnquireDialog } from "./enquiry-dialogs";

/** The business making the offer: a merchant or a client group. */
function providerName(offer: Pick<CatalogueOffer, "provider">) {
  return offer.provider.name;
}

/** Other businesses' offers available to the acting one; filters in the URL. */
export function BusinessCatalogue() {
  const { searchParams, set } = useUrlParams();
  const { owner } = useBusinessPortal();
  const search = searchParams.get("search") ?? "";
  const categoryParam = searchParams.get("category");
  const categoryId = categoryParam && isUuid(categoryParam) ? categoryParam : null;
  const offers = useBusinessCatalogue(owner, { search, categoryId });
  const categories = useBusinessCatalogueCategories(owner);
  const rows = offers.data?.pages.flatMap((page) => page.results) ?? [];
  const filtered = Boolean(search || categoryId);

  return (
    <div className="space-y-4">
      <SearchField
        placeholder="Search offers or providers"
        aria-label="Search business offers by title or provider"
        className="max-w-md"
      />
      {categories.data && categories.data.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <Button
            size="sm"
            variant={categoryId ? "ghost" : "secondary"}
            aria-pressed={!categoryId}
            onClick={() => set({ category: null })}
          >
            All
          </Button>
          {categories.data.map((category) => (
            <Button
              key={category.id}
              size="sm"
              variant={categoryId === category.id ? "secondary" : "ghost"}
              aria-pressed={categoryId === category.id}
              onClick={() => set({ category: categoryId === category.id ? null : category.id })}
            >
              {category.name}
            </Button>
          ))}
        </div>
      ) : null}

      {offers.isPending ? (
        <ListSkeleton />
      ) : offers.isError ? (
        <ErrorState error={offers.error} onRetry={() => void offers.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Store}
          title={filtered ? "No offers match" : "No business offers yet"}
          description={
            filtered
              ? "Try a different search or category."
              : "Offers other businesses make available to you appear here."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
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

function OfferCard({ offer }: { offer: CatalogueOffer }) {
  const { base } = useBusinessPortal();
  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge intent="neutral">{offer.category.name}</Badge>
          {offer.my_open_enquiry_id ? <Badge intent="warning">Enquiry open</Badge> : null}
        </div>
        <p className="text-muted-foreground text-sm">
          {providerName(offer)} · {BUSINESS_KIND_LABEL[offer.provider.kind]}
        </p>
        <CardTitle className="text-lg">{offer.title}</CardTitle>
        <CardDescription>{offer.headline}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex flex-col items-stretch gap-3">
        <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span>{benefitSummary(offer.benefit)}</span>
          {offer.valid_until ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" aria-hidden />
              Until {formatDate(offer.valid_until)}
            </span>
          ) : null}
          {offer.shown_to_employees ? (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              Also for employees
            </span>
          ) : null}
        </span>
        <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
          <Link href={`${base}/catalogue/${offer.id}`} aria-label={`View ${offer.title}`}>
            Details
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function BackToCatalogue() {
  const { base } = useBusinessPortal();
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href={`${base}/catalogue`}>
        <ArrowLeft aria-hidden />
        Browse offers
      </Link>
    </Button>
  );
}

/** One business offer as the acting business sees it, with its enquiry action. */
export function BusinessCatalogueOffer({ offerId }: { offerId: string }) {
  const { owner } = useBusinessPortal();
  const offer = useBusinessCatalogueOffer(owner, offerId);

  if (offer.isPending) {
    return (
      <div className="space-y-6">
        <BackToCatalogue />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (offer.isError) {
    return (
      <div className="space-y-6">
        <BackToCatalogue />
        {offer.error instanceof ApiError && offer.error.isNotFound ? (
          <EmptyState
            icon={Store}
            title="Offer not available"
            description="It may have ended, or it is not offered to you."
          />
        ) : (
          <ErrorState error={offer.error} onRetry={() => void offer.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedOffer offer={offer.data} />;
}

function LoadedOffer({ offer }: { offer: CatalogueOffer }) {
  return (
    <div className="space-y-6">
      <BackToCatalogue />
      <PageHeader
        title={offer.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2">
            {providerName(offer)}
            <span aria-hidden>·</span>
            {offer.category.name}
          </span>
        }
        actions={<EnquiryAction offer={offer} />}
      />
      <Card>
        <CardHeader>
          <CardTitle>{offer.headline}</CardTitle>
          <CardDescription>
            Valid {formatDateTime(offer.valid_from)}
            {offer.valid_until ? ` – ${formatDateTime(offer.valid_until)}` : " onwards"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Benefit">
              {benefitSummary(offer.benefit)}
              {offer.benefit.type !== "descriptive" && offer.benefit.description ? (
                <span className="text-muted-foreground block text-xs">
                  {offer.benefit.description}
                </span>
              ) : null}
            </Detail>
            <Detail label="Provider">
              {providerName(offer)} ({BUSINESS_KIND_LABEL[offer.provider.kind]})
            </Detail>
            <Detail label="Employees">
              {offer.shown_to_employees
                ? "RealHRSoft employees in its audience can also claim it in their marketplace"
                : "Not listed for employees"}
            </Detail>
            {offer.enquiry_instructions ? (
              <Detail label="When you enquire" className="sm:col-span-2 lg:col-span-3">
                <span className="whitespace-pre-line">{offer.enquiry_instructions}</span>
              </Detail>
            ) : null}
            <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
              <RichText value={offer.description} />
            </Detail>
            <Detail label="Terms and conditions" className="sm:col-span-2 lg:col-span-3">
              {offer.terms ? <RichText value={offer.terms} /> : "—"}
            </Detail>
          </DetailList>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * One open enquiry per business and offer: an open one links to it instead of offering a
 * send the API would refuse. The enquiry names the version read; if other terms went live
 * meanwhile the API refuses (OFFER_VERSION_CHANGED) and the refreshed offer is shown to read.
 */
function EnquiryAction({ offer }: { offer: CatalogueOffer }) {
  const { owner, base } = useBusinessPortal();
  const canEnquire = useBusinessCan(BusinessOfferPermission.SENT_ENQUIRY_CREATE);
  const canViewSent = useBusinessCan(BusinessOfferPermission.SENT_ENQUIRY_VIEW);
  const enquire = useEnquire(owner, offer.id);
  const [open, setOpen] = useState(false);
  const openId = offer.my_open_enquiry_id;

  if (openId) {
    return canViewSent ? (
      <Button asChild variant="outline">
        <Link href={`${base}/enquiries/${openId}`}>
          <Inbox aria-hidden />
          View your open enquiry
        </Link>
      </Button>
    ) : (
      <Badge intent="warning">Enquiry open</Badge>
    );
  }
  if (!canEnquire) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Send aria-hidden />
        Enquire
      </Button>
      <EnquireDialog
        open={open}
        onOpenChange={setOpen}
        offerTitle={offer.title}
        providerName={providerName(offer)}
        instructions={offer.enquiry_instructions}
        onSubmit={async (values) => {
          try {
            await enquire.mutateAsync(enquiryBody(values, offer.version_id));
            toast.success(`Enquiry sent to ${providerName(offer)}`);
          } catch (error) {
            if (!(error instanceof ApiError)) throw error;
            if (error.code === "OFFER_VERSION_CHANGED") {
              toast.warning("The offer's terms just changed. Review them before enquiring.");
              setOpen(false);
              return false;
            }
            if (error.code === "ENQUIRY_ALREADY_OPEN") {
              toast.info("You already have an open enquiry about this offer.");
              setOpen(false);
              return false;
            }
            throw error;
          }
        }}
      />
    </>
  );
}
