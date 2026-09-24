"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/design-system/components/empty-state";
import { Badge } from "@/design-system/primitives/badge";
import { Skeleton } from "@/design-system/primitives/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";

import { useRoles } from "../api/queries";

export function RolesList() {
  const roles = useRoles();

  if (roles.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (roles.isError) {
    return <ErrorState error={roles.error} onRetry={() => void roles.refetch()} />;
  }
  if (roles.data.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No roles defined" />;
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Permissions</TableHead>
            <TableHead className="text-right">Holders</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.data.map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/roles/${role.id}`} className="font-medium hover:underline">
                      {role.display_name}
                    </Link>
                    {role.is_system ? <Badge intent="info">System</Badge> : null}
                    {role.scope === "organization" ? (
                      <Badge intent="outline">Organization</Badge>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">{role.code}</span>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge domain="role" status={role.status} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{role.permissions.length}</TableCell>
              <TableCell className="text-right tabular-nums">{role.active_assignments}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
