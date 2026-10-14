"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import { usePartners } from "@/features/partners/api/queries";
import { BUSINESS_KIND_LABEL, type AudienceOrganization } from "@/features/offers/schemas/offer";
import { FIRST_PAGE } from "@/shared/api";
import { PartnerAdminPermission, useCan } from "@/shared/authorization";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

/**
 * Adds audience businesses for administrators: verified merchants and active client groups,
 * found among the partners (partners.partner.view). Others are offered nothing to browse.
 */
export function AdminBusinessPicker({
  selected,
  onAdd,
}: {
  selected: readonly AudienceOrganization[];
  onAdd: (business: AudienceOrganization) => void;
}) {
  const canBrowse = useCan(PartnerAdminPermission.PARTNER_VIEW);
  const [draft, setDraft] = useState("");
  const search = useDebouncedValue(draft.trim(), 300);
  if (!canBrowse) {
    return (
      <p className="text-muted-foreground text-sm">
        Choosing businesses needs partners.partner.view.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <Input
        type="search"
        aria-label="Search businesses to add"
        placeholder="Search businesses to add"
        className="max-w-md"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      />
      {search ? <Results search={search} selected={selected} onAdd={onAdd} /> : null}
    </div>
  );
}

function Results({
  search,
  selected,
  onAdd,
}: {
  search: string;
  selected: readonly AudienceOrganization[];
  onAdd: (business: AudienceOrganization) => void;
}) {
  const partners = usePartners(
    { search, kind: null, status: null, intakePath: null, source: null, ordering: null },
    FIRST_PAGE,
  );
  if (partners.isPending) return <p className="text-muted-foreground text-sm">Searching…</p>;
  if (partners.isError)
    return <p className="text-destructive text-sm">Businesses could not be loaded.</p>;
  // Businesses in standing: verified merchants and active client groups.
  const rows = partners.data.results
    .filter((p) => p.active && (p.kind === "client" || p.status === "verified"))
    .filter((p) => !selected.some((s) => s.id === p.id))
    .slice(0, 8);
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">No matches.</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((business) => (
        <li key={business.id} className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="flex items-center gap-2 text-sm">
            {business.business_name}
            <Badge intent="outline">{BUSINESS_KIND_LABEL[business.kind]}</Badge>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAdd({ id: business.id, name: business.business_name })}
          >
            <Plus aria-hidden />
            Add
          </Button>
        </li>
      ))}
    </ul>
  );
}
