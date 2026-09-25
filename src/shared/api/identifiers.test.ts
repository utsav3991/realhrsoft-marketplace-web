import { describe, expect, it } from "vitest";

import { isPathToken, isUuid, pathId, pathToken } from "./identifiers";

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

describe("pathToken", () => {
  it("passes URL-safe link segments", () => {
    expect(pathToken("MQ")).toBe("MQ");
    expect(pathToken("cz8q2x-3f1e9a0b7c2d")).toBe("cz8q2x-3f1e9a0b7c2d");
  });

  it.each(["..", ".", "a/b", "a.b", "", "a%2Fb"])("rejects %j", (value) => {
    expect(isPathToken(value)).toBe(false);
    expect(() => pathToken(value)).toThrow(TypeError);
  });
});
