# Frontend — realhrsoft-marketplace-web

## Backend direction — user decision, 2026-09-25

The active backend is `../realhrsoft-marketplace-rest-api` (Django/DRF). The FastAPI project `../realhrsoft-marketplace-api` is paused; do not resume its development or use it as a runtime fallback. Integrate this frontend with Django's actual API, OpenAPI and authentication contracts. Start with the [shared blueprint](../realhrsoft-marketplace-rest-api/docs/blueprints/README.md) and [integration gaps](../realhrsoft-marketplace-rest-api/docs/blueprints/contracts-and-integration.md).

References below to ADRs in the paused repository preserve historical frontend conventions only. They do not make FastAPI the backend authority. Reconcile schema generation, base paths, cookies, current-actor fields and implemented endpoints against Django before claiming integration is complete. Retain existing frontend security and layering conventions unless an explicit integration decision changes them.

**Integration status (2026-09-26).** `openapi/v1.json` is Django's schema (`yarn api:generate --pull` reads `/api/schema/?format=json`). Integrated: auth/session, current actor, users (incl. invite + `/set-password`), roles, permissions, organizations, portal memberships and partners (`features/partners`: admin review queue/assisted intake at `/admin/partners`, self-service registration and profile at `/partner`, one permission code per endpoint/action; administrators classify `source`) and offers (`features/offers`: review queue, publish-on-behalf, suspend/feature at `/admin/offers`, categories at `/admin/offer-categories`, portal authoring at `/partner/offers`; offers need a verified partner). The Partner portal opens for any membership (an organization with no capacity may register itself) and is listed for partner organizations and capacity-less ones. Slice 5 (claims) is integrated: the employee catalogue and My offers at `/marketplace` (`features/claims`; catalogue queries live in `features/offers`) open by **eligibility, not a permission code** (employee account + current employment; the API's 403 renders `MarketplaceErrorState`), claims send a per-attempt `Idempotency-Key`; partner claim verification at `/partner/claims` (`claims.partner_claim.view` looks up/lists, `.confirm` confirms; either opens the page); admin claims at `/admin/claims` (confirm on behalf needs `claims.claim.confirm` + reason) and interim employments at `/admin/employments` (`features/employments`, also a card on employee user pages; user creation offers `actor_type=employee`). Offer analytics is integrated (2026-09-26, `features/analytics`): `/partner/analytics` (`analytics.partner_offer_report.view`; totals only, no employer breakdown) and `/admin/reports` (`analytics.offer_report.view`; adds partner/offer/employer filters and the by-employer table). Period, interval, ordering and filters live in the URL; presets compute dates in `REPORT_TIME_ZONE` (Asia/Kathmandu, the backend TIME_ZONE); each metric has its own bar chart (different scales, no shared axis) with a table view; ads show "not available yet", never zero. Company Benefits (Slice 6) are integrated (2026-09-26, `features/employer-benefits`): the Employer portal opens for memberships whose organization has the Employer capacity (administrators turn it on with a reason on the organization page, `organizations.employer.manage`); `/employer/benefits` lists, creates, edits, publishes and retires own benefits (one `employer_benefits.own_benefit.*` code per action; no review; the audience is always "own employees" and is shown, never sent), `/employer/reports` is the benefit usage report (`analytics.benefit_report.view`; claims and distinct employees only, never mixed with offer metrics); `/admin/company-benefits` moderates (suspend/reinstate with reason, `employer_benefits.benefit.{view,suspend}`); employees use `/marketplace/company-benefits` by eligibility (claiming is the use; per-attempt `Idempotency-Key`; the list's 403 explains eligibility while the claim history stays readable for former employees) and every benefit carries a "Company benefit" badge to keep it apart from offers. Benefit edit forms send the version the edit started from, so a background refetch cannot turn a stale draft into an overwrite. Commercial features were removed with the FastAPI contract; rebuild them against Django endpoints when their slices land. `NEXT_PUBLIC_API_BASE_PATH` must equal Django's `{FORCE_SCRIPT_NAME}/api/v1` (README → API routing and cookies).

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
│   ├── partner/         Partner portal (registration, business profile, verification, offers)
│   ├── employer/        Employer portal (Company Benefits and their usage report)
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
├── design-system/       primitives/ (shadcn-style), components/, styles/globals.css (tokens; spec in DESIGN.md)
└── generated/api/       generated from openapi/v1.json. Never edit by hand
```

**Dependency direction** (ESLint-enforced): `app → features → shared/design-system → generated`.
Only `shared/api` imports `@/generated/*`. Everyone else uses `Schemas` from `@/shared/api`.

---

## Session and API rules

- **Same origin only.** The browser calls `NEXT_PUBLIC_API_BASE_PATH` (`/api/v1` locally,
  `/backend/api/v1` behind `infra/nginx`) on this app's origin. In development Next proxies
  `/api/*` to `API_PROXY_TARGET`. Django's refresh cookie is `SameSite=Strict` and scoped to
  `{FORCE_SCRIPT_NAME}/api/v1/auth`, and refresh/logout require an Origin in
  `DJANGO_TRUSTED_ORIGINS`.
- **The access token lives in memory** (`shared/auth/token-store.ts`), never in storage or a
  readable cookie. A reload restores it with `POST /auth/refresh`. Refreshes are single-flight and
  serialized across tabs, because refresh rotates the cookie secret.
- **The frontend holds no secret and never decodes or verifies JWTs.** Identity and permissions
  come only from `GET /auth/me`.
- **Data fetching is client-side** (TanStack Query in `features/<x>/api/`). The Next server
  never sees the session, so Server Components render static chrome only.
- **Call the API only through `api` + `unwrap` from `@/shared/api`.** The client adds the
  bearer token, `X-Request-ID` and, on organization-scoped paths only (`/auth/me`, `/employer/*`,
  `/partner/*`; see `isOrganizationScoped`),
  `X-Organization-ID`.
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
  `<RequireOrganization capacity=…>` (`"any"` for every selectable membership), which auto-selects a single candidate, asks when there
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

**`DESIGN.md` is the visual spec** (it follows the SHMS frontend, `prabhu-group/shms-frontend`).
Read it before building or restyling UI. `globals.css` and `design-system/primitives` implement
it. Change the token or primitive and `DESIGN.md` together.

- Tailwind utilities with the semantic tokens in `design-system/styles/globals.css`
  (`bg-primary`, `text-muted-foreground`, `bg-success-soft`, …). No raw colors, palette colors
  (`green-600`), arbitrary hex values or inline styles.
- **Shapes:** buttons `rounded-lg`; inputs, selects and sidebar items `rounded-md`; menus and
  alerts `rounded-xl`; cards, table cards and dialogs `rounded-2xl`; badges `rounded-full`.
- **Lime is scarce:** one `default` (primary) button per region (page header, form, dialog
  footer). The rest are `outline`/`secondary`/`ghost`. The black `ink` button is only for
  promotional CTAs on marketplace browsing pages.
- **Ring surfaces:** cards, tables, controls and dialogs are `bg-card border shadow-ring` (a 1px
  ring). Floating panels (menus, selects, popovers) get `shadow-panel`. No drop shadows on cards.
- **Type:** Inter; body weight 600. Titles are `font-semibold tracking-[-0.03em]` (page title
  via `PageHeader`); supporting copy `text-sm font-medium text-muted-foreground`; eyebrows use
  the `kicker` utility.
- **Theme:** light/dark is a class on `<html>` from `next-themes` (toggle in the top bar); style
  dark mode through tokens, not `dark:` overrides. Its script gets the CSP nonce in `app/layout.tsx`.
- **Chrome:** `PortalLayout` renders the shadcn sidebar (`primitives/sidebar.tsx`, collapsible to
  icons, a sheet on mobile) and top bar; pages render inside its `max-w-[1600px]` container, so
  don't add page-level max widths.
- Put ink text (`text-warning-foreground`) on `warning` yellow. Never convey status by color
  alone.
- Reuse `design-system/primitives` before creating a component. Add new primitives in the same
  shadcn style (`components.json` points the shadcn CLI there), then restyle them to `DESIGN.md`.
- Lists render through `DataTable` (`design-system/components/data-table.tsx`) or, for a
  paginated query, `QueryDataTable` (`shared/components/query-data-table.tsx`; type columns
  with `DataTableColumns<RowOf<typeof query>>`). Never hand-assemble `Table` rows.
- **Tables sort and page.** List hooks take a `Page` (`limit`/`offset`) and are one
  `useQuery` per page with `keepPreviousData`; the component gets it from `usePageParam()`
  (`?page=&page_size=`, a prefix such as `"decisions_"` for a second table on the page) and
  passes `paging` to `QueryDataTable`. Server sorting: the feature exports its sortable keys
  (`CLAIM_SORTS`), `useSortParam(KEYS)` reads `?ordering=`, columns set `sortKey`, and the hook
  sends `ordering`. Tables holding every row give columns a `sortValue` too and are sorted and
  paged in the browser. Change search params with `useUrlParams().set`, which sends tables back
  to page 1 on any filter, search or sort change. Pickers use `FIRST_PAGE`. Partner and
  organization filters are `PartnerFilter`/`OrganizationFilter` (hidden without the view
  permission).
- Motion is framer-motion via `design-system/components/motion.tsx` (`FadeIn`,
  `Stagger`/`StaggerItem`) and `tw-animate-css` on overlays. Entry animations are skipped under
  reduced motion; tests run with reduced motion (`vitest.setup.ts`).
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
