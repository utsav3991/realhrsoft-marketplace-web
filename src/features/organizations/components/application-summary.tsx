import type { Schemas } from "@/shared/api";
import { Detail, DetailList } from "@/shared/components/details";

type Details = Schemas["BusinessDetailsResponse"];

/** Read-only business details of an application or Partner profile. */
export function BusinessSummary({ details }: { details: Details }) {
  return (
    <DetailList>
      <Detail label="Legal name">{details.legal_name}</Detail>
      <Detail label="Display name">{details.display_name}</Detail>
      <Detail label="Contact email">{details.contact_email}</Detail>
      <Detail label="Contact phone">{details.contact_phone ?? "—"}</Detail>
      <Detail label="Website">{details.website ?? "—"}</Detail>
      <Detail label="About" className="sm:col-span-2 lg:col-span-3">
        <span className="whitespace-pre-line">{details.description ?? "—"}</span>
      </Detail>
    </DetailList>
  );
}
