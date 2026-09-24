import { PageHeader } from "@/design-system/components/page-header";

import { AdminOverview } from "./admin-overview";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Platform administration for the marketplace." />
      <AdminOverview />
    </div>
  );
}
