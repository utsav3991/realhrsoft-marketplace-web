import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { PortalLayout } from "@/shared/navigation/portal-shell";

export const metadata: Metadata = {
  title: { default: "Aayulogic Admin", template: "%s · Aayulogic Admin" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout portal="admin" actions={<NotificationBell inboxHref="/admin/notifications" />}>
      {children}
    </PortalLayout>
  );
}
