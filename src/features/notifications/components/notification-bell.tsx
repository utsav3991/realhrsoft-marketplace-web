"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/design-system/primitives/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/primitives/popover";
import { errorMessage } from "@/shared/api";

import { useMarkAllNotificationsRead, useMarkNotificationRead } from "../api/mutations";
import {
  notificationKeys,
  useLatestNotifications,
  useUnreadCount,
  type Notification,
} from "../api/queries";
import { notificationHref } from "../targets";

import { markedToast, NotificationText, NotificationTime } from "./notification-parts";

const badgeText = (count: number) => (count > 99 ? "99+" : String(count));

function LatestItem({ notification, onOpen }: { notification: Notification; onOpen: () => void }) {
  const markRead = useMarkNotificationRead();
  const href = notificationHref(notification);
  const unread = notification.read_at === null;
  const content = (
    <>
      <NotificationText notification={notification} clamp />
      <p className="text-muted-foreground pl-4.5 text-xs font-medium">
        <NotificationTime notification={notification} />
      </p>
    </>
  );
  const className = "hover:bg-accent block w-full space-y-1 rounded-md px-2 py-2 text-left";
  // Opening an item reads it. The mark is fire-and-forget: navigation never waits on it.
  const open = () => {
    if (unread) markRead.mutate(notification.id);
    onOpen();
  };

  return (
    <li>
      {href ? (
        <Link href={href} className={className} onClick={open}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className={className}
          onClick={() => unread && markRead.mutate(notification.id)}
          aria-disabled={!unread}
        >
          {content}
        </button>
      )}
    </li>
  );
}

/**
 * The top bar's inbox bell: an unread badge polled while the tab is visible, and the newest
 * items on demand. Every account has an inbox; no permission code gates it.
 */
export function NotificationBell({ inboxHref }: { inboxHref: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const count = useUnreadCount();
  const latest = useLatestNotifications({ enabled: open });
  const markAll = useMarkAllNotificationsRead();
  const unread = count.data?.unread ?? 0;
  const items = latest.data?.results ?? [];

  // A changed count means items arrived or were read elsewhere (another tab): lists refetch
  // the next time they are shown instead of polling themselves.
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (count.data === undefined) return;
    if (seen.current !== null && seen.current !== count.data.unread) {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    }
    seen.current = count.data.unread;
  }, [count.data, queryClient]);

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          title="Notifications"
          className="relative"
        >
          <Bell aria-hidden />
          {unread > 0 ? (
            <span
              className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 min-w-4.5 rounded-full px-1 text-[10px] leading-4.5 font-bold"
              aria-hidden
            >
              {badgeText(unread)}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            disabled={unread === 0 || items.length === 0 || markAll.isPending}
            // The newest item shown: anything newer that arrives meanwhile stays unread.
            onClick={() => {
              const newest = items[0];
              if (newest) markAll.mutate(newest.id, { onSuccess: markedToast });
            }}
          >
            <CheckCheck aria-hidden />
            Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {latest.isPending ? (
            <p role="status" className="text-muted-foreground px-2 py-6 text-center text-sm">
              Loading…
            </p>
          ) : latest.isError ? (
            <p role="alert" className="text-destructive px-2 py-6 text-center text-sm">
              {errorMessage(latest.error)}
            </p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              You have no notifications.
            </p>
          ) : (
            <ul aria-label="Latest notifications" className="space-y-0.5">
              {items.map((notification) => (
                <LatestItem
                  key={notification.id}
                  notification={notification}
                  onOpen={() => setOpen(false)}
                />
              ))}
            </ul>
          )}
          {markAll.isError ? (
            <p role="alert" className="text-destructive px-2 pt-2 text-xs">
              {errorMessage(markAll.error)}
            </p>
          ) : null}
        </div>
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href={inboxHref} onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
