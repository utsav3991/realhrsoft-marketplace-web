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
