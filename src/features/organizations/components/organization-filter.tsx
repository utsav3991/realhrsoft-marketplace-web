"use client";

import { useState } from "react";

import { FilterCombobox } from "@/design-system/components/filter-combobox";
import { FIRST_PAGE } from "@/shared/api";
import { OrganizationAdminPermission, useCan } from "@/shared/authorization";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useOrganization, useOrganizations } from "../api/queries";

interface OrganizationFilterProps {
  /** What the organization is to this table, e.g. "Employer". */
  label?: string;
  allLabel?: string;
  /** The organization id in the URL, or `null` for every organization. */
  value: string | null;
  onChange: (organizationId: string | null) => void;
}

/**
 * Filters a table by organization, picked by name. Browsing organizations needs
 * organizations.organization.view, so without it the filter is not offered.
 */
export function OrganizationFilter(props: OrganizationFilterProps) {
  const canBrowse = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  return canBrowse ? <OrganizationCombobox {...props} /> : null;
}

function OrganizationCombobox({
  label = "Organization",
  allLabel = "All organizations",
  value,
  onChange,
}: OrganizationFilterProps) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const organizations = useOrganizations({ search: debounced, ordering: "name" }, FIRST_PAGE);
  const selected = useOrganization(value ?? "", { enabled: value !== null });
  return (
    <FilterCombobox
      label={label}
      allLabel={allLabel}
      value={value}
      selectedLabel={selected.data?.name}
      loading={organizations.isPending || search !== debounced}
      options={(organizations.data?.results ?? []).map((organization) => ({
        value: organization.id,
        label: organization.name,
      }))}
      onSearch={setSearch}
      onChange={onChange}
    />
  );
}
