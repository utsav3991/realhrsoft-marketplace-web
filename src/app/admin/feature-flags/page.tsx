import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { FeatureFlags } from "@/features/integrations/components/feature-flags";
import { FeatureFlagAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Feature flags" };

export default function AdminFeatureFlagsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature flags"
        description="Rollout switches for the RealHRSoft integration and client benefits. Each change takes effect on the next request and is audited with its reason."
      />
      <RequirePermission anyOf={[FeatureFlagAdminPermission.FLAG_VIEW]}>
        <FeatureFlags />
      </RequirePermission>
    </div>
  );
}
