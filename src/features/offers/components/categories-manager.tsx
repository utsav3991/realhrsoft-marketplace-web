"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Loader2, Pencil, Plus, RotateCcw, Tags } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
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
  Form,
  FormAlert,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Input } from "@/design-system/primitives/input";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { OfferAdminPermission, useCan } from "@/shared/authorization";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { SearchField } from "@/shared/components/search-field";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import {
  useCreateCategory,
  useReactivateCategory,
  useRetireCategory,
  useUpdateCategory,
} from "../api/mutations";
import { CATEGORY_SORTS, useCategories, useCategory, type OfferCategory } from "../api/queries";
import {
  CATEGORY_FIELDS,
  categoryBody,
  categorySchema,
  EMPTY_CATEGORY,
  type CategoryValues,
} from "../schemas/offer";

const ALL = "all";

/** The category list offers are filed under. Retired, never deleted. */
export function CategoriesManager() {
  const { searchParams, set } = useUrlParams();
  const search = searchParams.get("search") ?? "";
  const state = searchParams.get("state");
  const isActive = state === "active" ? true : state === "retired" ? false : null;
  const sort = useSortParam(CATEGORY_SORTS);
  const paging = usePageParam();
  const categories = useCategories({ search, isActive, ordering: sort.value }, paging);
  const canCreate = useCan(OfferAdminPermission.CATEGORY_CREATE);
  const canUpdate = useCan(OfferAdminPermission.CATEGORY_UPDATE);
  const canRetire = useCan(OfferAdminPermission.CATEGORY_RETIRE);
  const canReactivate = useCan(OfferAdminPermission.CATEGORY_REACTIVATE);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OfferCategory | null>(null);
  const [changing, setChanging] = useState<OfferCategory | null>(null);

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  const columns: DataTableColumns<RowOf<typeof categories>> = [
    {
      id: "name",
      header: "Name",
      sortKey: "name",
      cell: (category) => (
        <>
          <p className="font-medium">{category.name}</p>
          {category.description ? (
            <p className="text-muted-foreground text-xs">{category.description}</p>
          ) : null}
        </>
      ),
    },
    {
      id: "slug",
      header: "Slug",
      sortKey: "slug",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground font-mono text-xs",
      cell: (category) => category.slug,
    },
    {
      id: "order",
      header: "Order",
      sortKey: "sort_order",
      cellClassName: "text-muted-foreground",
      cell: (category) => category.sort_order,
    },
    {
      id: "state",
      header: "State",
      cell: (category) => (
        <StatusBadge domain="offerCategory" status={category.is_active ? "active" : "retired"} />
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-0",
      cell: (category) => (
        <div className="flex justify-end gap-1">
          {canUpdate ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(category)}
              aria-label={`Edit ${category.name}`}
            >
              <Pencil aria-hidden />
              Edit
            </Button>
          ) : null}
          {category.is_active && canRetire ? (
            <Button variant="ghost" size="sm" onClick={() => setChanging(category)}>
              <Archive aria-hidden />
              Retire
            </Button>
          ) : null}
          {!category.is_active && canReactivate ? (
            <Button variant="ghost" size="sm" onClick={() => setChanging(category)}>
              <RotateCcw aria-hidden />
              Reactivate
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField 
            placeholder="Search categories" 
            aria-label="Search categories by name" 
            className="max-w-sm"
          />
          <Select
            value={state === "active" || state === "retired" ? state : ALL}
            onValueChange={(value) => setParam("state", value === ALL ? null : value)}
          >
            <SelectTrigger className="w-40" aria-label="Filter by state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New category
          </Button>
        ) : null}
      </div>

      <QueryDataTable
        aria-label="Offer categories"
        query={categories}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(category) => category.id}
        empty={
          <EmptyState
            icon={Tags}
            title="No categories found"
            description={search || state ? "Try different filters." : undefined}
          />
        }
      />

      <CreateCategoryDialog open={creating} onOpenChange={setCreating} />
      {editing ? (
        <EditCategoryDialog categoryId={editing.id} onClose={() => setEditing(null)} />
      ) : null}
      {changing ? <StateDialog category={changing} onClose={() => setChanging(null)} /> : null}
    </div>
  );
}

function CreateCategoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateCategory();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <CategoryForm
            title="New category"
            description="Partners and administrators file offers under it once it exists."
            submitLabel="Create category"
            defaultValues={EMPTY_CATEGORY}
            onSubmit={async (values) => {
              const category = await create.mutateAsync(categoryBody(values));
              toast.success(`Created ${category.name}`);
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Loads the latest version first, so the edit is not made against a stale row. */
function EditCategoryDialog({ categoryId, onClose }: { categoryId: string; onClose: () => void }) {
  const category = useCategory(categoryId);
  const update = useUpdateCategory(categoryId);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {category.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : category.isError ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit category</DialogTitle>
            </DialogHeader>
            <ErrorState error={category.error} onRetry={() => void category.refetch()} />
          </>
        ) : (
          <CategoryForm
            title={`Edit ${category.data.name}`}
            description="Renaming keeps every offer filed under it."
            submitLabel="Save changes"
            defaultValues={{
              name: category.data.name,
              slug: category.data.slug,
              description: category.data.description,
              sortOrder: String(category.data.sort_order),
              reason: "",
            }}
            onSubmit={async (values) => {
              await update.mutateAsync({
                ...categoryBody(values),
                expected_version: category.data.version,
              });
              toast.success("Category saved");
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  title,
  description,
  submitLabel,
  defaultValues,
  onSubmit,
}: {
  title: string;
  description: string;
  submitLabel: string;
  defaultValues: CategoryValues;
  onSubmit: (values: CategoryValues) => Promise<unknown>;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<CategoryValues>({ resolver: zodResolver(categorySchema), defaultValues });
  const { isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, CATEGORY_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="grid gap-5">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {failure ? <FormAlert>{failure}</FormAlert> : null}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>Slug</FormLabel>
                <FormControl>
                  <Input className="font-mono" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormDescription>Generated from the name when empty.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sortOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display order</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormDescription>Lower numbers show first.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Description</FormLabel>
              <FormControl>
                <Textarea rows={2} disabled={isSubmitting} {...field} />
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
                <Textarea rows={2} disabled={isSubmitting} {...field} />
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
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function StateDialog({ category, onClose }: { category: OfferCategory; onClose: () => void }) {
  const retire = useRetireCategory(category.id);
  const reactivate = useReactivateCategory(category.id);
  const retiring = category.is_active;
  return (
    <ReasonDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={retiring ? `Retire ${category.name}?` : `Reactivate ${category.name}?`}
      description={
        retiring
          ? "New and edited offers can no longer use it. Approved offers already in it stay visible until they expire."
          : "Offers can use it again."
      }
      confirmLabel={retiring ? "Retire category" : "Reactivate category"}
      destructive={retiring}
      onConfirm={async (reason) => {
        const body = { reason, expected_version: category.version };
        await (retiring ? retire : reactivate).mutateAsync(body);
        toast.success(retiring ? "Category retired" : "Category reactivated");
      }}
    />
  );
}
