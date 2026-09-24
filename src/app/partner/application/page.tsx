import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { PartnerRegistration } from "@/features/partners/components/partner-registration";

export const metadata: Metadata = { title: "Registration" };

/** Owned by the signed-in account (global applicant grants); not scoped to an organization. */
export default function PartnerRegistrationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner registration"
        description="Register your business to become a verified marketplace Partner."
      />
      <PartnerRegistration />
    </div>
  );
}
