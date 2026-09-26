"use client";

import { Field } from "@/design-system/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";

import type { PartnerSource } from "../api/queries";
import { SOURCE_HINT, SOURCE_LABEL } from "./partner-details";

const SOURCES = Object.keys(SOURCE_LABEL) as PartnerSource[];

/** Aayulogic's classification of the partner; the portal never sets it. */
export function SourceField({
  value,
  onChange,
}: {
  value: PartnerSource;
  onChange: (source: PartnerSource) => void;
}) {
  return (
    <Field id="partner-source" label="Partner type" hint={SOURCE_HINT[value]}>
      <Select value={value} onValueChange={(next) => onChange(next as PartnerSource)}>
        <SelectTrigger
          id="partner-source"
          className="w-full sm:w-72"
          aria-describedby="partner-source-hint"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SOURCES.map((source) => (
            <SelectItem key={source} value={source}>
              {SOURCE_LABEL[source]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
