"use client";

import { Plus, Search } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import { useOrganizations } from "@/features/organizations/api/queries";
import { usePartners } from "@/features/partners/api/queries";
import { FIRST_PAGE, isUuid } from "@/shared/api";
import {
  OrganizationAdminPermission,
  PartnerAdminPermission,
  useCan,
} from "@/shared/authorization";
import { StatusBadge } from "@/shared/components/status-badge";

import type { AudienceOrganization } from "../schemas/offer";

/** Submits on Enter without submitting the surrounding offer form. */
function onEnter(action: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    action();
  };
}

/** Pastes an ID when the actor cannot browse the directory. */
function IdEntry({
  label,
  onAdd,
  submitLabel,
}: {
  label: string;
  submitLabel: string;
  onAdd: (id: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const add = () => {
    const id = value.trim();
    if (!isUuid(id)) {
      setError(`Enter a valid ${label.toLowerCase()}`);
      return;
    }
    setError(undefined);
    setValue("");
    onAdd(id);
  };
  return (
    <div className="space-y-1">
      <div className="flex max-w-md gap-2">
        <Input
          aria-label={label}
          placeholder={label}
          className="font-mono"
          autoComplete="off"
          spellCheck={false}
          value={value}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onEnter(add)}
        />
        <Button type="button" variant="outline" onClick={add}>
          {submitLabel}
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

function SearchBox({ label, onSearch }: { label: string; onSearch: (value: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex max-w-md gap-2">
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onEnter(() => onSearch(draft.trim()))}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Search"
        onClick={() => onSearch(draft.trim())}
      >
        <Search aria-hidden />
      </Button>
    </div>
  );
}

/** Adds audience organizations from the directory (organizations.organization.view). */
export function OrganizationPicker({
  selected,
  onAdd,
}: {
  selected: readonly AudienceOrganization[];
  onAdd: (organization: AudienceOrganization) => void;
}) {
  const canBrowse = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const [search, setSearch] = useState<string | null>(null);
  if (!canBrowse) {
    return (
      <IdEntry label="Organization ID" submitLabel="Add" onAdd={(id) => onAdd({ id, name: id })} />
    );
  }
  return (
    <div className="space-y-2">
      <SearchBox label="Search organizations to add" onSearch={setSearch} />
      {search !== null ? (
        <OrganizationResults search={search} selected={selected} onAdd={onAdd} />
      ) : null}
    </div>
  );
}

function OrganizationResults({
  search,
  selected,
  onAdd,
}: {
  search: string;
  selected: readonly AudienceOrganization[];
  onAdd: (organization: AudienceOrganization) => void;
}) {
  const organizations = useOrganizations({ search, ordering: null }, FIRST_PAGE);
  if (organizations.isPending) return <p className="text-muted-foreground text-sm">Searching…</p>;
  if (organizations.isError)
    return <p className="text-destructive text-sm">Organizations could not be loaded.</p>;
  const rows = organizations.data.results
    .filter((o) => !selected.some((s) => s.id === o.id))
    .slice(0, 8);
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">No matches.</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((organization) => (
        <li key={organization.id} className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-sm">{organization.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAdd({ id: organization.id, name: organization.name })}
          >
            <Plus aria-hidden />
            Add
          </Button>
        </li>
      ))}
    </ul>
  );
}

export interface ChosenPartner {
  id: string;
  name: string;
}

/**
 * Chooses the verified partner an administrator posts for. Browsing needs
 * partners.partner.view; otherwise the partner ID is pasted and the API checks it.
 */
export function PartnerPicker({ onChoose }: { onChoose: (partner: ChosenPartner) => void }) {
  const canBrowse = useCan(PartnerAdminPermission.PARTNER_VIEW);
  const [search, setSearch] = useState<string | null>(null);
  if (!canBrowse) {
    return (
      <IdEntry
        label="Partner ID"
        submitLabel="Continue"
        onAdd={(id) => onChoose({ id, name: id })}
      />
    );
  }
  return (
    <div className="space-y-2">
      <SearchBox label="Search verified partners" onSearch={setSearch} />
      <PartnerResults search={search ?? ""} onChoose={onChoose} />
    </div>
  );
}

function PartnerResults({
  search,
  onChoose,
}: {
  search: string;
  onChoose: (partner: ChosenPartner) => void;
}) {
  // Offers can be posted only for verified partners, whatever their source.
  const partners = usePartners(
    { search, status: "verified", intakePath: null, source: null, ordering: null },
    FIRST_PAGE,
  );
  if (partners.isPending) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (partners.isError)
    return <p className="text-destructive text-sm">Partners could not be loaded.</p>;
  const rows = partners.data.results.slice(0, 10);
  if (rows.length === 0)
    return <p className="text-muted-foreground text-sm">No verified partners match.</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((partner) => (
        <li key={partner.id} className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{partner.business_name}</p>
            <p className="text-muted-foreground truncate text-xs">{partner.organization_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge domain="partner" status={partner.status} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChoose({ id: partner.id, name: partner.business_name })}
            >
              Choose
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
