"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import type { AudienceOrganization } from "@/features/offers/schemas/offer";
import { useSelectedOrganizationId } from "@/shared/auth";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useBusinessDirectory } from "../api/queries";

/**
 * Adds audience organizations from the business directory: other verified partners and
 * employers, names only, never the selected organization itself.
 */
export function BusinessDirectoryPicker({
  selected,
  onAdd,
}: {
  selected: readonly AudienceOrganization[];
  onAdd: (organization: AudienceOrganization) => void;
}) {
  const [draft, setDraft] = useState("");
  const search = useDebouncedValue(draft.trim(), 300);
  return (
    <div className="space-y-2">
      <Input
        type="search"
        aria-label="Search businesses to add"
        placeholder="Search businesses to add"
        className="max-w-md"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        // Enter searches as you type; it must not submit the surrounding offer form.
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      />
      {search ? <DirectoryResults search={search} selected={selected} onAdd={onAdd} /> : null}
    </div>
  );
}

function DirectoryResults({
  search,
  selected,
  onAdd,
}: {
  search: string;
  selected: readonly AudienceOrganization[];
  onAdd: (organization: AudienceOrganization) => void;
}) {
  const organizationId = useSelectedOrganizationId();
  const directory = useBusinessDirectory(organizationId, search);
  if (directory.isPending) return <p className="text-muted-foreground text-sm">Searching…</p>;
  if (directory.isError)
    return <p className="text-destructive text-sm">Businesses could not be loaded.</p>;
  const rows = directory.data.results
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
