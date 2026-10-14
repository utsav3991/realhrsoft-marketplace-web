import type { Metadata } from "next";

import { OnboardMerchant } from "@/features/partners/components/onboard-merchant";
import {
  IdentityPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
} from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Onboard merchant" };

/** Needs partner registration plus admission and role grant (the administrator's seat). */
export default function AdminOnboardMerchantPage() {
  return (
    <RequirePermission anyOf={[PartnerAdminPermission.PARTNER_CREATE]}>
      <RequirePermission anyOf={[OrganizationAdminPermission.MEMBERSHIP_MANAGE]}>
        <RequirePermission anyOf={[IdentityPermission.ORGANIZATION_ROLE_MANAGE]}>
          <OnboardMerchant />
        </RequirePermission>
      </RequirePermission>
    </RequirePermission>
  );
}
