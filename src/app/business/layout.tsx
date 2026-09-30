import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { PortalLayout } from "@/shared/navigation/portal-shell";

export const metadata: Metadata = {
  title: { default: "Business Portal", template: "%s · Business Portal" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout
      portal="business"
      actions={<NotificationBell inboxHref="/business/notifications" />}
    >
      {children}
    </PortalLayout>
  );
}
