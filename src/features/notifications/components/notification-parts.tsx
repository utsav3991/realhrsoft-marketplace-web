"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/design-system/primitives/badge";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";

import {
  NOTIFICATION_CATEGORIES,
  type Notification,
  type NotificationCategory,
} from "../api/queries";

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  voucher: "Voucher",
  redemption: "Redemption",
  claim: "Claim",
  benefit: "Benefit",
  offer: "Offer",
};

/** `?category=` as a known category, or null for anything else. */
export function categoryFrom(value: string | null): NotificationCategory | null {
  return NOTIFICATION_CATEGORIES.find((category) => category === value) ?? null;
}

/** A category label; an unknown one (a newer backend) shows as sent, still as plain text. */
export function CategoryBadge({ category }: { category: string }) {
  const known = categoryFrom(category);
  return <Badge intent="outline">{known ? CATEGORY_LABEL[known] : category}</Badge>;
}

/** When the event happened, relative, with the exact time on hover and for screen readers. */
export function NotificationTime({ notification }: { notification: Notification }) {
  const exact = formatDateTime(notification.occurred_at);
  return (
    <time dateTime={notification.occurred_at} title={exact}>
      {formatDistanceToNowStrict(new Date(notification.occurred_at), { addSuffix: true })}
    </time>
  );
}

/**
 * Unread marker: a dot plus text for assistive technology, so state is never color alone.
 * Title and body are the API's plain text and render as React text nodes, never as HTML.
 */
export function NotificationText({
  notification,
  clamp = false,
}: {
  notification: Notification;
  clamp?: boolean;
}) {
  const unread = notification.read_at === null;
  return (
    <div className="flex min-w-0 gap-2.5">
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-transparent",
        )}
        aria-hidden
      />
      <div className="min-w-0 space-y-0.5">
        <p className={cn("text-sm break-words", unread ? "font-semibold" : "font-medium")}>
          {unread ? <span className="sr-only">Unread: </span> : null}
          {notification.title}
        </p>
        <p
          className={cn(
            "text-muted-foreground text-xs font-medium break-words",
            clamp && "line-clamp-2",
          )}
        >
          {notification.body}
        </p>
      </div>
    </div>
  );
}

/** Confirms a completed mark-all-read. */
export function markedToast({ marked }: { marked: number }) {
  toast.success(
    marked === 1 ? "Marked 1 notification read" : `Marked ${marked} notifications read`,
  );
}
