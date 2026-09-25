import { Gift } from "lucide-react";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";

export default function EmployerOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Company benefits"
        description="Benefits your organization offers to its own employees."
      />
      <EmptyState
        icon={Gift}
        title="The Employer portal is not available yet"
        description="Company benefits and the Employer profile open once the backend supports them."
      />
    </div>
  );
}
