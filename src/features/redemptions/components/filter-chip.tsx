"use client";

import { X } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/design-system/primitives/badge";
import { isUuid } from "@/shared/api";

export const uuidParam = (value: string | null) => (value && isUuid(value) ? value : null);

/**
 * A filter set by a link from another record (an offer, an employee) that has no picker here.
 * Shows the short id, linked to the record when the reader may open it, and clears it.
 */
export function FilterChip({
  label,
  id,
  href,
  onClear,
}: {
  label: string;
  id: string;
  /** Where the record opens, or null without permission to view it. */
  href: string | null;
  onClear: () => void;
}) {
  const short = `${id.slice(0, 8)}…`;
  return (
    <Badge intent="outline" className="gap-1.5 py-1.5 pr-1.5">
      {label}:{" "}
      {href ? (
        <Link href={href} className="font-mono hover:underline">
          {short}
        </Link>
      ) : (
        <span className="font-mono">{short}</span>
      )}
      <button
        type="button"
        className="hover:bg-secondary rounded-full p-0.5"
        aria-label={`Clear ${label.toLowerCase()} filter`}
        onClick={onClear}
      >
        <X aria-hidden />
      </button>
    </Badge>
  );
}
