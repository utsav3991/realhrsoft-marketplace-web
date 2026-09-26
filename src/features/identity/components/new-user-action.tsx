"use client";

import { ChevronDown, IdCard, ShieldCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/design-system/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
import type { Schemas } from "@/shared/api";
import { IdentityPermission, useCan } from "@/shared/authorization";
import { FieldsDialog } from "@/shared/components/fields-dialog";

import { useCreateUser } from "../api/mutations";

type ActorType = Schemas["ActorTypeEnum"];

const USER_FIELDS = [
  { name: "email", label: "Email", maxLength: 254 },
  { name: "first_name", label: "First name", maxLength: 50 },
  { name: "last_name", label: "Last name", maxLength: 50 },
  { name: "contact", label: "Contact number", maxLength: 15, optional: true },
] as const;

const KINDS: Record<ActorType, { label: string; title: string; description: string }> = {
  marketplace_staff: {
    label: "Staff account",
    title: "New staff user",
    description:
      "The user receives an email with a link to set their password. The account has no roles until you assign one.",
  },
  employee: {
    label: "Employee account",
    title: "New employee",
    description:
      "The employee receives an email with a link to set their password. They can use the marketplace once you start their employment. The account has no roles.",
  },
};

/** Creates an account of the chosen actor type and emails it a password-setup link. */
export function NewUserAction() {
  const router = useRouter();
  const [kind, setKind] = useState<ActorType | null>(null);
  const create = useCreateUser();
  if (!useCan(IdentityPermission.USER_CREATE)) return null;
  const current = kind ? KINDS[kind] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <UserPlus aria-hidden />
            New user
            <ChevronDown aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setKind("marketplace_staff")}>
            <ShieldCheck aria-hidden />
            {KINDS.marketplace_staff.label}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setKind("employee")}>
            <IdCard aria-hidden />
            {KINDS.employee.label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FieldsDialog
        open={kind !== null}
        onOpenChange={(open) => !open && setKind(null)}
        title={current?.title ?? ""}
        description={current?.description ?? ""}
        confirmLabel="Create user"
        fields={USER_FIELDS}
        onConfirm={async ({ email, first_name, last_name, contact, reason }) => {
          const { id } = await create.mutateAsync({
            email: email ?? "",
            first_name: first_name ?? "",
            last_name: last_name ?? "",
            contact: contact ?? null,
            // Descriptive only: an employee account grants nothing until employed.
            actor_type: kind ?? "marketplace_staff",
            reason,
          });
          toast.success(`Invited ${email}`);
          router.push(`/admin/users/${id}`);
        }}
      />
    </>
  );
}
