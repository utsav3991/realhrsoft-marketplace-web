"use client";

import { UserDetail } from "@/features/identity/components/user-detail";

/** The user page. Employees are RealHRSoft identities, not users, so it has no employment. */
export function UserRecord({ userId }: { userId: string }) {
  return <UserDetail userId={userId} />;
}
