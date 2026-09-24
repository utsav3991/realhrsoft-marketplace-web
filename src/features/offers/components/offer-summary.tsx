import type { Schemas } from "@/shared/api";
import { Detail, DetailList } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDateTime } from "@/shared/lib/format";

type Offer = Schemas["OfferResponse"];

export function OfferSummary({ offer }: { offer: Offer }) {
  return (
    <DetailList>
      <Detail label="Status">
        <StatusBadge domain="offer" status={offer.status} />
      </Detail>
      <Detail label="Category">{offer.category}</Detail>
      <Detail label="Audience">All eligible marketplace users</Detail>
      <Detail label="Valid from">
        {offer.valid_from ? formatDateTime(offer.valid_from) : "Immediately"}
      </Detail>
      <Detail label="Valid until">
        {offer.valid_until ? formatDateTime(offer.valid_until) : "No end date"}
      </Detail>
      <Detail label="Version">{offer.version}</Detail>
      <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
        <span className="whitespace-pre-line">{offer.description}</span>
      </Detail>
      <Detail label="How to redeem" className="sm:col-span-2 lg:col-span-3">
        <span className="whitespace-pre-line">{offer.redemption_instructions}</span>
      </Detail>
      <Detail label="Terms" className="sm:col-span-2 lg:col-span-3">
        <span className="whitespace-pre-line">{offer.terms ?? "—"}</span>
      </Detail>
      {offer.last_review ? (
        <Detail label="Last review" className="sm:col-span-2 lg:col-span-3">
          <StatusBadge domain="offer" status={offer.last_review.decision} className="mr-2" />
          {offer.last_review.note}
          <span className="text-muted-foreground ml-2 text-xs">
            {formatDateTime(offer.last_review.reviewed_at)}
          </span>
        </Detail>
      ) : null}
    </DetailList>
  );
}
