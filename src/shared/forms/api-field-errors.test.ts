import { renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/shared/api";

import { applyApiFieldErrors } from "./api-field-errors";

function setup() {
  return renderHook(() => useForm<{ displayName: string; reason: string }>()).result.current;
}

describe("applyApiFieldErrors", () => {
  it("places mapped 422 field errors on the form", () => {
    const form = setup();
    const error = new ApiError({
      status: 422,
      code: "VALIDATION_ERROR",
      title: "Validation failed",
      fieldErrors: { display_name: "Too long", unrelated: "ignored" },
    });

    expect(applyApiFieldErrors(error, form, { display_name: "displayName" })).toBe(true);
    expect(form.getFieldState("displayName").error?.message).toBe("Too long");
  });

  it("reports false when nothing could be placed", () => {
    const form = setup();
    const conflict = new ApiError({ status: 409, code: "CONFLICT", title: "Conflict" });

    expect(applyApiFieldErrors(conflict, form, { reason: "reason" })).toBe(false);
    expect(applyApiFieldErrors(new Error("boom"), form, { reason: "reason" })).toBe(false);
  });
});
