"use client";

import { UserEmploymentsCard } from "@/features/employments/components/employments";
import { UserDetail } from "@/features/identity/components/user-detail";

/** The user page, plus the employment card for employee accounts (the only employable ones). */
export function UserRecord({ userId }: { userId: string }) {
  return (
    <UserDetail
      userId={userId}
      renderExtra={(user) =>
        user.actor_type === "employee" ? (
          <UserEmploymentsCard userId={user.id} email={user.email} />
        ) : null
      }
    />
  );
}
