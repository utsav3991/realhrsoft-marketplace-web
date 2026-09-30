"use client";

import { Label } from "@/design-system/primitives/label";
import { Switch } from "@/design-system/primitives/switch";
import { errorMessage } from "@/shared/api";

import { useSetEmailNotifications } from "../api/mutations";
import { useNotificationPreferences } from "../api/queries";

/** The account's email switch. In-app notifications are always on, so only email toggles. */
export function EmailPreference() {
  const preferences = useNotificationPreferences();
  const setEmail = useSetEmailNotifications();
  const data = preferences.data;

  if (preferences.isError) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {errorMessage(preferences.error)}
      </p>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Switch
        id="notification-email"
        checked={data?.email_enabled ?? false}
        disabled={!data || setEmail.isPending}
        onCheckedChange={(checked) => setEmail.mutate(checked)}
      />
      <div className="space-y-0.5">
        <Label htmlFor="notification-email">Also email me</Label>
        <p className="text-muted-foreground text-xs">
          {data
            ? `Some notifications, such as a new company benefit, are also sent to ${data.email}. `
            : "Loading… "}
          Notifications always appear here, whatever you choose.
        </p>
        {setEmail.isError ? (
          <p role="alert" className="text-destructive text-xs">
            {errorMessage(setEmail.error)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
