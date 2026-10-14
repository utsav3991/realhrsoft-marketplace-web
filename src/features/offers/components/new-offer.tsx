"use client";

import { ArrowLeft, Handshake } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { usePartner } from "@/features/partners/api/queries";
import { isUuid } from "@/shared/api";
import { OfferAdminPermission, PartnerAdminPermission, useCan } from "@/shared/authorization";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";

import { useCreateOffer } from "../api/mutations";
import { EMPTY_OFFER, offerBody } from "../schemas/offer";
import { useAdminCategoryOptions } from "./category-options";
import { OfferForm, type IntentButton } from "./offer-form";
import { OrganizationPicker, PartnerPicker } from "./pickers";

export function BackToOffers() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/offers">
        <ArrowLeft aria-hidden />
        Offers
      </Link>
    </Button>
  );
}

/** The save/submit/publish buttons an administrator may use, publish first when allowed. */
export function useAdminIntents(saveLabel: string, { submittable = true } = {}): IntentButton[] {
  const canSubmit = useCan(OfferAdminPermission.OFFER_SUBMIT);
  const canPublish = useCan(OfferAdminPermission.OFFER_PUBLISH);
  const intents: IntentButton[] = [{ intent: "save", label: saveLabel }];
  if (canSubmit && submittable) intents.push({ intent: "submit", label: "Save and submit" });
  if (canPublish) intents.push({ intent: "publish", label: "Save and publish" });
  const last = intents[intents.length - 1];
  if (last) last.primary = true;
  return intents;
}

/**
 * Posting on a partner's behalf: any verified partner (portal, external or RealHRsoft). The
 * partner comes from ?partner= (linked from its record) or is chosen here.
 */
export function NewOffer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const partner = searchParams.get("partner");
  const partnerId = partner && isUuid(partner) ? partner : null;

  return (
    <div className="space-y-6">
      <BackToOffers />
      {partnerId ? (
        <OfferComposer partnerId={partnerId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Which partner is this offer for?</CardTitle>
            <CardDescription>
              Offers can be posted only for verified partners. Content you publish is recorded as
              approved by you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PartnerPicker
              onChoose={({ id }) => router.replace(`${pathname}?partner=${encodeURIComponent(id)}`)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PartnerHeading({ partnerId }: { partnerId: string }) {
  const canView = useCan(PartnerAdminPermission.PARTNER_VIEW);
  const partner = usePartner(partnerId, { enabled: canView });
  if (!canView || !partner.isSuccess) {
    return <span className="font-mono text-xs">{partnerId}</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Link href={`/admin/partners/${partnerId}`} className="hover:underline">
        {partner.data.business_name}
      </Link>
      <StatusBadge domain="partner" status={partner.data.status} />
    </span>
  );
}

function OfferComposer({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const create = useCreateOffer();
  const categories = useAdminCategoryOptions();
  const intents = useAdminIntents("Save draft");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post an offer</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Handshake className="size-4" aria-hidden />
          <PartnerHeading partnerId={partnerId} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categories.query.isPending ? (
          <Skeleton className="h-96 w-full" />
        ) : categories.query.isError ? (
          <ErrorState
            error={categories.query.error}
            onRetry={() => void categories.query.refetch()}
          />
        ) : (
          <OfferForm
            defaultValues={EMPTY_OFFER}
            categories={categories.options}
            intents={intents}
            organizationPicker={(props) => <OrganizationPicker {...props} />}
            reasonHint="Optional note, recorded in the audit log with you as the poster."
            onSubmit={async (values, intent) => {
              const offer = await create.mutateAsync({
                ...offerBody(values),
                partner_id: partnerId,
                intent,
              });
              toast.success(
                intent === "publish"
                  ? "Offer published"
                  : intent === "submit"
                    ? "Offer submitted for review"
                    : "Draft saved",
              );
              router.push(`/admin/offers/${offer.id}`);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
