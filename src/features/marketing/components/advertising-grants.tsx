"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Loader2, Plus, Stamp, X } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { DateTimePicker } from "@/design-system/components/date-picker";
import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
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
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Textarea } from "@/design-system/primitives/textarea";
import { OrganizationPicker } from "@/features/offers/components/pickers";
import { OrganizationFilter } from "@/features/organizations/components/organization-filter";
import { errorMessage, isUuid, TABLE_PAGE_SIZE } from "@/shared/api";
import {
  MarketingAdminPermission,
  PartnerMarketingPermission,
  useCan,
  useCanInOrganization,
} from "@/shared/authorization";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDateTime } from "@/shared/lib/format";

import { useCreateGrant, useRevokeGrant } from "../api/mutations";
import {
  GRANT_SORTS,
  useGrants,
  useOwnGrants,
  type AdvertisingGrant,
} from "../api/queries";
import {
  BASIS_LABEL,
  GRANT_BASES,
  GRANT_FIELDS,
  grantBody,
  grantSchema,
  grantState,
  type GrantValues,
} from "../schemas/catalogue";
import { windowLabel } from "./ad-details";

const ALL = "all";

/**
 * Whether the selected organization may submit advertisements now (Q12 interim: an
 * administrator-granted period). Drafts can be prepared either way.
 */
export function AdvertisingEligibility({ organizationId }: { organizationId: string }) {
  const canView = useCanInOrganization(PartnerMarketingPermission.CAMPAIGN_VIEW);
  const grants = useOwnGrants(organizationId, { offset: 0, limit: TABLE_PAGE_SIZE }, { enabled: canView });
  if (!canView || !grants.isSuccess) return null;
  const active = grants.data.results.find((grant) => grant.active);
  if (active) {
    return (
      <Alert>
        <BadgeCheck aria-hidden />
        <AlertTitle>Advertising enabled</AlertTitle>
        <AlertDescription>
          {BASIS_LABEL[active.basis]}
          {active.valid_until ? ` until ${formatDateTime(active.valid_until)}` : ", open-ended"}.
          Submitted advertisements go to Aayulogic review.
        </AlertDescription>
      </Alert>
    );
  }
  const upcoming = grants.data.results.find((grant) => grantState(grant) === "scheduled");
  return (
    <Alert>
      <Stamp aria-hidden />
      <AlertTitle>Advertising is not enabled</AlertTitle>
      <AlertDescription>
        {upcoming
          ? `It starts on ${formatDateTime(upcoming.valid_from)}. `
          : "Contact Aayulogic to enable advertising. "}
        You can prepare campaigns and drafts now; submitting for review needs it enabled.
      </AlertDescription>
    </Alert>
  );
}

/** Every organization's advertising grants, with granting and revocation. */
export function GrantsDirectory() {
  const { searchParams, set } = useUrlParams();
  const activeParam = searchParams.get("active");
  const active = activeParam === "true" ? true : activeParam === "false" ? false : null;
  const organizationParam = searchParams.get("organization_id");
  const organizationId = organizationParam && isUuid(organizationParam) ? organizationParam : null;
  const sort = useSortParam(GRANT_SORTS);
  const paging = usePageParam();
  const grants = useGrants({ active, organizationId, ordering: sort.value }, paging);
  const canManage = useCan(MarketingAdminPermission.GRANT_MANAGE);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState<AdvertisingGrant | null>(null);

  const columns: DataTableColumns<RowOf<typeof grants>> = [
    {
      id: "organization",
      header: "Organization",
      cell: (grant) => (
        <>
          <p className="font-medium">{grant.organization.name}</p>
          {grant.reference ? (
            <p className="text-muted-foreground text-xs">{grant.reference}</p>
          ) : null}
        </>
      ),
    },
    { id: "basis", header: "Basis", cell: (grant) => BASIS_LABEL[grant.basis] },
    {
      id: "window",
      header: "Window",
      sortKey: "valid_from",
      cellClassName: "text-muted-foreground",
      cell: (grant) => windowLabel(grant.valid_from, grant.valid_until),
    },
    {
      id: "status",
      header: "Status",
      cell: (grant) => (
        <>
          <StatusBadge domain="advertisingGrant" status={grantState(grant)} />
          {grant.revocation_reason ? (
            <p className="text-muted-foreground mt-1 max-w-xs text-xs whitespace-pre-line">
              {grant.revocation_reason}
            </p>
          ) : null}
        </>
      ),
    },
    {
      id: "note",
      header: "Note",
      className: "hidden xl:table-cell",
      cellClassName: "text-muted-foreground max-w-xs whitespace-pre-line",
      cell: (grant) => grant.note || "—",
    },
    canManage && {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (grant) =>
        grant.revoked_at ? null : (
          <Button variant="outline" size="sm" onClick={() => setRevoking(grant)}>
            <X aria-hidden />
            Revoke
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={active === null ? ALL : String(active)}
            onValueChange={(value) => set({ active: value === ALL ? null : value })}
          >
            <SelectTrigger className="w-48" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All grants</SelectItem>
              <SelectItem value="true">In force now</SelectItem>
              <SelectItem value="false">Revoked, expired or future</SelectItem>
            </SelectContent>
          </Select>
          <OrganizationFilter
            value={organizationId}
            onChange={(id) => set({ organization_id: id })}
          />
        </div>
        {canManage ? (
          <Button onClick={() => setGranting(true)}>
            <Plus aria-hidden />
            Grant advertising
          </Button>
        ) : null}
      </div>
      <QueryDataTable
        aria-label="Advertising grants"
        query={grants}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(grant) => grant.id}
        empty={
          <EmptyState
            icon={Stamp}
            title="No advertising grants"
            description={
              active !== null || organizationId
                ? "Try different filters."
                : "Grant an organization advertising to let it submit advertisements."
            }
          />
        }
      />
      {granting ? <GrantDialog onClose={() => setGranting(false)} /> : null}
      <RevokeGrantDialog grant={revoking} onClose={() => setRevoking(null)} />
    </div>
  );
}

function RevokeGrantDialog({
  grant,
  onClose,
}: {
  grant: AdvertisingGrant | null;
  onClose: () => void;
}) {
  const revoke = useRevokeGrant(grant?.id ?? "");
  return (
    <ReasonDialog
      open={grant !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Revoke this grant?"
      description={`${grant?.organization.name ?? "The organization"} can no longer submit advertisements for review under it. The reason is kept on the grant.`}
      confirmLabel="Revoke grant"
      destructive
      onConfirm={async (reason) => {
        await revoke.mutateAsync({ reason });
        toast.success("Grant revoked");
      }}
    />
  );
}

function GrantDialog({ onClose }: { onClose: () => void }) {
  const [failure, setFailure] = useState<string | null>(null);
  const create = useCreateGrant();
  const form = useForm<GrantValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: {
      organization: null,
      basis: "paid",
      reference: "",
      validFrom: "",
      validUntil: "",
      reason: "",
    },
  });
  const { isSubmitting } = form.formState;
  const organization = useWatch({ control: form.control, name: "organization" });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await create.mutateAsync(grantBody(values));
      toast.success("Advertising granted");
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form, GRANT_FIELDS)) setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <Form {...form}>
          <form onSubmit={submit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Grant advertising</DialogTitle>
              <DialogDescription>
                Lets the organization submit advertisements for review during the window. It
                is recorded with you as the granting administrator.
              </DialogDescription>
            </DialogHeader>
            {failure ? <FormAlert>{failure}</FormAlert> : null}

            <FormField
              control={form.control}
              name="organization"
              render={({ fieldState }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  {organization ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                      <span className="text-sm">{organization.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => form.setValue("organization", null)}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <OrganizationPicker
                      selected={[]}
                      onAdd={(chosen) =>
                        form.setValue("organization", chosen, { shouldValidate: true })
                      }
                    />
                  )}
                  {fieldState.error ? <FormMessage /> : null}
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="basis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Basis</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger ref={field.ref} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GRANT_BASES.map((option) => (
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
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Reference</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormDescription>Agreement, invoice or approval.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>May be in the past.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Until</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        defaultTime="23:59"
                        clearable
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>Empty is open-ended.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Note</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormDescription>Stored on the grant; partners do not see it.</FormDescription>
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
                Grant advertising
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
