import { Gift } from "lucide-react";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";

export default function EmployerBenefitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Company benefits"
        description="Benefits your organization offers to its own employees."
      />
      <EmptyState icon={Gift} title="Nothing here yet" />
    </div>
  );
}
