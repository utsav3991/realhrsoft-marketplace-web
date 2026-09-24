# Frontend — realhrsoft-marketplace-web

One Next.js 16 application (App Router, React 19, TypeScript, Tailwind 4, Yarn 4) serving the
four Marketplace experiences as route segments. The governing decision is **ADR-013**
(`realhrsoft-marketplace-api/docs/architecture/adrs/`). Read it before changing auth, the API
client or routing.

---

## Layout

```
src/
├── app/                 routes only: layouts, pages, thin route-local components
│   ├── (auth)/login/
│   ├── marketplace/     employee experience
│   ├── partner/         closed until the backend defines partner permissions
│   ├── employer/        closed until the backend defines employer permissions
│   └── admin/           Aayulogic Admin
├── features/<domain>/   api/ (queries + mutations), components/, schemas/, …
├── shared/
│   ├── api/             the only API client, Problem Details, organization context
│   ├── auth/            in-memory token, session restore/refresh, SessionProvider, /me model
│   ├── authorization/   permission codes, can()/canAny(), <Can>, useCan()
│   ├── navigation/      portal registry, PortalLayout/PortalGate, safe redirects
│   ├── components/      marketplace-wide components (StatusBadge, …)
│   ├── feedback/        Loading/Error/Forbidden states
│   └── config/ lib/
├── design-system/       primitives/ (shadcn-style), components/, styles/globals.css (tokens)
└── generated/api/       generated from openapi/v1.json. Never edit by hand
```

**Dependency direction** (ESLint-enforced): `app → features → shared/design-system → generated`.
Only `shared/api` imports `@/generated/*`. Everyone else uses `Schemas` from `@/shared/api`.

---

## Session and API rules

- **Same origin only.** The browser calls `/api/v1/*` on this app's origin. In development
  Next proxies it to `API_PROXY_TARGET`; when deployed, the ingress routes `/api/*`. The backend
  has no CORS, and its refresh cookie is `SameSite=Strict` and scoped to `/api/v1/auth`.
- **The access token lives in memory** (`shared/auth/token-store.ts`), never in storage or a
  readable cookie. A reload restores it with `POST /auth/refresh`. Refreshes are single-flight and
  serialized across tabs, because refresh rotates the cookie secret.
- **The frontend holds no secret and never decodes or verifies JWTs.** Identity and permissions
  come only from `GET /auth/me`.
- **Data fetching is client-side** (TanStack Query in `features/<x>/api/`). The Next server
  never sees the session, so Server Components render static chrome only.
- **Call the API only through `api` + `unwrap` from `@/shared/api`.** The client adds the
  bearer token, `X-Organization-ID` and `X-Request-ID`, renews once on a 401, and turns every
  failure into `ApiError` (Problem Details `code`). Branch on `code`/`status`, never on `detail` text.
- **Contract changes:** `yarn api:generate --pull` (backend running) updates the snapshot and
  types. Commit both.

## Authorization rules

- Gate on **permission codes** (`shared/authorization/permission-codes.ts`, mirroring the
  backend catalogue). Never gate on role names or `actor_type`.
- `can(actor, code)` accepts only global grants. `can(actor, code, { organizationId })` also
  accepts an organization grant for the selected organization, mirroring the backend.
- Layers: portal (`Portal.canAccess`), page (`<RequirePermission>`), action (`<Can>`/`useCan`),
  and API responses (`ErrorState` renders 403 as forbidden). None of these is security. The API is.
- Add a permission code only when a backend handler enforces it.

## State ownership

| State                 | Owner                                           |
| --------------------- | ----------------------------------------------- |
| Server data           | TanStack Query (`features/<x>/api/`)            |
| Session / actor       | `SessionProvider` (`useSession()`)              |
| Active organization   | `useActiveOrganization()` (per tab)             |
| Search, filters, sort | URL search params                               |
| Forms                 | React Hook Form + Zod (`features/<x>/schemas/`) |
| Transient UI          | component state                                 |

Don't add a global client store without an ADR.

## UI conventions

- Tailwind utilities with the semantic tokens in `design-system/styles/globals.css`
  (`bg-primary`, `text-muted-foreground`, …). No raw colors, no inline styles.
- Reuse `design-system/primitives` before creating a component. Add new primitives in the same
  shadcn style (`components.json` points the shadcn CLI there).
- Domain statuses render only through `StatusBadge` + `STATUS_DEFINITIONS`.
- Confirm a completed mutation with `toast` from `sonner` (the `Toaster` is mounted in
  `app/providers.tsx`). Show failures inline in the form or dialog, not in a toast.
- A page that uses `useSearchParams` sits under `<Suspense>`.
- TypeScript strict with `noUncheckedIndexedAccess`. No `any`. `@ts-expect-error` needs a reason.

## Commands (run from this directory)

```bash
yarn dev             # http://localhost:3000; must match MARKETPLACE_TRUSTED_ORIGINS
yarn build           # production build (standalone)
yarn lint            # ESLint (incl. layer rules)
yarn type-check      # tsc --noEmit
yarn test            # Vitest unit + component tests
yarn test:e2e        # Playwright (starts yarn dev)
yarn api:generate    # regenerate types from openapi/v1.json (--pull to refresh the snapshot)
yarn check           # lint + type-check + format:check + test
```
