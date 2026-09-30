"use client";

import { ArrowRight, BriefcaseBusiness, Inbox, Send, ShieldAlert, Store, type LucideIcon } from "lucide-react";
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
import { useSelectedOrganizationId } from "@/shared/auth";
import { BusinessOfferPermission, useCanInOrganization } from "@/shared/authorization";

import {
  useOwnBusinessOffers,
  useReceivedEnquiries,
  useSentEnquiries,
  type BusinessOfferFilters,
  type EnquiryFilters,
} from "../api/queries";

// Counts only: one row is enough, the API returns the total.
const COUNT: Page = { offset: 0, limit: 1 };
const ANY_OFFER: BusinessOfferFilters = {
  search: "",
  status: null,
  inReview: null,
  showToEmployees: null,
  partnerId: null,
  organizationId: null,
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

/** What the selected organization does here: sell to other businesses, and buy from them. */
export function BusinessOverview() {
  const organizationId = useSelectedOrganizationId();
  const canSell = useCanInOrganization(BusinessOfferPermission.OFFER_VIEW);
  const canViewLeads = useCanInOrganization(BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW);
  const canBrowse = useCanInOrganization(BusinessOfferPermission.CATALOGUE_VIEW);
  const canViewSent = useCanInOrganization(BusinessOfferPermission.SENT_ENQUIRY_VIEW);
  // Only tiles the member may open load their counts.
  const offers = useOwnBusinessOffers(organizationId, ANY_OFFER, COUNT, { enabled: canSell });
  const leads = useReceivedEnquiries(organizationId, OPEN, COUNT, { enabled: canViewLeads });
  const sent = useSentEnquiries(organizationId, OPEN, COUNT, { enabled: canViewSent });

  const tiles: (Tile | false)[] = [
    canSell && {
      title: "Your business offers",
      description: "Offer products or services to other organizations. Aayulogic reviews each one.",
      href: "/business/offers",
      action: "Manage offers",
      icon: BriefcaseBusiness,
      count: { value: offers.data?.count, label: "offers", error: offers.error },
    },
    canViewLeads && {
      title: "Leads",
      description: "Organizations that enquired about your offers. Follow up, then close them.",
      href: "/business/leads?status=open",
      action: "Open leads",
      icon: Inbox,
      count: { value: leads.data?.count, label: "open", error: leads.error },
    },
    canBrowse && {
      title: "Browse offers",
      description: "Offers other businesses make to your organization. Enquire to get a quote.",
      href: "/business/catalogue",
      action: "Browse",
      icon: Store,
    },
    canViewSent && {
      title: "Sent enquiries",
      description: "Your organization's enquiries and the providers' replies once closed.",
      href: "/business/enquiries",
      action: "View enquiries",
      icon: Send,
      count: { value: sent.data?.count, label: "open", error: sent.error },
    },
  ];
  const visible = tiles.filter((tile): tile is Tile => Boolean(tile));
  // The API refuses organizations that are not businesses yet (a pending partner registration).
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
            Business offers are open to verified partners and to organizations whose Employer
            capacity Aayulogic turned on. A pending partner registration must be verified first.
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
