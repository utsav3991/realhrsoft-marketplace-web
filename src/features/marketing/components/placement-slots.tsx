"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import { Checkbox } from "@/design-system/primitives/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/primitives/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
import {
  Form,
  FormAlert,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { MarketingAdminPermission, useCan } from "@/shared/authorization";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { SearchField } from "@/shared/components/search-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import { useCreateSlot, useSlotState, useUpdateSlot } from "../api/mutations";
import { SLOT_SORTS, useSlots, type PlacementSlot } from "../api/queries";
import { CREATIVE_LABEL, CREATIVE_TYPES } from "../schemas/advertisement";
import {
  EMPTY_SLOT,
  SLOT_FIELDS,
  slotBody,
  slotSchema,
  slotValues,
  SURFACE_LABEL,
  SURFACES,
  type SlotValues,
} from "../schemas/catalogue";

const ALL = "all";

const formatLabel = (type: string) =>
  type === "image_banner" || type === "text_card" ? CREATIVE_LABEL[type] : type;

/** The placement slot catalogue: where advertisements may appear, and what fits there. */
export function PlacementSlotsManager() {
  const { searchParams, set } = useUrlParams();
  const search = searchParams.get("search") ?? "";
  const activeParam = searchParams.get("is_active");
  const isActive = activeParam === "true" ? true : activeParam === "false" ? false : null;
  const surface = SURFACES.find((s) => s.value === searchParams.get("surface"))?.value ?? null;
  const sort = useSortParam(SLOT_SORTS);
  const paging = usePageParam();
  const slots = useSlots({ search, isActive, surface, ordering: sort.value }, paging);
  const canManage = useCan(MarketingAdminPermission.SLOT_MANAGE);
  const [editing, setEditing] = useState<PlacementSlot | "new" | null>(null);
  const [toggling, setToggling] = useState<PlacementSlot | null>(null);

  const columns: DataTableColumns<RowOf<typeof slots>> = [
    {
      id: "name",
      header: "Slot",
      sortKey: "name",
      cell: (slot) => (
        <>
          <p className="font-medium">{slot.name}</p>
          <p className="text-muted-foreground font-mono text-xs">{slot.key}</p>
        </>
      ),
    },
    {
      id: "surface",
      header: "Surface",
      className: "hidden md:table-cell",
      cell: (slot) => SURFACE_LABEL[slot.surface],
    },
    {
      id: "size",
      header: "Size",
      cellClassName: "text-muted-foreground tabular-nums",
      cell: (slot) => `${slot.width}×${slot.height}`,
    },
    {
      id: "formats",
      header: "Formats",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (slot) => slot.allowed_creative_types.map(formatLabel).join(", "),
    },
    {
      id: "max",
      header: "At once",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground tabular-nums",
      cell: (slot) => slot.max_ads,
    },
    {
      id: "status",
      header: "Status",
      cell: (slot) => (
        <StatusBadge domain="placementSlot" status={slot.is_active ? "active" : "inactive"} />
      ),
    },
    canManage && {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (slot) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${slot.name}`}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(slot)}>
              <Pencil aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setToggling(slot)}>
              {slot.is_active ? <PowerOff aria-hidden /> : <Power aria-hidden />}
              {slot.is_active ? "Deactivate" : "Reactivate"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField placeholder="Search name" aria-label="Search slots" className="max-w-sm" />
          <Select
            value={surface ?? ALL}
            onValueChange={(value) => set({ surface: value === ALL ? null : value })}
          >
            <SelectTrigger className="w-56" aria-label="Filter by surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Every surface</SelectItem>
              {SURFACES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={isActive === null ? ALL : String(isActive)}
            onValueChange={(value) => set({ is_active: value === ALL ? null : value })}
          >
            <SelectTrigger className="w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canManage ? (
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            New slot
          </Button>
        ) : null}
      </div>
      <QueryDataTable
        aria-label="Placement slots"
        query={slots}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(slot) => slot.id}
        empty={
          <EmptyState
            icon={LayoutTemplate}
            title="No placement slots"
            description={
              search || surface || isActive !== null
                ? "Try different filters."
                : "Run scripts/seed_placement_slots.py or add a slot."
            }
          />
        }
      />
      {editing ? (
        <SlotDialog slot={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
      <SlotStateDialog slot={toggling} onClose={() => setToggling(null)} />
    </div>
  );
}

function SlotStateDialog({ slot, onClose }: { slot: PlacementSlot | null; onClose: () => void }) {
  const change = useSlotState(slot?.id ?? "");
  const deactivating = slot?.is_active ?? true;
  return (
    <ReasonDialog
      open={slot !== null}
      onOpenChange={(open) => !open && onClose()}
      title={deactivating ? "Deactivate this slot?" : "Reactivate this slot?"}
      description={
        deactivating
          ? "New or resubmitted revisions can no longer target it, and a revision under review that targets it cannot be approved."
          : "Revisions can target it again."
      }
      confirmLabel={deactivating ? "Deactivate" : "Reactivate"}
      destructive={deactivating}
      onConfirm={async (reason) => {
        if (!slot) return;
        await change.mutateAsync({
          active: !slot.is_active,
          reason,
          expected_version: slot.version,
        });
        toast.success(deactivating ? "Slot deactivated" : "Slot reactivated");
      }}
    />
  );
}

/** Creating a slot, or editing one (its key never changes). */
function SlotDialog({ slot, onClose }: { slot: PlacementSlot | null; onClose: () => void }) {
  const [failure, setFailure] = useState<string | null>(null);
  const create = useCreateSlot();
  const update = useUpdateSlot(slot?.id ?? "");
  const form = useForm<SlotValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: slot ? slotValues(slot) : EMPTY_SLOT,
  });
  const { isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      if (slot) {
        await update.mutateAsync({ ...slotBody(values), expected_version: slot.version });
        toast.success("Slot saved");
      } else {
        await create.mutateAsync(slotBody(values));
        toast.success("Slot created");
      }
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form, SLOT_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <Form {...form}>
          <form onSubmit={submit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>{slot ? `Edit ${slot.name}` : "New placement slot"}</DialogTitle>
              <DialogDescription>
                Image creatives must match the slot&apos;s aspect ratio and be at least its size.
                Approved revisions keep the content they were reviewed with.
              </DialogDescription>
            </DialogHeader>
            {failure ? <FormAlert>{failure}</FormAlert> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Input
                        className="font-mono"
                        autoComplete="off"
                        spellCheck={false}
                        readOnly={slot !== null}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {slot
                        ? "Keys never change."
                        : "What the marketplace requests, e.g. marketplace.home.top."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="surface"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surface</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger ref={field.ref} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SURFACES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxAds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advertisements at once</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" min={1} max={20} {...field} />
                    </FormControl>
                    <FormDescription>
                      1-20; rotation picks among the eligible at random.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (px)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" min={1} max={4096} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (px)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" min={1} max={4096} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="allowedCreativeTypes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accepted formats</FormLabel>
                  <div className="flex flex-wrap gap-4">
                    {CREATIVE_TYPES.map((option) => {
                      const id = `format-${option.value}`;
                      return (
                        <div key={option.value} className="flex items-center gap-2">
                          <Checkbox
                            id={id}
                            checked={field.value.includes(option.value)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked === true
                                  ? [...field.value, option.value]
                                  : field.value.filter((value) => value !== option.value),
                              )
                            }
                          />
                          <label htmlFor={id} className="text-sm">
                            {option.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Note</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormDescription>Recorded in the audit log.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
                {slot ? "Save slot" : "Create slot"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
