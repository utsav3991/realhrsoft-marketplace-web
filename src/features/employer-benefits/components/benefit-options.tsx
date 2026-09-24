"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import type { Schemas } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

import {
  useAddBenefitOption,
  useRemoveBenefitOption,
  useUpdateBenefitOption,
} from "../api/benefits";
import { EMPTY_OPTION, optionFields, optionValues } from "../schemas/benefit";
import { OptionDialog } from "./option-dialog";

type Benefit = Schemas["BenefitResponse"];
type Option = Schemas["OptionResponse"];

/**
 * A benefit's options (variants). They are part of the benefit: every change sends the loaded
 * benefit version, and a retired benefit's options are read-only.
 */
export function BenefitOptions({
  organizationId,
  benefit,
  canEdit,
}: {
  organizationId: string;
  benefit: Benefit;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<Option | "new" | null>(null);
  const [removing, setRemoving] = useState<Option | null>(null);
  const add = useAddBenefitOption(organizationId, benefit.id);
  const update = useUpdateBenefitOption(organizationId, benefit.id);
  const remove = useRemoveBenefitOption(organizationId, benefit.id);
  const editable = canEdit && benefit.status !== "retired";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Options</CardTitle>
        {editable ? (
          <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            Add option
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {benefit.options.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No options. Add some if the benefit comes in tiers or variants.
          </p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Option</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Offered</TableHead>
                  {editable ? (
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {benefit.options.map((option) => (
                  <TableRow key={option.id}>
                    <TableCell>
                      <div className="font-medium">{option.name}</div>
                      {option.description ? (
                        <div className="text-muted-foreground text-xs whitespace-pre-line">
                          {option.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{option.value ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {option.is_active ? "Yes" : "No"}
                    </TableCell>
                    {editable ? (
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit option ${option.name}`}
                          onClick={() => setEditing(option)}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove option ${option.name}`}
                          onClick={() => setRemoving(option)}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <OptionDialog
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        mode={editing === "new" ? "add" : "edit"}
        initial={editing && editing !== "new" ? optionValues(editing) : EMPTY_OPTION}
        onSubmit={async (values) => {
          if (editing === "new") {
            await add.mutateAsync({ ...optionFields(values), version: benefit.version });
            toast.success("Option added");
          } else if (editing) {
            await update.mutateAsync({
              optionId: editing.id,
              body: {
                ...optionFields(values),
                is_active: values.isActive,
                version: benefit.version,
              },
            });
            toast.success("Option saved");
          }
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this option?"
        description={`“${removing?.name ?? ""}” is removed from the benefit. To stop offering it but keep it, edit it instead.`}
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          await remove.mutateAsync({ optionId: removing.id, version: benefit.version });
          toast.success("Option removed");
        }}
      />
    </Card>
  );
}
