"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";

import type { RedemptionSource } from "../api/queries";

import { SOURCE_LABEL, SOURCES, sourceFrom } from "./redemption-details";

const ALL = "all";

/** `?reversed=` as the API's boolean filter. */
export function reversedFrom(value: string | null): boolean | null {
  return value === "true" ? true : value === "false" ? false : null;
}

/** Source and correction filters shared by the partner's and the administrators' receipts. */
export function ReceiptFilters({
  source,
  reversed,
  onChange,
}: {
  source: RedemptionSource | null;
  reversed: boolean | null;
  onChange: (params: Record<string, string | null>) => void;
}) {
  return (
    <>
      <Select
        value={source ?? ALL}
        onValueChange={(value) => onChange({ source: sourceFrom(value) })}
      >
        <SelectTrigger className="w-48" aria-label="Filter by how it was confirmed">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Every confirmation</SelectItem>
          {SOURCES.map((value) => (
            <SelectItem key={value} value={value}>
              {SOURCE_LABEL[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={reversed === null ? ALL : String(reversed)}
        onValueChange={(value) => onChange({ reversed: value === ALL ? null : value })}
      >
        <SelectTrigger className="w-44" aria-label="Filter by correction">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Confirmed and reversed</SelectItem>
          <SelectItem value="false">Confirmed only</SelectItem>
          <SelectItem value="true">Reversed only</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}
