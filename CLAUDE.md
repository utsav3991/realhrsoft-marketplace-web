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
│   ├── partner/         Partner portal: onboarding for any account; offers/profile per organization
│   ├── employer/        Employer portal: Company Benefits per organization
│   └── admin/           Aayulogic Admin
├── features/<domain>/   api/ (queries + mutations), components/, schemas/, …
├── shared/
│   ├── api/             the only API client, Problem Details, organization context
│   ├── auth/            in-memory token, session restore/refresh, SessionProvider, /me model
│   ├── authorization/   permission codes, can()/canAny(), <Can>, useCan()
│   ├── navigation/      portal registry, PortalLayout/PortalGate, organization scope, safe redirects
│   ├── components/      marketplace-wide components (StatusBadge, ReasonDialog, FieldsDialog, …)
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
  bearer token, `X-Request-ID` and, on organization-scoped paths only (`/auth/me`, `/employer/*`,
  `/partner/*` except `/partner/applications*`; see `isOrganizationScoped`), `X-Organization-ID`.
  It renews once on a 401 and turns every failure into `ApiError` (Problem Details `code`).
  Branch on `code`/`status`, never on `detail` text.
- **Contract changes:** `yarn api:generate --pull` (backend running) updates the snapshot and
  types. Commit both.
- **Path ids go through `pathId()`** (and route pages check `isUuid()` and call `notFound()`).
  `..` survives URL encoding, so an unchecked id from the address bar could retarget an
  authenticated call. A contract-coverage test fails when an OpenAPI operation has no caller.
- **Content-Security-Policy is per request** (`src/proxy.ts`): scripts run only with the
  response's nonce, so every page renders dynamically (the root layout awaits `connection()`).
  Never add inline `<script>`, `dangerouslySetInnerHTML` or third-party script origins.

## Authorization rules

- Gate on **permission codes** (`shared/authorization/permission-codes.ts`, mirroring the
  backend catalogue). Never gate on role names or `actor_type`.
- **Scopes never substitute (ADR-014).** `can(actor, code)` accepts only global grants;
  `can(actor, code, { organizationId })` accepts only a grant in that organization when it is the
  selected one. Portal pages and actions use `inOrganization` (`<RequirePermission>`, `<Can>`,
  `NavItem`) or `useCanInOrganization`. A global grant never opens a portal, and an organization
  grant never opens the admin console.
- **Organization selection.** `actor.memberships` (from `/auth/me`) lists the organizations the
  user may select, with their Employer/Partner capacities. Portal pages render inside
  `<RequireOrganization capacity=…>`, which auto-selects a single candidate, asks when there
  are several, and skips organizations the API refused (member without grants). Portal feature
  components read the id with `useSelectedOrganizationId()` and key their queries by it.
  A membership grants nothing by itself.
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
- Every governance decision carries an audited reason: `ReasonDialog`, or `FieldsDialog` when
  it needs a few fields too. Owner actions without a reason use `ConfirmDialog`. Transitions
  send the loaded `version`; a 409 means the record changed, so mutations refetch on settle.
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
