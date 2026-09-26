"use client";

import { useState } from "react";

import { FilterCombobox } from "@/design-system/components/filter-combobox";
import { FIRST_PAGE } from "@/shared/api";
import { PartnerAdminPermission, useCan } from "@/shared/authorization";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { usePartner, usePartners } from "../api/queries";

import { SOURCE_LABEL } from "./partner-details";

interface PartnerFilterProps {
  /** The partner id in the URL, or `null` for every partner. */
  value: string | null;
  onChange: (partnerId: string | null) => void;
}

/**
 * Filters a table by partner, picked by business name. Browsing partners needs
 * partners.partner.view, so without it the filter is not offered (links can still set it).
 */
export function PartnerFilter(props: PartnerFilterProps) {
  const canBrowse = useCan(PartnerAdminPermission.PARTNER_VIEW);
  return canBrowse ? <PartnerCombobox {...props} /> : null;
}

function PartnerCombobox({ value, onChange }: PartnerFilterProps) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const partners = usePartners(
    { search: debounced, status: null, intakePath: null, source: null, ordering: "business_name" },
    FIRST_PAGE,
  );
  const selected = usePartner(value ?? "", { enabled: value !== null });
  return (
    <FilterCombobox
      label="Partner"
      allLabel="All partners"
      value={value}
      selectedLabel={selected.data?.business_name}
      loading={partners.isPending || search !== debounced}
      options={(partners.data?.results ?? []).map((partner) => ({
        value: partner.id,
        label: partner.business_name,
        description: `${partner.organization_name} · ${SOURCE_LABEL[partner.source]}`,
      }))}
      onSearch={setSearch}
      onChange={onChange}
    />
  );
}
