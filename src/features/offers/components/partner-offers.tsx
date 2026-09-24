"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useSelectedOrganizationId } from "@/shared/auth";
import { Button } from "@/design-system/primitives/button";
import { PartnerPermission, useCanInOrganization } from "@/shared/authorization";

import { useCreateOffer, usePartnerOffers } from "../api/offers";
import { EMPTY_OFFER, offerBody } from "../schemas/offer";
import { OfferForm } from "./offer-form";
import { OffersTable, useStatusParam } from "./offers-list";

export function PartnerOffers() {
  const organizationId = useSelectedOrganizationId();
  const { status, setStatus } = useStatusParam();
  const offers = usePartnerOffers(organizationId, status);
  const canCreate = useCanInOrganization(PartnerPermission.OFFER_CREATE);
  return (
    <OffersTable
      offers={offers}
      hrefFor={(offer) => `/partner/offers/${offer.id}`}
      filter={status}
      onFilter={setStatus}
      emptyTitle="No offers yet"
      action={
        canCreate ? (
          <Button asChild>
            <Link href="/partner/offers/new">
              <Plus aria-hidden />
              New offer
            </Link>
          </Button>
        ) : null
      }
    />
  );
}

export function NewOffer() {
  const organizationId = useSelectedOrganizationId();
  const router = useRouter();
  const create = useCreateOffer(organizationId);
  return (
    <OfferForm
      title="Offer details"
      initial={EMPTY_OFFER}
      submitLabel="Create draft"
      actions={
        <Button asChild variant="outline">
          <Link href="/partner/offers">Cancel</Link>
        </Button>
      }
      onSubmit={async (values) => {
        const { id } = await create.mutateAsync(offerBody(values));
        toast.success("Draft created. Submit it for review when it is ready.");
        router.push(`/partner/offers/${id}`);
      }}
    />
  );
}
