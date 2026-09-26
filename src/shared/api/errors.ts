/**
 * RFC 7807 Problem Details as the backend emits them (entrypoints/app.py). Clients branch
 * on `code`, never on `detail` text.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  instance?: string;
  request_id?: string | null;
  detail?: string;
  errors?: { loc: (string | number)[]; msg: string }[];
  /** Operation-specific members, e.g. `claim_id` on ALREADY_CLAIMED. */
  [extension: string]: unknown;
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_FAILED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "UNEXPECTED_RESPONSE"
  | (string & {});

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly title: string;
  readonly detail: string | undefined;
  readonly requestId: string | undefined;
  /** Field name → message, from 422 validation errors (request body fields only). */
  readonly fieldErrors: Readonly<Record<string, string>>;
  /** Problem Details members beyond the standard ones, e.g. `claim_id` on ALREADY_CLAIMED. */
  readonly extensions: Readonly<Record<string, unknown>>;

  constructor(init: {
    status: number;
    code: ApiErrorCode;
    title: string;
    detail?: string;
    requestId?: string;
    fieldErrors?: Record<string, string>;
    extensions?: Record<string, unknown>;
  }) {
    super(init.detail ?? init.title);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.title = init.title;
    this.detail = init.detail;
    this.requestId = init.requestId;
    this.fieldErrors = init.fieldErrors ?? {};
    this.extensions = init.extensions ?? {};
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

function isProblemDetails(body: unknown): body is ProblemDetails {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as ProblemDetails).status === "number" &&
    typeof (body as ProblemDetails).code === "string"
  );
}

function fieldErrorsOf(problem: ProblemDetails): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const error of problem.errors ?? []) {
    const [location, ...path] = error.loc;
    if (location !== "body" || path.length === 0) continue;
    const name = path.join(".");
    fields[name] ??= error.msg;
  }
  return fields;
}

const STANDARD_MEMBERS = new Set([
  "type",
  "title",
  "status",
  "code",
  "instance",
  "request_id",
  "detail",
  "errors",
]);

function extensionsOf(problem: ProblemDetails): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(problem).filter(([name]) => !STANDARD_MEMBERS.has(name)),
  );
}

/** The single path from any failed API interaction to the error type the UI understands. */
export function normalizeApiError(body: unknown, response?: Response): ApiError {
  if (isProblemDetails(body)) {
    return new ApiError({
      status: body.status,
      code: body.code,
      title: body.title,
      detail: body.detail,
      requestId: body.request_id ?? response?.headers.get("x-request-id") ?? undefined,
      fieldErrors: fieldErrorsOf(body),
      extensions: extensionsOf(body),
    });
  }
  if (response) {
    return new ApiError({
      status: response.status,
      code: "UNEXPECTED_RESPONSE",
      title: response.statusText || "Unexpected response",
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }
  return new ApiError({
    status: 0,
    code: "NETWORK_ERROR",
    title: "The server could not be reached",
    detail: body instanceof Error ? body.message : undefined,
  });
}

/** Human-readable message for any thrown value. Never surfaces stack traces. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.detail ?? error.title;
  return "Something went wrong. Please try again.";
}
