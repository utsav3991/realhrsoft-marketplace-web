const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Formats an ISO timestamp from the API as a date in the viewer's locale. */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Formats an ISO timestamp from the API as a date and time in the viewer's locale. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}
