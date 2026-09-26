import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every operation in the committed OpenAPI snapshot must have a caller, so a backend endpoint
 * cannot land without its frontend integration going unnoticed. Endpoints the frontend
 * deliberately does not call belong in NOT_CALLED, with a reason.
 */
const NOT_CALLED: Readonly<Record<string, string>> = {
  "GET /marketplace/benefit-claims/{claim_id}":
    "Benefit uses have no detail view: history rows already carry every field of the use.",
};

const root = process.cwd();
const apiBase = "/api/v1";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "generated" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const spec = JSON.parse(readFileSync(join(root, "openapi/v1.json"), "utf8")) as {
  paths: Record<string, Record<string, unknown>>;
};

const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.keys(methods).map((method) => `${method.toUpperCase()} ${path.slice(apiBase.length)}`),
);

const called = new Set(
  sourceFiles(join(root, "src")).flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/api\.(GET|POST|PUT|PATCH|DELETE)\(\s*"([^"]+)"/g)].map(
      ([, method, path]) => `${method} ${path}`,
    ),
  ),
);

describe("API contract coverage", () => {
  it("finds the operations in the snapshot", () => {
    expect(operations.length).toBeGreaterThan(0);
  });

  it.each(operations)("%s has a caller", (operation) => {
    if (operation in NOT_CALLED) return;
    expect(called).toContain(operation);
  });

  it("calls nothing outside the contract", () => {
    for (const operation of called) expect(operations).toContain(operation);
  });
});
