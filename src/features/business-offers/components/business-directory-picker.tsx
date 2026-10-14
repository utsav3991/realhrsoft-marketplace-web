"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import { Badge } from "@/design-system/primitives/badge";
import { BUSINESS_KIND_LABEL, type AudienceOrganization } from "@/features/offers/schemas/offer";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useBusinessDirectory } from "../api/queries";
import { useBusinessPortal } from "./business-portal";

/**
 * Adds audience businesses from the directory: other verified merchants and active client
 * groups, kind and name only, never the acting business itself.
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
  const { owner } = useBusinessPortal();
  const directory = useBusinessDirectory(owner, search);
  if (directory.isPending) return <p className="text-muted-foreground text-sm">Searching…</p>;
  if (directory.isError)
    return <p className="text-destructive text-sm">Businesses could not be loaded.</p>;
  const rows = directory.data.results
    .filter((o) => !selected.some((s) => s.id === o.id))
    .slice(0, 8);
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">No matches.</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((business) => (
        <li key={business.id} className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="flex items-center gap-2 text-sm">
            {business.name}
            <Badge intent="outline">{BUSINESS_KIND_LABEL[business.kind]}</Badge>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAdd({ id: business.id, name: business.name })}
          >
            <Plus aria-hidden />
            Add
          </Button>
        </li>
      ))}
    </ul>
  );
}
