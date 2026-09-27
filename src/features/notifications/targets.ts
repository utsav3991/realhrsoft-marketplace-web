import { isUuid } from "@/shared/api";

import type { Notification } from "./api/queries";

// Where an item opens. Only target types listed here get a link, and only to an internal
// route built from a validated UUID: the API's target_type/target_id are data, never a URL,
// so an unexpected value renders as plain text instead of an open redirect or a path that
// retargets an authenticated call. Add a route when the backend starts sending a new type.
const TARGET_ROUTES: ReadonlyMap<string, (id: string) => string> = new Map([
  ["voucher", (id: string) => `/marketplace/vouchers/${id}`],
]);

/** The page that shows the item's subject in its current state, or null when it has none. */
export function notificationHref(
  notification: Pick<Notification, "target_type" | "target_id">,
): string | null {
  const { target_type: type, target_id: id } = notification;
  if (!id || !isUuid(id)) return null;
  return TARGET_ROUTES.get(type)?.(id) ?? null;
}
