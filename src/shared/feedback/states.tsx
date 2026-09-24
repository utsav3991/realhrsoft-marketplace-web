"use client";

import { AlertTriangle, Loader2, ShieldOff } from "lucide-react";

import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import { ApiError, errorMessage } from "@/shared/api";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function ForbiddenState() {
  return (
    <EmptyState
      icon={ShieldOff}
      title="You don't have access to this page"
      description="Your account lacks the permission this page needs. Ask a platform administrator if you think this is wrong."
    />
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** Renders any query/mutation failure consistently. 403s get the dedicated forbidden view. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  if (error instanceof ApiError && error.isForbidden) return <ForbiddenState />;
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description={
        <>
          <p>{errorMessage(error)}</p>
          {requestId ? <p className="mt-1 font-mono text-xs">Reference: {requestId}</p> : null}
        </>
      }
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null
      }
    />
  );
}
