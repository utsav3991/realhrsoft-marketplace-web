import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { NotificationInbox } from "@/features/notifications/components/notification-inbox";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Updates about your enquiries, leads and offers. Open one to see its current state."
      />
      <Suspense>
        <NotificationInbox />
      </Suspense>
    </div>
  );
}
