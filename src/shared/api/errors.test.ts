import { describe, expect, it } from "vitest";

import { ApiError, normalizeApiError } from "./errors";

describe("normalizeApiError", () => {
  it("maps Problem Details, keeping the stable code and request id", () => {
    const error = normalizeApiError({
      type: "about:blank",
      title: "Conflict",
      status: 409,
      code: "CONFLICT",
      detail: "Role was modified",
      request_id: "req-1",
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "CONFLICT",
      detail: "Role was modified",
      requestId: "req-1",
    });
  });

  it("turns body validation errors into field errors", () => {
    const error = normalizeApiError({
      type: "about:blank",
      title: "Validation failed",
      status: 422,
      code: "VALIDATION_ERROR",
      errors: [
        { loc: ["body", "email"], msg: "too short" },
        { loc: ["query", "limit"], msg: "ignored" },
      ],
    });
    expect(error.fieldErrors).toEqual({ email: "too short" });
  });

  it("handles a non-Problem response", () => {
    const response = new Response("<html>", { status: 502, statusText: "Bad Gateway" });
    expect(normalizeApiError("<html>", response)).toMatchObject({
      status: 502,
      code: "UNEXPECTED_RESPONSE",
    });
  });

  it("handles a network failure", () => {
    expect(normalizeApiError(new TypeError("fetch failed"))).toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });
});
