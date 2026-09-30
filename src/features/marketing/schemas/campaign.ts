import { z } from "zod";

import type { Schemas } from "@/shared/api";
import { fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/format";

import type { Campaign, CampaignObjective } from "../api/queries";

// Mirrors marketing/api/v1/serializers.py and services/campaigns.py; the server re-validates.
export const MAX_FLIGHTS = 50;

export const OBJECTIVES: readonly { value: CampaignObjective; label: string }[] = [
  { value: "awareness", label: "Awareness" },
  { value: "traffic", label: "Traffic" },
  { value: "engagement", label: "Engagement" },
  { value: "conversion", label: "Conversion" },
];

export const OBJECTIVE_LABEL = Object.fromEntries(
  OBJECTIVES.map(({ value, label }) => [value, label]),
) as Record<CampaignObjective, string>;

const flightSchema = z.object({
  name: z.string().trim().max(100, "At most 100 characters"),
  startsAt: z.string().min(1, "Choose when the flight starts"),
  endsAt: z.string(),
});

export const campaignSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(150, "At most 150 characters"),
    objective: z.enum(["awareness", "traffic", "engagement", "conversion"]),
    description: z.string().trim().max(2000, "At most 2000 characters"),
    startsAt: z.string(),
    endsAt: z.string(),
    flights: z.array(flightSchema).max(MAX_FLIGHTS, `At most ${MAX_FLIGHTS} flights`),
    reason: z.string().trim().max(500, "Keep the note under 500 characters"),
  })
  .superRefine((values, ctx) => {
    // datetime-local strings of one format compare correctly as text.
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (values.startsAt && values.endsAt && values.endsAt <= values.startsAt)
      issue(["endsAt"], "End after the start");
    values.flights.forEach((flight, index) => {
      if (flight.startsAt && flight.endsAt && flight.endsAt <= flight.startsAt)
        issue(["flights", index, "endsAt"], "End after the start");
      if (values.startsAt && flight.startsAt && flight.startsAt < values.startsAt)
        issue(["flights", index, "startsAt"], "Not before the campaign starts");
      if (values.endsAt) {
        if (!flight.endsAt) issue(["flights", index, "endsAt"], "Required: the campaign ends");
        else if (flight.endsAt > values.endsAt)
          issue(["flights", index, "endsAt"], "Not after the campaign ends");
      }
    });
  });

export type CampaignValues = z.infer<typeof campaignSchema>;
export type FlightValues = CampaignValues["flights"][number];

export const EMPTY_FLIGHT: FlightValues = { name: "", startsAt: "", endsAt: "" };

export const EMPTY_CAMPAIGN: CampaignValues = {
  name: "",
  objective: "awareness",
  description: "",
  startsAt: "",
  endsAt: "",
  flights: [],
  reason: "",
};

/** Request body field → form field, for placing 422 errors. */
export const CAMPAIGN_FIELDS = {
  name: "name",
  objective: "objective",
  description: "description",
  starts_at: "startsAt",
  ends_at: "endsAt",
  flights: "flights",
  reason: "reason",
} as const;

/** PUT semantics: every field is sent, and the flight list replaces the stored one. */
export function campaignBody(values: CampaignValues): Schemas["CampaignInput"] {
  return {
    name: values.name,
    objective: values.objective,
    description: values.description,
    starts_at: fromDateTimeLocal(values.startsAt),
    ends_at: fromDateTimeLocal(values.endsAt),
    // Placements are the only channel so far.
    flights: values.flights.map((flight) => ({
      channel: "placement",
      name: flight.name,
      starts_at: fromDateTimeLocal(flight.startsAt) ?? "",
      ends_at: fromDateTimeLocal(flight.endsAt),
    })),
    reason: values.reason,
  };
}

export function campaignValues(campaign: Campaign): CampaignValues {
  return {
    name: campaign.name,
    objective: campaign.objective,
    description: campaign.description,
    startsAt: toDateTimeLocal(campaign.starts_at),
    endsAt: toDateTimeLocal(campaign.ends_at),
    flights: campaign.flights.map((flight) => ({
      name: flight.name,
      startsAt: toDateTimeLocal(flight.starts_at),
      endsAt: toDateTimeLocal(flight.ends_at),
    })),
    reason: "",
  };
}
