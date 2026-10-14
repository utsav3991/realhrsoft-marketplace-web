import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { PortalLayout } from "@/shared/navigation/portal-shell";

export const metadata: Metadata = {
  title: { default: "Client Portal", template: "%s · Client Portal" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout portal="client" actions={<NotificationBell inboxHref="/client/notifications" />}>
      {children}
    </PortalLayout>
  );
}
