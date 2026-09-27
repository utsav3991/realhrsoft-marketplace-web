import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { PortalLayout } from "@/shared/navigation/portal-shell";

export const metadata: Metadata = {
  title: { default: "Partner Portal", template: "%s · Partner Portal" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout
      portal="partner"
      actions={<NotificationBell inboxHref="/partner/notifications" />}
    >
      {children}
    </PortalLayout>
  );
}
