"use client";

import { KeyRound, ShieldOff, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import { IntegrationAdminPermission, useCan } from "@/shared/authorization";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { QueryDataTable } from "@/shared/components/query-data-table";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { formatDateTime } from "@/shared/lib/format";

import { useCreateAccessDenial, useLiftAccessDenial } from "../api/mutations";
import { useAccessDenials, type AccessDenial } from "../api/queries";

type Kind = AccessDenial["kind"];

const KINDS: Record<Kind, { label: string; title: string; description: string; field: string }> =
  {
    employee: {
      label: "Block an employee",
      title: "Block a RealHRSoft employee",
      description:
        "Every request with any token of this employee is refused (403 ACCESS_BLOCKED) until you lift the block or it expires. Ask RealHRSoft to stop issuing tokens too; synchronized employment is not changed.",
      field: "RealHRSoft employee UUID",
    },
    token: {
      label: "Block a token",
      title: "Block one employee token",
      description:
        "Refuses one leaked token by its jti. Tokens live at most 60 seconds, so the block lasts 5 minutes unless you set an end.",
      field: "Token ID (jti)",
    },
  };

/** Emergency, local blocks on RealHRSoft employee access; newest first. */
export function AccessDenials() {
  const paging = usePageParam();
  const denials = useAccessDenials(paging);
  const canDeny = useCan(IntegrationAdminPermission.EMPLOYEE_ACCESS_DENY);
  const [creating, setCreating] = useState<Kind | null>(null);
  const [lifting, setLifting] = useState<AccessDenial | null>(null);
  const create = useCreateAccessDenial();
  const lift = useLiftAccessDenial();
  const spec = KINDS[creating ?? "employee"];

  const columns: DataTableColumns<AccessDenial> = [
    {
      id: "blocked",
      header: "Blocked",
      cell: (denial) => (
        <>
          <p className="text-sm">{denial.kind === "employee" ? "Employee" : "Token"}</p>
          <p className="text-muted-foreground font-mono text-xs break-all">{denial.value}</p>
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (denial) => (
        <StatusBadge domain="accessDenial" status={denial.active ? "active" : "ended"} />
      ),
    },
    {
      id: "reason",
      header: "Reason",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (denial) => denial.reason,
    },
    {
      id: "until",
      header: "Until",
      cellClassName: "text-muted-foreground",
      cell: (denial) =>
        denial.lifted_at
          ? `Lifted ${formatDateTime(denial.lifted_at)}`
          : denial.expires_at
            ? formatDateTime(denial.expires_at)
            : "Until lifted",
    },
    {
      id: "created",
      header: "Since",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (denial) => formatDateTime(denial.created_at),
    },
    canDeny && {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (denial) =>
        denial.active ? (
          <Button variant="ghost" size="sm" onClick={() => setLifting(denial)}>
            Lift
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      {canDeny ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setCreating("token")}>
            <KeyRound aria-hidden />
            {KINDS.token.label}
          </Button>
          <Button variant="destructive" onClick={() => setCreating("employee")}>
            <UserX aria-hidden />
            {KINDS.employee.label}
          </Button>
        </div>
      ) : null}

      <QueryDataTable
        aria-label="Employee access blocks"
        query={denials}
        columns={columns}
        paging={paging}
        rowKey={(denial) => denial.id}
        empty={
          <EmptyState
            icon={ShieldOff}
            title="No blocks"
            description="Emergency blocks on RealHRSoft employee access appear here."
          />
        }
      />

      <FieldsDialog
        key={creating ?? "closed"}
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        title={spec.title}
        description={spec.description}
        confirmLabel="Block"
        destructive
        fields={[
          {
            name: "value",
            label: spec.field,
            kind: creating === "employee" ? "uuid" : "text",
            maxLength: 255,
          },
          {
            name: "expires_at",
            label: "Ends",
            kind: "datetime",
            optional: true,
            hint:
              creating === "employee"
                ? "Leave empty to block until you lift it."
                : "Leave empty for 5 minutes.",
          },
        ]}
        onConfirm={async ({ value, expires_at, reason }) => {
          if (!creating) return;
          await create.mutateAsync({
            kind: creating,
            value: value ?? "",
            expires_at: expires_at ?? null,
            reason,
          });
          toast.success(creating === "employee" ? "Employee blocked" : "Token blocked");
        }}
      />

      <ReasonDialog
        open={lifting !== null}
        onOpenChange={(open) => !open && setLifting(null)}
        title="Lift this block?"
        description="The next request from this employee or token is accepted again, if RealHRSoft still authorizes it."
        confirmLabel="Lift block"
        onConfirm={async (reason) => {
          if (!lifting) return;
          await lift.mutateAsync({ denialId: lifting.id, reason });
          toast.success("Block lifted");
        }}
      />
    </div>
  );
}
