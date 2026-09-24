"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/shared/auth";
import { ErrorState, LoadingState } from "@/shared/feedback/states";
import { defaultPortalPath } from "@/shared/navigation/portals";

/** Sends each actor to the first workspace their permissions open, or to sign-in. */
export default function HomePage() {
  const { status, actor, error } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
    if (status === "authenticated") router.replace(defaultPortalPath(actor));
  }, [status, actor, router]);

  if (status === "error") {
    return (
      <div className="p-6">
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  return <LoadingState />;
}
