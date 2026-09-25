# Frontend — Codex Instructions (realhrsoft-marketplace-web)

## Backend direction — user decision, 2026-09-25

The active backend is `../realhrsoft-marketplace-rest-api` (Django/DRF). The FastAPI project `../realhrsoft-marketplace-api` is paused; do not resume its development or use it as a runtime fallback. Integrate this frontend with Django's actual API, OpenAPI and authentication contracts. Start with the [shared blueprint](../realhrsoft-marketplace-rest-api/docs/blueprints/README.md) and [integration gaps](../realhrsoft-marketplace-rest-api/docs/blueprints/contracts-and-integration.md).

References below to ADRs in the paused repository preserve historical frontend conventions only. They do not make FastAPI the backend authority. Reconcile schema generation, base paths, cookies, current-actor fields and implemented endpoints against Django before claiming integration is complete. Retain existing frontend security and layering conventions unless an explicit integration decision changes them.

**Integration status (2026-09-25).** `openapi/v1.json` is Django's schema (`yarn api:generate --pull` reads `/api/schema/?format=json`). Integrated: auth/session, current actor, users (incl. invite + `/set-password`), roles, permissions, organizations, portal memberships and partners (`features/partners`: admin review queue/assisted intake at `/admin/partners`, self-service registration and profile at `/partner`, one permission code per endpoint/action). The Partner portal opens for any membership (an organization with no capacity may register itself) and is listed for partner organizations and capacity-less ones. Offers, employer-benefits and commercial features were removed with the FastAPI contract; the Employer portal renders a "not available yet" state and opens only for Employer capacity, which Django does not provision yet. Rebuild those features from git history against Django endpoints when the slices land. `NEXT_PUBLIC_API_BASE_PATH` must equal Django's `{FORCE_SCRIPT_NAME}/api/v1` (README → API routing and cookies).

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
7. **Tailwind with design tokens, per `DESIGN.md`.** No inline styles, no raw or palette colors.
   Reuse `design-system/primitives`. Buttons, tabs and badges are `rounded-full`. Use one cobalt
   `default` button per region, and the `ink` variant only for marketplace promos. Cards are flat
   (`border`, no shadow), and only floating layers get `shadow-panel`. No `font-semibold`.
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
