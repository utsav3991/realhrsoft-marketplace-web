"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Inbox,
  Send,
  ShieldAlert,
  Store,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError, type Page } from "@/shared/api";
import { BusinessOfferPermission } from "@/shared/authorization";

import {
  useOwnBusinessOffers,
  useReceivedEnquiries,
  useSentEnquiries,
  type BusinessOfferFilters,
  type EnquiryFilters,
} from "../api/queries";
import { useBusinessCan, useBusinessPortal } from "./business-portal";

// Counts only: one row is enough, the API returns the total.
const COUNT: Page = { offset: 0, limit: 1 };
const ANY_OFFER: BusinessOfferFilters = {
  search: "",
  status: null,
  inReview: null,
  showToEmployees: null,
  providerKind: null,
  providerId: null,
  ordering: null,
};
const OPEN: EnquiryFilters = { search: "", status: "open", offerId: null, ordering: null };

interface Tile {
  title: string;
  description: string;
  href: string;
  action: string;
  icon: LucideIcon;
  count?: { value: number | undefined; label: string; error: unknown };
}

/** What the acting business does here: sell to other businesses, and buy from them. */
export function BusinessOverview() {
  const { owner, base, kind } = useBusinessPortal();
  const canSell = useBusinessCan(BusinessOfferPermission.OFFER_VIEW);
  const canViewLeads = useBusinessCan(BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW);
  const canBrowse = useBusinessCan(BusinessOfferPermission.CATALOGUE_VIEW);
  const canViewSent = useBusinessCan(BusinessOfferPermission.SENT_ENQUIRY_VIEW);
  // Only tiles the member may open load their counts.
  const offers = useOwnBusinessOffers(owner, ANY_OFFER, COUNT, { enabled: canSell });
  const leads = useReceivedEnquiries(owner, OPEN, COUNT, { enabled: canViewLeads });
  const sent = useSentEnquiries(owner, OPEN, COUNT, { enabled: canViewSent });

  const tiles: (Tile | false)[] = [
    canSell && {
      title: "Your business offers",
      description: "Offer products or services to other businesses. Aayulogic reviews each one.",
      href: `${base}/offers`,
      action: "Manage offers",
      icon: BriefcaseBusiness,
      count: { value: offers.data?.count, label: "offers", error: offers.error },
    },
    canViewLeads && {
      title: "Leads",
      description: "Businesses that enquired about your offers. Follow up, then close them.",
      href: `${base}/leads?status=open`,
      action: "Open leads",
      icon: Inbox,
      count: { value: leads.data?.count, label: "open", error: leads.error },
    },
    canBrowse && {
      title: "Browse offers",
      description: "Offers other businesses make to you. Enquire to get a quote.",
      href: `${base}/catalogue`,
      action: "Browse",
      icon: Store,
    },
    canViewSent && {
      title: "Sent enquiries",
      description: "Your enquiries and the providers' replies once closed.",
      href: `${base}/enquiries`,
      action: "View enquiries",
      icon: Send,
      count: { value: sent.data?.count, label: "open", error: sent.error },
    },
  ];
  const visible = tiles.filter((tile): tile is Tile => Boolean(tile));
  // The API refuses a merchant that is not verified yet, and a deactivated client group.
  const refused = [offers.error, leads.error, sent.error].some(
    (error) => error instanceof ApiError && error.isForbidden,
  );

  return (
    <div className="space-y-6">
      {refused ? (
        <Alert>
          <ShieldAlert aria-hidden />
          <AlertTitle>Not a business yet</AlertTitle>
          <AlertDescription>
            {kind === "merchant"
              ? "Business offers are open to verified merchants. Your registration must be verified first."
              : "Business offers are open to active client groups. Ask Aayulogic if your group was deactivated."}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((tile) => (
          <OverviewTile key={tile.href} tile={tile} />
        ))}
      </div>
    </div>
  );
}

function OverviewTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-5" aria-hidden />
          {tile.title}
        </CardTitle>
        <CardDescription>{tile.description}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex items-center justify-between gap-3">
        {tile.count ? (
          tile.count.value !== undefined ? (
            <p className="text-2xl font-semibold tracking-[-0.03em] tabular-nums">
              {tile.count.value}
              <span className="text-muted-foreground ml-1.5 text-sm font-medium">
                {tile.count.label}
              </span>
            </p>
          ) : tile.count.error ? (
            <span />
          ) : (
            <Skeleton className="h-8 w-16" />
          )
        ) : (
          <span />
        )}
        <Button asChild variant="ghost" size="sm">
          <Link href={tile.href}>
            {tile.action}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
