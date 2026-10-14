"use client";

import { useState } from "react";

import { Button } from "@/design-system/primitives/button";
import { errorMessage, type Schemas } from "@/shared/api";
import { useSession } from "@/shared/auth";
import { ReasonDialog } from "@/shared/components/reason-dialog";

import { useEndImpersonation, useImpersonate } from "../api/impersonation";

export function ImpersonateAction({ user }: { user: Schemas["UserDetail"] }) {
  const { actor } = useSession();
  const [open, setOpen] = useState(false);
  const start = useImpersonate();
  // This is the explicit superuser capability reported by /auth/me, not a role name.
  if (!actor?.superuser || actor.impersonator || actor.id === user.id || !user.impersonable) {
    return null;
  }
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Sign in as partner
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={`Sign in as ${user.email}?`}
        description="You will use this partner's account with their permissions. Changes are real and are attributed to you in the audit log. This switches your other open tabs too."
        confirmLabel="Sign in as partner"
        onConfirm={(reason) => start.mutateAsync({ user_id: user.id, reason })}
      />
    </>
  );
}

export function ImpersonationBanner() {
  const { actor } = useSession();
  const end = useEndImpersonation();
  if (!actor?.impersonator) return null;
  return (
    <aside
      aria-label="Impersonation session"
      className="bg-warning text-warning-foreground relative z-20 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm"
    >
      <div>
        <p>Signed in as a partner. Actions are recorded as {actor.impersonator.email}.</p>
        {end.isError ? <p role="alert">{errorMessage(end.error)}</p> : null}
      </div>
      <Button variant="outline" disabled={end.isPending} onClick={() => end.mutate()}>
        {end.isPending ? "Returning…" : "Return to administrator"}
      </Button>
    </aside>
  );
}
