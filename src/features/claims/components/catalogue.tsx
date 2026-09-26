"use client";

import { ArrowLeft, ArrowRight, CalendarClock, Search, Star, Store, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { RichText } from "@/design-system/components/rich-text-editor";
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
import { Input } from "@/design-system/primitives/input";
import { Skeleton } from "@/design-system/primitives/skeleton";
import {
  useCatalogue,
  useCatalogueCategories,
  useCatalogueOffer,
  type MarketplaceOffer,
} from "@/features/offers/api/queries";
import { ApiError, isUuid } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Detail, DetailList } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { formatDate, formatDateTime } from "@/shared/lib/format";

import { useClaimOffer } from "../api/mutations";
import { MarketplaceErrorState, methodLabel } from "./claim-details";

/** Browsing: search, category and featured filters live in the URL. */
export function Catalogue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const categoryParam = searchParams.get("category");
  const categoryId = categoryParam && isUuid(categoryParam) ? categoryParam : null;
  const featured = searchParams.get("featured") === "true" ? true : null;
  const [draft, setDraft] = useState(search);
  const offers = useCatalogue({ search, categoryId, featured });
  const categories = useCatalogueCategories();

  function setParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(name, value);
    else params.delete(name);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParam("search", draft.trim() || null);
  }

  // One 403 explains everything: the viewer is not an eligible employee.
  if (offers.isError && offers.error instanceof ApiError && offers.error.isForbidden) {
    return <MarketplaceErrorState error={offers.error} />;
  }

  const rows = offers.data?.pages.flatMap((page) => page.results) ?? [];
  const filtered = Boolean(search || categoryId || featured);

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} role="search" className="flex w-full max-w-md gap-2">
        <Input
          type="search"
          maxLength={255}
          placeholder="Search offers, benefits or businesses"
          aria-label="Search offers by title, benefit or business"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" variant="outline" size="icon" aria-label="Search">
          <Search aria-hidden />
        </Button>
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter offers">
        <Button
          size="sm"
          variant={!categoryId && !featured ? "secondary" : "ghost"}
          aria-pressed={!categoryId && !featured}
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.delete("category");
            params.delete("featured");
            const query = params.toString();
            router.replace(query ? `${pathname}?${query}` : pathname);
          }}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={featured ? "secondary" : "ghost"}
          aria-pressed={featured === true}
          onClick={() => setParam("featured", featured ? null : "true")}
        >
          <Star aria-hidden />
          Featured
        </Button>
        {categories.data?.map((category) => (
          <Button
            key={category.id}
            size="sm"
            variant={categoryId === category.id ? "secondary" : "ghost"}
            aria-pressed={categoryId === category.id}
            onClick={() => setParam("category", categoryId === category.id ? null : category.id)}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {offers.isPending ? (
        <ListSkeleton />
      ) : offers.isError ? (
        <MarketplaceErrorState error={offers.error} onRetry={() => void offers.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Store}
          title={filtered ? "No offers match" : "No offers yet"}
          description={
            filtered
              ? "Try a different search or category."
              : "Offers from marketplace partners appear here when they are available to you."
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

function OfferCard({ offer }: { offer: MarketplaceOffer }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge intent="neutral">{offer.category.name}</Badge>
          {offer.is_featured ? (
            <Badge intent="info">
              <Star aria-hidden />
              Featured
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm">{offer.partner.business_name}</p>
        <CardTitle className="text-lg">{offer.title}</CardTitle>
        <CardDescription>{offer.benefit}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex flex-col items-stretch gap-3">
        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <CalendarClock className="size-3.5" aria-hidden />
          Until {formatDate(offer.valid_until)}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href={`/marketplace/offers/${offer.id}`} aria-label={`View ${offer.title}`}>
              Details
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <ClaimAction offer={offer} compact />
        </div>
      </CardFooter>
    </Card>
  );
}

function BackToCatalogue() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/marketplace">
        <ArrowLeft aria-hidden />
        Discover
      </Link>
    </Button>
  );
}

/** One catalogue offer. Redemption details are issued only by claiming it. */
export function CatalogueOffer({ offerId }: { offerId: string }) {
  const offer = useCatalogueOffer(offerId);

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
            description="It may have ended, or it is not offered to your employer."
          />
        ) : (
          <MarketplaceErrorState error={offer.error} onRetry={() => void offer.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedOffer offer={offer.data} />;
}

function LoadedOffer({ offer }: { offer: MarketplaceOffer }) {
  return (
    <div className="space-y-6">
      <BackToCatalogue />
      <PageHeader
        title={offer.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2">
            {offer.partner.business_name}
            <span aria-hidden>·</span>
            {offer.category.name}
          </span>
        }
        actions={<ClaimAction offer={offer} />}
      />
      <Card>
        <CardHeader>
          <CardTitle>{offer.benefit}</CardTitle>
          <CardDescription>
            Valid {formatDateTime(offer.valid_from)} – {formatDateTime(offer.valid_until)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="How to redeem">{methodLabel(offer)}</Detail>
            <Detail label="Ends">{formatDateTime(offer.valid_until)}</Detail>
            <Detail label="Business">{offer.partner.business_name}</Detail>
            <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
              <RichText value={offer.description} />
            </Detail>
            <Detail label="Terms and conditions" className="sm:col-span-2 lg:col-span-3">
              <RichText value={offer.terms} />
            </Detail>
          </DetailList>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Claiming is once per offer. The catalogue names the employee's existing claim
 * (`my_claim`), so a claimed offer links to it instead of offering a claim the API would
 * refuse. If the claim was made elsewhere meanwhile, ALREADY_CLAIMED names it and we open it.
 */
function ClaimAction({ offer, compact = false }: { offer: MarketplaceOffer; compact?: boolean }) {
  const router = useRouter();
  const size = compact ? "sm" : "default";
  const claim = useClaimOffer();
  const [open, setOpen] = useState(false);
  // One key per claim attempt, reused if the same attempt is retried after a failure.
  const idempotencyKey = useRef<string | null>(null);

  const claimed = offer.my_claim;
  if (claimed) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge domain="claim" status={claimed.status} />
        <Button asChild variant="outline" size={size}>
          <Link href={`/marketplace/claims/${claimed.id}`}>
            <Ticket aria-hidden />
            View your claim
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        size={size}
        // Catalogue cards are promotional; the offer page keeps its single primary action.
        variant={compact ? "ink" : "default"}
        onClick={() => {
          idempotencyKey.current = crypto.randomUUID();
          setOpen(true);
        }}
      >
        <Ticket aria-hidden />
        Claim offer
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Claim this offer?"
        description={
          <span className="space-y-2">
            <span className="block">
              You can claim it once. You receive the redemption details straight away, and the
              claim stays usable until {formatDateTime(offer.valid_until)}.
            </span>
            <span className="block">By claiming you accept the offer&apos;s terms.</span>
          </span>
        }
        confirmLabel="Claim offer"
        onConfirm={async () => {
          const key = idempotencyKey.current ?? crypto.randomUUID();
          idempotencyKey.current = key;
          let claimId: string;
          try {
            claimId = (await claim.mutateAsync({ offerId: offer.id, idempotencyKey: key })).id;
            toast.success("Offer claimed");
          } catch (error) {
            const existing = alreadyClaimedId(error);
            if (!existing) throw error;
            claimId = existing;
            toast.info("You already claimed this offer");
          }
          router.push(`/marketplace/claims/${claimId}`);
        }}
      />
    </>
  );
}

/** The claim an ALREADY_CLAIMED conflict names, if the error is one. */
function alreadyClaimedId(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== "ALREADY_CLAIMED") return null;
  const claimId = error.extensions.claim_id;
  return typeof claimId === "string" && isUuid(claimId) ? claimId : null;
}
