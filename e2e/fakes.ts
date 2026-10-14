import type { Route } from "@playwright/test";

/** /auth/me fields of the client hierarchy, for an actor outside every client group. */
export const NO_CLIENT = { client_id: null, client_permissions: [], clients: [] } as const;

/** Background calls every portal makes on its own (the notification bell), answered as an
 * empty inbox. Returns true when it answered, so fakes neither record nor reject them. */
export async function answerAmbient(route: Route, path: string): Promise<boolean> {
  const body =
    path === "/me/notifications/unread-count"
      ? { unread: 0 }
      : path === "/me/notifications"
        ? { count: 0, next: null, previous: null, results: [] }
        : null;
  if (body === null) return false;
  await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  return true;
}
