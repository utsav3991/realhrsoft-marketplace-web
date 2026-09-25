"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/design-system/primitives/button";
import { IdentityPermission, useCan } from "@/shared/authorization";
import { FieldsDialog } from "@/shared/components/fields-dialog";

import { useCreateUser } from "../api/mutations";

const USER_FIELDS = [
  { name: "email", label: "Email", maxLength: 254 },
  { name: "first_name", label: "First name", maxLength: 50 },
  { name: "last_name", label: "Last name", maxLength: 50 },
  { name: "contact", label: "Contact number", maxLength: 15, optional: true },
] as const;

/** Creates a staff account and emails it a password-setup link. Grants no roles. */
export function NewUserAction() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const create = useCreateUser();
  if (!useCan(IdentityPermission.USER_CREATE)) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus aria-hidden />
        New user
      </Button>
      <FieldsDialog
        open={open}
        onOpenChange={setOpen}
        title="New user"
        description="The user receives an email with a link to set their password. The account has no roles until you assign one."
        confirmLabel="Create user"
        fields={USER_FIELDS}
        onConfirm={async ({ email, first_name, last_name, contact, reason }) => {
          const { id } = await create.mutateAsync({
            email: email ?? "",
            first_name: first_name ?? "",
            last_name: last_name ?? "",
            contact: contact ?? null,
            // The only actor type the backend provisions from the console.
            actor_type: "marketplace_staff",
            reason,
          });
          toast.success(`Invited ${email}`);
          router.push(`/admin/users/${id}`);
        }}
      />
    </>
  );
}
