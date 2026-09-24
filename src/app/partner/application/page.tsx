import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { MyApplication } from "@/features/organizations/components/my-application";

export const metadata: Metadata = { title: "Application" };

/** Owned by the signed-in account; not scoped to an organization. */
export default function PartnerApplicationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner application"
        description="Your business's application to become a verified marketplace Partner."
      />
      <MyApplication />
    </div>
  );
}
