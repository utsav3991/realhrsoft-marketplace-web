# Frontend — Codex Instructions (realhrsoft-marketplace-web)

> Codex equivalent of `CLAUDE.md` in this directory. If the two diverge, `CLAUDE.md` is
> authoritative. The governing decision is ADR-013 in
> `realhrsoft-marketplace-api/docs/architecture/adrs/`.

## What this project is

One Next.js 16 app (React 19, TypeScript, Tailwind 4, Yarn 4). Four experiences are route
segments under `src/app/`: `marketplace`, `partner`, `employer` and `admin`, plus `(auth)/login`.
Portal access comes from `/auth/me` permissions (`src/shared/navigation/portals.ts`).

## Non-negotiable rules

1. **One API client.** Call the backend only through `api` + `unwrap` from `@/shared/api`,
   and only inside `src/features/<domain>/api/`. No direct `fetch`.
2. **Same origin, in-memory token.** Never store tokens in web storage or cookies, never add
   a JWT secret, and never decode JWTs. The session comes from `/auth/refresh` and `/auth/me`.
3. **Permissions, not roles.** Gate UI with `can`/`<Can>`/`<RequirePermission>` and codes from
   `permission-codes.ts`. Never branch on role names or `actor_type`.
4. **Generated contract.** Never hand-write DTO types. Run `yarn api:generate`. Only `shared/api`
   imports `@/generated/*`.
5. **Dependency direction:** `app → features → shared/design-system → generated`. ESLint
   enforces this.
6. **Client-side data fetching.** Server Components render static chrome only.
7. **Tailwind with design tokens.** No inline styles, no raw colors. Reuse `design-system/primitives`.
8. **TypeScript strict.** No `any`, no unexplained `@ts-expect-error`.

## Key commands

```bash
yarn dev            # dev server on :3000
yarn check          # lint + type-check + format:check + test
yarn build          # production build
yarn api:generate   # regenerate API types
```

## Codex sandbox rules

- Allowed writes: `src/`, `e2e/`, `scripts/`, `openapi/`
- Read-only: `.claude/`, `.yarn/`
- Never read: `.env*` (except `.env.example`), `*.pem`
