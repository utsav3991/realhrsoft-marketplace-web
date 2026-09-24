import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Dependency direction (ADR-013): app → features → shared/design-system → generated.
// Only shared/api may touch the generated contract; everything else uses its re-exports.
const layerRules = [
  {
    files: ["src/shared/**", "src/design-system/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/features/*"],
              message: "shared code must not depend on routes or features.",
            },
            { group: ["@/generated/*"], message: "Import API types from @/shared/api instead." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/api/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["src/features/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/app/*"], message: "features must not depend on routes." },
            { group: ["@/generated/*"], message: "Import API types from @/shared/api instead." },
          ],
        },
      ],
    },
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description", "ts-ignore": "allow-with-description" },
      ],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  ...layerRules,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".yarn/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
]);
