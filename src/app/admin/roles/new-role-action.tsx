"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/design-system/primitives/button";
import { IdentityPermission, useCan } from "@/shared/authorization";

/** Creating a role needs the catalogue to choose its permissions from. */
export function NewRoleAction() {
  const canCreate = useCan(IdentityPermission.ROLE_CREATE);
  const canViewCatalogue = useCan(IdentityPermission.PERMISSION_VIEW);
  if (!canCreate || !canViewCatalogue) return null;
  return (
    <Button asChild>
      <Link href="/admin/roles/new">
        <Plus aria-hidden />
        New role
      </Link>
    </Button>
  );
}
