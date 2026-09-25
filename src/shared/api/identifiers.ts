const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a canonical UUID, the only identifier shape the API accepts in a path. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/**
 * Guards a path parameter before it reaches a request. openapi-fetch percent-encodes path
 * values, but "." and ".." survive encoding and the URL parser resolves them, so an id taken
 * from the address bar could redirect an authenticated call to another endpoint
 * (client-side path traversal). Only UUIDs pass.
 */
export function pathId(value: string): string {
  if (!isUuid(value)) throw new TypeError("Invalid resource identifier");
  return value;
}

const TOKEN = /^[A-Za-z0-9_-]{1,200}$/;

/**
 * Guards an opaque, URL-safe path segment such as a password-setup link's uidb64 and token.
 * Like `pathId`, it rejects "." and "..", so the value cannot retarget the request.
 */
export function pathToken(value: string): string {
  if (!TOKEN.test(value)) throw new TypeError("Invalid path token");
  return value;
}

export function isPathToken(value: string): boolean {
  return TOKEN.test(value);
}
