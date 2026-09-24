import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { ApiError } from "@/shared/api";

/**
 * Moves 422 field errors from the API onto form fields. `fields` maps the request body field
 * (snake_case, as the backend reports it) to the form field. Returns true when at least one
 * error was placed, so the caller can skip its generic failure message.
 */
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  form: UseFormReturn<T>,
  fields: Partial<Record<string, Path<T>>>,
): boolean {
  if (!(error instanceof ApiError)) return false;
  let placed = false;
  for (const [apiField, message] of Object.entries(error.fieldErrors)) {
    const formField = fields[apiField.split(".")[0] ?? apiField];
    if (!formField) continue;
    form.setError(formField, { message });
    placed = true;
  }
  return placed;
}
