"use client";

import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { errorMessage } from "@/shared/api";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import { useMarkAllNotificationsRead, useMarkNotificationRead } from "../api/mutations";
import {
  NOTIFICATION_CATEGORIES,
  useLatestNotifications,
  useNotifications,
  useUnreadCount,
  type Notification,
} from "../api/queries";
import { notificationHref } from "../targets";

import { EmailPreference } from "./email-preference";
import {
  CATEGORY_LABEL,
  CategoryBadge,
  categoryFrom,
  markedToast,
  NotificationText,
  NotificationTime,
} from "./notification-parts";

const ALL = "all";

const READ_FILTERS = [
  { value: null, label: "All" },
  { value: true, label: "Unread" },
  { value: false, label: "Read" },
] as const;

/** `?unread=` as the API's boolean filter. */
function unreadFrom(value: string | null): boolean | null {
  return value === "true" ? true : value === "false" ? false : null;
}

function ItemActions({ notification }: { notification: Notification }) {
  const markRead = useMarkNotificationRead();
  const href = notificationHref(notification);
  const unread = notification.read_at === null;
  return (
    <div className="flex justify-end gap-1">
      {unread ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={markRead.isPending}
          onClick={() => markRead.mutate(notification.id)}
        >
          Mark read
        </Button>
      ) : null}
      {href ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={href} onClick={() => unread && markRead.mutate(notification.id)}>
            <ExternalLink aria-hidden />
            Open
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

/** The signed-in account's inbox, the same in every portal. */
export function NotificationInbox() {
  const { searchParams, set } = useUrlParams();
  const unread = unreadFrom(searchParams.get("unread"));
  const category = categoryFrom(searchParams.get("category"));
  const paging = usePageParam();
  const notifications = useNotifications({ unread, category }, paging);
  const count = useUnreadCount();
  // "Mark all read" anchors on the newest item overall, whatever this page shows, so it
  // covers every unread item without touching ones that arrive later.
  const latest = useLatestNotifications();
  const markAll = useMarkAllNotificationsRead();
  const newest = latest.data?.results[0];
  const hasUnread = (count.data?.unread ?? 0) > 0;

  const columns: DataTableColumns<RowOf<typeof notifications>> = [
    {
      id: "notification",
      header: "Notification",
      cell: (notification) => <NotificationText notification={notification} />,
    },
    {
      id: "category",
      header: "About",
      className: "hidden md:table-cell",
      cell: (notification) => <CategoryBadge category={notification.category} />,
    },
    {
      id: "when",
      header: "When",
      cellClassName: "text-muted-foreground whitespace-nowrap",
      cell: (notification) => <NotificationTime notification={notification} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (notification) => <ItemActions notification={notification} />,
    },
  ];

  return (
    <div className="space-y-4">
      <EmailPreference />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by read state">
          {READ_FILTERS.map((option) => (
            <Button
              key={option.label}
              size="sm"
              variant={unread === option.value ? "secondary" : "ghost"}
              aria-pressed={unread === option.value}
              onClick={() => set({ unread: option.value === null ? null : String(option.value) })}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <Select
          value={category ?? ALL}
          onValueChange={(value) => set({ category: categoryFrom(value) })}
        >
          <SelectTrigger className="w-44" aria-label="Filter by what it is about">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Everything</SelectItem>
            {NOTIFICATION_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value}>
                {CATEGORY_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={!hasUnread || !newest || markAll.isPending}
          onClick={() => newest && markAll.mutate(newest.id, { onSuccess: markedToast })}
        >
          <CheckCheck aria-hidden />
          Mark all read
        </Button>
      </div>
      {markAll.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {errorMessage(markAll.error)}
        </p>
      ) : null}

      <QueryDataTable
        aria-label="Notifications"
        query={notifications}
        columns={columns}
        paging={paging}
        rowKey={(notification) => notification.id}
        empty={
          <EmptyState
            icon={Bell}
            title={
              unread !== null || category ? "No notifications match" : "You have no notifications"
            }
            description={
              unread !== null || category
                ? undefined
                : "Updates about your vouchers, claims and offers appear here."
            }
          />
        }
      />
    </div>
  );
}
