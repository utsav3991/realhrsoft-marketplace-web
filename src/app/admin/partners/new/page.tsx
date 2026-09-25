import type { Metadata } from "next";
import { Suspense } from "react";

import { NewPartner } from "@/features/partners/components/new-partner";
import { PartnerAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Register partner" };

export default function AdminNewPartnerPage() {
  return (
    <RequirePermission anyOf={[PartnerAdminPermission.PARTNER_CREATE]}>
      <Suspense>
        <NewPartner />
      </Suspense>
    </RequirePermission>
  );
}
