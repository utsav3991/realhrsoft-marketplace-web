import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap } from "@/shared/api";

import { notificationKeys } from "./queries";

// Both commands are idempotent on the server (an item keeps its first read_at), so a retry
// after a lost response is safe. Each refreshes the badge and every list on settle.

function useRefreshInbox() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkNotificationRead() {
  const refresh = useRefreshInbox();
  return useMutation({
    mutationFn: (notificationId: string) =>
      unwrap(
        api.POST("/me/notifications/{notification_id}/read", {
          params: { path: { notification_id: pathId(notificationId) } },
        }),
      ),
    onSettled: refresh,
  });
}

/**
 * Marks `upToId` and every older unread item read. Pass the newest item the reader was shown,
 * so anything that arrived since stays unread.
 */
export function useMarkAllNotificationsRead() {
  const refresh = useRefreshInbox();
  return useMutation({
    mutationFn: (upToId: string) =>
      unwrap(api.POST("/me/notifications/read-all", { body: { up_to_id: upToId } })),
    onSettled: refresh,
  });
}

/** Turn notification emails on or off; turning them on retires old unsubscribe links. */
export function useSetEmailNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emailEnabled: boolean) =>
      unwrap(api.PATCH("/me/notification-preferences", { body: { email_enabled: emailEnabled } })),
    onSuccess: (preferences) =>
      queryClient.setQueryData(notificationKeys.preferences(), preferences),
  });
}

/** Confirm an email's unsubscribe link; needs no sign-in. */
export function useUnsubscribe() {
  return useMutation({
    mutationFn: (token: string) =>
      unwrap(api.POST("/notifications/unsubscribe", { body: { token } })),
  });
}
