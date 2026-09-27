import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { PortalLayout } from "@/shared/navigation/portal-shell";

export const metadata: Metadata = {
  title: { default: "Employer Portal", template: "%s · Employer Portal" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout
      portal="employer"
      actions={<NotificationBell inboxHref="/employer/notifications" />}
    >
      {children}
    </PortalLayout>
  );
}
