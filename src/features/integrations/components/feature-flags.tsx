"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { Badge } from "@/design-system/primitives/badge";
import { Card, CardContent } from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Switch } from "@/design-system/primitives/switch";
import { FeatureFlagAdminPermission, useCan } from "@/shared/authorization";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import { useSwitchFeatureFlag } from "../api/mutations";
import { useFeatureFlags, type FeatureFlag } from "../api/queries";

/** What switching each known flag does, shown before the change is confirmed. */
const EFFECTS: Record<string, { on: string; off: string }> = {
  "realhrsoft.sync": {
    on: "RealHRSoft deliveries are accepted again, and queued events and reconciliations resume.",
    off: "RealHRSoft deliveries are refused with 503 (RealHRSoft retries them) and the sync workers pause. Events already received are kept.",
  },
  "realhrsoft.employee_access": {
    on: "RealHRSoft employees can use the marketplace again through RealHRSoft.",
    off: "Every RealHRSoft employee request is refused with 503 at once. Nothing is lost; claims and vouchers are kept.",
  },
  "offers.client_benefit_authoring": {
    on: "Clients can create and change their benefits again.",
    off: "Clients can no longer create or change benefits. Published ones stay visible to employees.",
  },
};

/** The rollout switches. A flag never switched is off. */
export function FeatureFlags() {
  const flags = useFeatureFlags();
  const canManage = useCan(FeatureFlagAdminPermission.FLAG_MANAGE);
  const [switching, setSwitching] = useState<FeatureFlag | null>(null);
  const change = useSwitchFeatureFlag();

  if (flags.isPending) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (flags.isError) return <ErrorState error={flags.error} onRetry={() => void flags.refetch()} />;
  if (flags.data.length === 0) return <EmptyState icon={Flag} title="No feature flags" />;

  const turningOn = switching ? !switching.enabled : false;
  return (
    <>
      <Card>
        <CardContent>
          <ul className="divide-y">
            {flags.data.map((flag) => (
              <li key={flag.key} className="flex flex-wrap items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{flag.key}</span>
                    <Badge intent={flag.enabled ? "success" : "neutral"}>
                      {flag.enabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">{flag.description}</p>
                  {flag.changed_by ? (
                    <p className="text-muted-foreground text-xs">
                      Last switched {formatDateTime(flag.updated_at)} by{" "}
                      <span className="font-mono">{flag.changed_by}</span>
                      {flag.reason ? `: ${flag.reason}` : ""}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">Never switched.</p>
                  )}
                </div>
                <Switch
                  checked={Boolean(flag.enabled)}
                  disabled={!canManage}
                  onCheckedChange={() => setSwitching(flag)}
                  aria-label={`${flag.enabled ? "Turn off" : "Turn on"} ${flag.key}`}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <ReasonDialog
        open={switching !== null}
        onOpenChange={(open) => !open && setSwitching(null)}
        title={`${turningOn ? "Turn on" : "Turn off"} ${switching?.key ?? "this flag"}?`}
        description={
          (switching && EFFECTS[switching.key]?.[turningOn ? "on" : "off"]) ??
          "The change applies to the next request."
        }
        confirmLabel={turningOn ? "Turn on" : "Turn off"}
        destructive={!turningOn}
        onConfirm={async (reason) => {
          if (!switching) return;
          await change.mutateAsync({ key: switching.key, enabled: turningOn, reason });
          toast.success(`${switching.key} turned ${turningOn ? "on" : "off"}`);
        }}
      />
    </>
  );
}
