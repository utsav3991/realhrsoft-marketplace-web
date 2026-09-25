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

/** ISO timestamp → value for an <input type="datetime-local"> in the viewer's time zone. */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** <input type="datetime-local"> value → ISO 8601 with zone, or null when empty. */
export function fromDateTimeLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** "First Last" from optional name parts, or an em dash when neither is set. */
export function formatPersonName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "—";
}
