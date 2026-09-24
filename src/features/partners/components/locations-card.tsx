"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { errorMessage } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import {
  useAddLocation,
  useRemoveLocation,
  useUpdateLocation,
  type PartnerTarget,
} from "../api/mutations";
import type { PartnerProfile } from "../api/queries";
import {
  LOCATION_FIELDS,
  locationBody,
  locationSchema,
  type LocationValues,
} from "../schemas/partner";
import { FormDialog } from "./form-dialog";
import { TextFields, type TextFieldSpec } from "./text-fields";

type Location = PartnerProfile["locations"][number];

const FIELDS: readonly TextFieldSpec<LocationValues>[] = [
  { name: "label", label: "Label", hint: "For example Head office or Pokhara branch." },
  { name: "countryCode", label: "Country code", hint: "Two letters, such as NP." },
  { name: "line1", label: "Address", wide: true },
  { name: "line2", label: "Address line 2 (optional)", wide: true },
  { name: "city", label: "City" },
  { name: "region", label: "Region (optional)" },
  { name: "postalCode", label: "Postal code (optional)" },
];

/** Locations, editable when an editor (target, loaded version) is given. */
export function LocationsCard({
  locations,
  editor,
}: {
  locations: readonly Location[];
  editor?: { target: PartnerTarget; version: number };
}) {
  const [editing, setEditing] = useState<Location | "new" | null>(null);
  const [removing, setRemoving] = useState<Location | null>(null);
  const remove = useRemoveLocation(editor?.target ?? { kind: "registration", partnerId: "" });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Locations</CardTitle>
          <CardDescription>Where the business operates.</CardDescription>
        </div>
        {editor ? (
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            Add location
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No locations yet.</p>
        ) : (
          <ul className="grid gap-4 text-sm sm:grid-cols-2">
            {locations.map((location) => (
              <li
                key={location.id}
                className="flex items-start justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{location.label}</p>
                  <address className="text-muted-foreground not-italic">
                    <span className="block">{location.line1}</span>
                    {location.line2 ? <span className="block">{location.line2}</span> : null}
                    <span className="block">
                      {[location.city, location.region, location.postal_code]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                    <span className="block">{location.country_code}</span>
                  </address>
                </div>
                {editor ? (
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit location ${location.label}`}
                      onClick={() => setEditing(location)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove location ${location.label}`}
                      onClick={() => setRemoving(location)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {editor && editing ? (
        <LocationDialog
          key={editing === "new" ? "new" : editing.id}
          editor={editor}
          location={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {editor ? (
        <ConfirmDialog
          open={removing !== null}
          onOpenChange={(open) => !open && setRemoving(null)}
          title={`Remove ${removing?.label ?? "location"}?`}
          description="The location is removed from the Partner's profile."
          confirmLabel="Remove"
          destructive
          onConfirm={async () => {
            if (!removing) return;
            await remove.mutateAsync({ locationId: removing.id, version: editor.version });
            toast.success("Location removed");
          }}
        />
      ) : null}
    </Card>
  );
}

function LocationDialog({
  editor,
  location,
  onClose,
}: {
  editor: { target: PartnerTarget; version: number };
  location: Location | null;
  onClose: () => void;
}) {
  const add = useAddLocation(editor.target);
  const update = useUpdateLocation(editor.target);
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      label: location?.label ?? "",
      line1: location?.line1 ?? "",
      line2: location?.line2 ?? "",
      city: location?.city ?? "",
      region: location?.region ?? "",
      postalCode: location?.postal_code ?? "",
      countryCode: location?.country_code ?? "",
    },
  });
  const { isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      const body = locationBody(values, editor.version);
      if (location) {
        await update.mutateAsync({ locationId: location.id, body });
        toast.success("Location updated");
      } else {
        await add.mutateAsync(body);
        toast.success("Location added");
      }
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form, LOCATION_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={location ? "Edit location" : "Add location"}
      submitLabel={location ? "Save location" : "Add location"}
      submitting={isSubmitting}
      failure={failure}
      onSubmit={() => void submit()}
    >
      <TextFields form={form} fields={FIELDS} idPrefix="location" disabled={isSubmitting} />
    </FormDialog>
  );
}
