import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { PortalLayout } from "@/shared/navigation/portal-shell";

export const metadata: Metadata = {
  title: { default: "Marketplace", template: "%s · Marketplace" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout
      portal="marketplace"
      actions={<NotificationBell inboxHref="/marketplace/notifications" />}
    >
      {children}
    </PortalLayout>
  );
}
