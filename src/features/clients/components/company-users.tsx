"use client";

import {
  ArrowLeft,
  Building2,
  MailPlus,
  MoreHorizontal,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError } from "@/shared/api";
import { useSelectedClientId, useSession } from "@/shared/auth";
import { ClientAdministrationPermission, useCanInClient } from "@/shared/authorization";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate, formatPersonName } from "@/shared/lib/format";

import { useAddCompanyUser, useEndCompanyUser, useResendCompanyUserSetup } from "../api/mutations";
import {
  useClientCompanies,
  useCompanyUsers,
  type ClientCompany,
  type CompanyUser,
} from "../api/queries";

const OUTCOME: Record<string, string> = {
  created: "Account created; they were emailed a link to set a password.",
  added: "They already had an account and were told they now have access.",
  rejoined: "They already had an account and were told they have access again.",
  role_repaired: "Their company user role was restored.",
  unchanged: "They are already a user of this company.",
};

/** The client's companies, each opening its users. */
export function ClientCompanies() {
  const clientId = useSelectedClientId();
  const companies = useClientCompanies(clientId);

  if (companies.isPending) return <Skeleton className="h-48 w-full" />;
  if (companies.isError)
    return <ErrorState error={companies.error} onRetry={() => void companies.refetch()} />;

  const columns: DataTableColumns<ClientCompany> = [
    {
      id: "company",
      header: "Company",
      sortValue: (company) => company.name,
      cell: (company) => (
        <Link href={`/client/companies/${company.id}`} className="font-medium hover:underline">
          {company.name}
        </Link>
      ),
    },
    {
      id: "employer",
      header: "Benefits",
      cell: (company) =>
        company.employer ? (
          <Badge intent="success">Employer</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Not an employer</span>
        ),
    },
    {
      id: "users",
      header: <span className="sr-only">Users</span>,
      className: "text-right",
      cell: (company) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/client/companies/${company.id}`}>
            <Users aria-hidden />
            Users
          </Link>
        </Button>
      ),
    },
  ];
  return (
    <DataTable
      aria-label="Companies"
      rows={companies.data}
      rowKey={(company) => company.id}
      columns={columns}
      empty={
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="RealHRSoft synchronizes your group's companies here."
        />
      }
    />
  );
}

/**
 * One company's users: people who work in its employer portal (its benefits and benefit
 * reports, nothing client-wide). The client adds a few per company; ending one frees a slot.
 */
export function CompanyUsersPanel({ companyId }: { companyId: string }) {
  const clientId = useSelectedClientId();
  const { actor } = useSession();
  const users = useCompanyUsers(clientId, companyId);
  const canManage = useCanInClient(ClientAdministrationPermission.COMPANY_USER_MANAGE);
  const add = useAddCompanyUser(clientId, companyId);
  const end = useEndCompanyUser(clientId, companyId);
  const resend = useResendCompanyUserSetup(clientId, companyId);
  const [adding, setAdding] = useState(false);
  const [ending, setEnding] = useState<CompanyUser | null>(null);
  const [resending, setResending] = useState<CompanyUser | null>(null);

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/client/companies">
        <ArrowLeft aria-hidden />
        Companies
      </Link>
    </Button>
  );
  if (users.isPending) {
    return (
      <div className="space-y-6">
        {back}
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (users.isError) {
    return (
      <div className="space-y-6">
        {back}
        {users.error instanceof ApiError && users.error.isNotFound ? (
          <EmptyState
            icon={Building2}
            title="Company not found"
            description="It may not be an active company of your group."
          />
        ) : (
          <ErrorState error={users.error} onRetry={() => void users.refetch()} />
        )}
      </div>
    );
  }

  const data = users.data;
  const isSelf = (user: CompanyUser) => user.user_id === actor?.id;
  const columns: DataTableColumns<CompanyUser> = [
    {
      id: "user",
      header: "User",
      cell: (user) => (
        <>
          <p className="font-medium">{user.email}</p>
          <p className="text-muted-foreground text-xs">
            {formatPersonName(user.first_name, user.last_name)}
            {isSelf(user) ? " · You" : ""}
          </p>
        </>
      ),
    },
    {
      id: "password",
      header: "Password",
      cell: (user) =>
        user.password_setup_pending ? (
          <Badge intent="warning">Not set yet</Badge>
        ) : (
          <Badge intent="success">Set</Badge>
        ),
    },
    {
      id: "added",
      header: "Added",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (user) => formatDate(user.verified_at),
    },
    canManage && {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (user) =>
        isSelf(user) ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${user.email}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user.password_setup_pending ? (
                <DropdownMenuItem onSelect={() => setResending(user)}>
                  <MailPlus aria-hidden />
                  Resend setup link
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => setEnding(user)}>
                <UserMinus aria-hidden />
                End access
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        title={data.company_name}
        description={`Users who work in this company's employer portal. ${data.remaining} of ${data.limit} places left.`}
        actions={
          canManage ? (
            <Button onClick={() => setAdding(true)} disabled={data.remaining === 0}>
              <UserPlus aria-hidden />
              Add user
            </Button>
          ) : null
        }
      />
      <DataTable
        aria-label="Company users"
        rows={data.users}
        rowKey={(user) => user.id}
        columns={columns}
        empty={
          <EmptyState
            icon={Users}
            title="No users yet"
            description={`Add up to ${data.limit} people who manage this company's benefits.`}
          />
        }
      />

      <FieldsDialog
        open={adding}
        onOpenChange={setAdding}
        title="Add a company user"
        description="They get this company's benefits and benefit reports in the employer portal. A new account is emailed a link to set a password; an existing one is told it has access."
        confirmLabel="Add user"
        fields={[
          { name: "email", label: "Email" },
          { name: "first_name", label: "First name" },
          { name: "last_name", label: "Last name" },
        ]}
        onConfirm={async ({ email, first_name, last_name, reason }) => {
          const result = await add.mutateAsync({
            email: email ?? "",
            first_name: first_name ?? "",
            last_name: last_name ?? "",
            reason,
          });
          toast.success(OUTCOME[result.outcome] ?? "User added");
        }}
      />

      <ReasonDialog
        open={ending !== null}
        onOpenChange={(open) => !open && setEnding(null)}
        title="End this user's access?"
        description={`${ending?.email ?? "The user"} stops working in this company at once and its place is freed. Their account is kept.`}
        confirmLabel="End access"
        destructive
        onConfirm={async (reason) => {
          if (!ending) return;
          await end.mutateAsync({ membershipId: ending.id, reason });
          toast.success(`Access of ${ending.email} ended`);
        }}
      />

      <ReasonDialog
        open={resending !== null}
        onOpenChange={(open) => !open && setResending(null)}
        title="Resend the setup link?"
        description={`${resending?.email ?? "The user"} gets a new set-password link valid for 24 hours. Earlier links stop working.`}
        confirmLabel="Resend link"
        onConfirm={async (reason) => {
          if (!resending) return;
          await resend.mutateAsync({ membershipId: resending.id, reason });
          toast.success(`Sent a new setup link to ${resending.email}`);
        }}
      />
    </div>
  );
}
