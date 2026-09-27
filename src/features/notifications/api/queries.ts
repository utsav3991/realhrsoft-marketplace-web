import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api, unwrap, type Page, type Schemas } from "@/shared/api";

export type Notification = Schemas["Notification"];
export const NOTIFICATION_CATEGORIES = [
  "voucher",
  "redemption",
  "claim",
  "benefit",
  "offer",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface NotificationFilters {
  /** true: only unread; false: only read; null: both. */
  unread: boolean | null;
  category: NotificationCategory | null;
}

/** The newest items the bell shows; also the reference for "mark all read". */
export const LATEST_LIMIT = 8;

// The inbox is the signed-in account's own, whichever portal shows it: keys carry no
// organization. SessionProvider clears the whole cache on sign-in and sign-out, so one
// account's items are never shown to the next.
export const notificationKeys = {
  all: ["notifications"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (filters: NotificationFilters, page: Page) =>
    [...notificationKeys.lists(), filters, page] as const,
  latest: () => [...notificationKeys.lists(), "latest"] as const,
};

/** How often the badge refreshes while the tab is visible (the API suggests about 30 s). */
export const UNREAD_POLL_MS = 30_000;

/**
 * The bell badge. Polls only while the tab is visible (TanStack pauses intervals in hidden
 * tabs) and on focus; a failing poll is not retried, so an outage cannot multiply requests.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: ({ signal }) => unwrap(api.GET("/me/notifications/unread-count", { signal })),
    refetchInterval: UNREAD_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    retry: false,
  });
}

/** The newest items, unfiltered, for the bell panel. */
export function useLatestNotifications({ enabled = true } = {}) {
  return useQuery({
    queryKey: notificationKeys.latest(),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/me/notifications", {
          params: { query: { offset: 0, limit: LATEST_LIMIT } },
          signal,
        }),
      ),
    enabled,
    staleTime: 0,
  });
}

/** One page of the inbox, newest first. */
export function useNotifications(filters: NotificationFilters, page: Page) {
  return useQuery({
    queryKey: notificationKeys.list(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/me/notifications", {
          params: {
            query: {
              unread: filters.unread ?? undefined,
              category: filters.category ?? undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}
