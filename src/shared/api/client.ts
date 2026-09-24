import createClient from "openapi-fetch";

import type { components, paths } from "@/generated/api/v1";
import { getAccessToken } from "@/shared/auth/token-store";
import { env } from "@/shared/config/env";

import { normalizeApiError } from "./errors";
import { getActiveOrganizationId, isOrganizationScoped } from "./organization-context";

/** Transport DTOs from the backend's OpenAPI contract. Never hand-write these. */
export type Schemas = components["schemas"];

// Cookie-authenticated session calls: they must never trigger a refresh-and-retry.
const SESSION_PATHS = new Set(["/auth/login", "/auth/refresh", "/auth/logout"]);

type AccessTokenRenewer = () => Promise<boolean>;
let renewAccessToken: AccessTokenRenewer = async () => false;

/** Registered by the auth layer, so this module does not depend on the session module. */
export function setAccessTokenRenewer(renewer: AccessTokenRenewer): void {
  renewAccessToken = renewer;
}

function apiPath(request: Request): string {
  const { pathname } = new URL(request.url);
  return pathname.startsWith(env.apiBasePath) ? pathname.slice(env.apiBasePath.length) : pathname;
}

function withContext(request: Request): Request {
  const token = getAccessToken();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
  else request.headers.delete("Authorization");

  const organizationId = isOrganizationScoped(apiPath(request)) ? getActiveOrganizationId() : null;
  if (organizationId) request.headers.set("X-Organization-ID", organizationId);
  else request.headers.delete("X-Organization-ID");

  if (!request.headers.has("X-Request-ID")) {
    request.headers.set("X-Request-ID", crypto.randomUUID());
  }
  return request;
}

async function send(request: Request): Promise<Response> {
  try {
    return await globalThis.fetch(request);
  } catch (cause) {
    throw normalizeApiError(cause);
  }
}

/**
 * Attaches the bearer token, the organization scope (organization-scoped paths only) and a
 * correlation id. An expired access token
 * (401) is renewed once through the refresh cookie and the request replayed once.
 */
export async function apiFetch(request: Request): Promise<Response> {
  const replay = SESSION_PATHS.has(apiPath(request)) ? null : request.clone();
  const response = await send(withContext(request));
  if (response.status !== 401 || !replay) return response;
  if (!(await renewAccessToken())) return response;
  return send(withContext(replay));
}

function baseUrl(): string {
  // openapi-fetch builds absolute Request URLs; resolve the same-origin path in the browser.
  return typeof window === "undefined"
    ? env.apiBasePath
    : new URL(env.apiBasePath, window.location.origin).href;
}

/** The one client for /api/v1. Feature code calls it only from features/<x>/api/*. */
export const api = createClient<paths>({ baseUrl: baseUrl(), fetch: apiFetch });

interface ApiResult {
  data?: unknown;
  error?: unknown;
  response: Response;
}

/** Resolves to the response body, or throws a normalized ApiError. */
export async function unwrap<R extends ApiResult>(
  pending: Promise<R>,
): Promise<Exclude<R["data"], undefined>> {
  const { data, error, response } = await pending;
  if (error !== undefined || !response.ok) throw normalizeApiError(error, response);
  return data as Exclude<R["data"], undefined>;
}
