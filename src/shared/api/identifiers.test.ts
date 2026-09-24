import { describe, expect, it } from "vitest";

import { isUuid, pathId } from "./identifiers";

describe("pathId", () => {
  it("passes canonical UUIDs", () => {
    const id = "7d8f4c1e-0000-4000-8000-000000000001";
    expect(isUuid(id)).toBe(true);
    expect(pathId(id)).toBe(id);
  });

  it.each(["..", ".", "../auth/logout", "abc", "", "7d8f4c1e-0000-4000-8000-000000000001/x"])(
    "rejects %j",
    (value) => {
      expect(isUuid(value)).toBe(false);
      expect(() => pathId(value)).toThrow(TypeError);
    },
  );
});
