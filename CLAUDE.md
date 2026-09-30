# Frontend — realhrsoft-marketplace-web

## Backend direction — user decision, 2026-09-25

The active backend is `../realhrsoft-marketplace-rest-api` (Django/DRF). The FastAPI project `../realhrsoft-marketplace-api` is paused; do not resume its development or use it as a runtime fallback. Integrate this frontend with Django's actual API, OpenAPI and authentication contracts. Start with the [shared blueprint](../realhrsoft-marketplace-rest-api/docs/blueprints/README.md) and [integration gaps](../realhrsoft-marketplace-rest-api/docs/blueprints/contracts-and-integration.md).

References below to ADRs in the paused repository preserve historical frontend conventions only. They do not make FastAPI the backend authority. Reconcile schema generation, base paths, cookies, current-actor fields and implemented endpoints against Django before claiming integration is complete. Retain existing frontend security and layering conventions unless an explicit integration decision changes them.

**Integration status (2026-09-26).** `openapi/v1.json` is Django's schema (`yarn api:generate --pull` reads `/api/schema/?format=json`). Integrated: auth/session, current actor, users (incl. invite + `/set-password`), roles, permissions, organizations, portal memberships and partners (`features/partners`: admin review queue/assisted intake at `/admin/partners`, self-service registration and profile at `/partner`, one permission code per endpoint/action; administrators classify `source`) and offers (`features/offers`: review queue, publish-on-behalf, suspend/feature at `/admin/offers`, categories at `/admin/offer-categories`, portal authoring at `/partner/offers`; offers need a verified partner). The Partner portal opens for any membership (an organization with no capacity may register itself) and is listed for partner organizations and capacity-less ones. **Offer platform rebuild (2026-09-27, backend Phases 1–2).** Offers and company benefits are one engine: an `Offer` with immutable `OfferVersion`s (`current_version` live, `working_version` draft/in review). Admin decisions (approve/publish/reject/request-changes) send the reviewed `version_id`; the live version stays live while a replacement is reviewed. Owners retract, unpublish, pause/resume and retire (`offers.partner_offer.{withdraw,pause,retire}`). Terms carry a typed benefit envelope (`features/offers/schemas/benefit-value.ts`, shared with benefits), a presentation method (no QR method: the voucher's QR is proof of use) and an acceptance mode (`auto_accept` or `partner_approval_required` with a decision window). Claims (`features/claims`; catalogue queries live in `features/offers`): the employee catalogue and My offers at `/marketplace` open by **eligibility, not a permission code** (employee account + current employment; the API's 403 renders `MarketplaceErrorState`); employees claim at the version they read (`version_id`; `OFFER_VERSION_CHANGED` refetches) with a per-attempt `Idempotency-Key`, and may cancel a pending request; `/partner/claims` is the decision queue plus every claim (`offers.partner_claim.{view,accept,reject}`), `/partner/claims/[id]` the detail; `/admin/claims` lists both kinds (`offers.claim.{view,accept,reject}`; accepting on behalf needs a reason). Accepted marketplace claims show their voucher (reference, presentation). **Redemptions (2026-09-27, backend Phase 3, `features/redemptions`):** the owner shows a QR on the claim page (`POST /marketplace/vouchers/{id}/credential` only on request, since it is throttled and replaces the last QR; the payload lives in component state only, mutations use `gcTime: 0`; the voucher is polled while the QR is up to notice the use) and lists vouchers at `/marketplace/vouchers`; `/partner/redeem` is the counter (`redemptions.partner_voucher.{validate,confirm}`): the QR text comes from a keyboard-wedge scanner or paste (no camera: `next.config.ts` sends `Permissions-Policy: camera=()`), validate shows the benefit, confirm sends the `scan_reference` (or a typed, normalized `voucher_reference`, never both) with an Idempotency-Key, and a lost response is recovered via `GET /partner/redemptions/operations/{key}`; `/partner/redemptions` lists receipts (`redemptions.partner_redemption.view`); `/admin/vouchers` (confirm on behalf with reason, revoke), `/admin/redemptions` (reverse) and `/admin/redemption-blocks` (`redemptions.{voucher,redemption,block}.*`); blocks are activated from the admin offer and partner pages (`RedemptionControl`). Commands take their key from `useIdempotencyKey` (`shared/hooks`), which keeps it only while the outcome is unknown. **Notifications (2026-09-27, backend Phase 4, `features/notifications`):** every account's own in-app inbox, no permission code and no `X-Organization-ID`. `NotificationBell` sits in every portal's top bar (passed to `PortalLayout` as `actions`, since shared cannot import features): it polls `unread-count` every 30 s only while the tab is visible (no retry) and loads the newest items only when opened; `/{portal}/notifications` is the full inbox (read-state and category filters in the URL). "Mark all read" sends `up_to_id` = the newest item shown, so later arrivals stay unread. Title/body are plain text rendered as text nodes. Links come only from the `TARGET_ROUTES` allowlist in `features/notifications/targets.ts` with a UUID-checked `target_id` (a voucher opens `/marketplace/vouchers/[id]`, which forwards to its claim); add a route there when the backend sends a new `target_type`. `GET /me/notifications/{id}` is deliberately uncalled. When the polled unread count rises, the bell pops up (sonner `toast`, max 3) the newest unread items that arrived, with an Open action; nothing pops up for items already unread on load. Every inbox shows the account's email switch (`/me/notification-preferences`; in-app cannot be turned off). `/notifications/unsubscribe?token=` (public, `(auth)` layout, `no-referrer`) checks the emailed link with GET and unsubscribes only on the button's POST, since mail scanners prefetch links. Interim employments are at `/admin/employments` (`features/employments`, also a card on employee user pages; user creation offers `actor_type=employee`). Offer analytics is integrated (2026-09-26, `features/analytics`): `/partner/analytics` (`analytics.partner_offer_report.view`; totals only, no employer breakdown) and `/admin/reports` (`analytics.offer_report.view`; adds partner/offer/employer filters and the by-employer table). Period, interval, ordering and filters live in the URL; presets compute dates in `REPORT_TIME_ZONE` (Asia/Kathmandu, the backend TIME_ZONE); each metric has its own bar chart (different scales, no shared axis) with a table view; ads show "not available yet", never zero. Company Benefits (`features/employer-benefits`) are `employer_benefit` offers: the Employer portal opens for memberships whose organization has the Employer capacity (administrators turn it on with a reason on the organization page, `organizations.employer.manage`); `/employer/benefits` lists, creates (save or publish), edits, publishes/unpublishes, pauses/resumes and retires own benefits (`offers.own_benefit.*`; no review; editing a live benefit publishes a new version at once; the audience is always "own employees" and is shown, never sent), `/employer/reports` is the benefit usage report (`analytics.benefit_report.view`; claims and distinct employees only, never mixed with offer metrics); `/admin/company-benefits` moderates (suspend/reinstate with reason, `offers.benefit.{view,suspend}`) with version and decision history; employees use `/marketplace/company-benefits` by eligibility (claiming is the use, sent with the `version_id` read and a per-attempt `Idempotency-Key`; the list's 403 explains eligibility while the use history stays readable for former employees) and every benefit carries a "Company benefit" badge to keep it apart from offers. Edit forms send the version the edit started from, so a background refetch cannot turn a stale draft into an overwrite. **Marketing (2026-09-29, backend increment 1, `features/marketing`):** advertising is its own module, never an offer. Screens take a `Workspace` (`{kind:"admin"}` or `{kind:"partner", organizationId}`), so one form and record serve both; `useWorkspaceCan(workspace, capability)` maps each capability to its (global `marketing.*`, organization `marketing.own_*`) code pair. `/admin/advertisements` (review queue `?in_review=true`; approve/reject/request-changes send the reviewed `revision_id`; suspend/reinstate need a reason; submit/retract and edit on behalf with `marketing.ad.manage`), `/admin/campaigns` (create for a verified partner via `?partner=`, edit on behalf; no pause/resume/archive: those are owner controls), `/admin/placement-slots` (catalogue; keys never change; deactivate/reactivate with reason) and `/admin/advertising-grants` (Q12 interim eligibility: grant with basis/window, revoke with reason); `/partner/campaigns` (with flights; pause/resume/archive) and `/partner/advertisements` (save or submit; pause/resume/archive; the approved revision keeps serving while a replacement is drafted or reviewed, Q21). New advertisements start from a campaign (`?campaign=`), which decides the owner. Creative images are private (Q22): uploads are multipart (`uploadAsset`), previews fetch `/creative-assets/{id}/content` with the token and render a `data:` URL; the form checks slot fit (type, aspect ratio within 2%, minimum size) before the API does. Partners see whether advertising is enabled (`AdvertisingEligibility`); submitting without an active grant returns 409 `ADVERTISING_NOT_ELIGIBLE`. **Increment 2 (2026-09-30):** `sponsored-placement.tsx` renders slots by key (`SLOTS`) for employees: the catalogue shows `marketplace.home.top` (or `marketplace.category.top` with a category) above results and `marketplace.offers.inline` cards after the first three offers. Each placement read counts a served impression, so `usePlacement` is not refetched on focus and failures render nothing. Image, `rendered` and `click` carry the placement's `revision_id` (`?slot=&revision=`; images are cached per revision): a 409 `AD_CREATIVE_CHANGED` means a newer revision went live, so the placement is reloaded instead of showing or following it. Images arrive as a data: URL; `rendered` is sent once the creative is ready (image `onLoad`, or a text card) and ≥50% visible, never for a skeleton or failed image; clicking calls `click` and follows only the returned link (internal `/marketplace/…` via the router, external https in a tab opened synchronously for popup blockers). Slot aspect ratios map to static classes (`aspectClass`). Advertisement records show a Delivery card (`ad-performance.tsx`, `?delivery_range=7|30|90`; conversions "Not available"). **Advertisement pages (2026-09-30):** a third destination type `ad_page` gives an advertisement its own page (title, plain-text body, optional button to one of the owner's offers or an https link). Its click returns `/marketplace/ads/[id]?slot=&revision=` (open to every signed-in user), which loads `GET /marketplace/advertisements/{id}/page` with the served slot and revision (`ad-page.tsx`; 409 `AD_CREATIVE_CHANGED` and 404 explain themselves; an offer button is dropped for viewers who cannot open the offer). Admin and partner records show the same layout as an inert "Employee view" preview (`AdPagePreview`). In-grid sponsored cards are tinted and dashed so they never read as offers. **Business (B2B) offers (2026-09-30, `features/business-offers`):** `business_offer` offers one organization makes to others; organizations **enquire** (a lead, no voucher). They live in their own **Business portal** (`/business`, user decision), open to memberships whose organization is a partner or an employer (`RequireOrganization capacity="business"`; the API accepts only a verified partner or an employer and 403s otherwise, which the overview explains). `/business/offers` authors own offers (`offers.own_business_offer.*`; save/submit, retract/unpublish/pause/resume/retire; same review flow and D05 live replacement as marketplace offers), `/business/leads` is the received-enquiry queue (`offers.received_enquiry.{view,manage}`; closing is final and sends an optional note the enquirer sees), `/business/catalogue` browses other businesses' offers (`offers.business_catalogue.view`) and enquires with the `version_id` read (`offers.sent_enquiry.create`; 409 `OFFER_VERSION_CHANGED` refetches, `ENQUIRY_ALREADY_OPEN` and `my_open_enquiry_id` link to the open one), `/business/enquiries` lists sent ones. A selected audience is picked from `GET /business/organizations` (other businesses, names only). The employee switch (`show_to_employees`) adds employee terms (`EmployeeTermsFields`, shared with the offer form) and requires `valid_until`; only an offer posted as a partner may use it (vouchers are partner-bound), so it is disabled for employer posts. Employees then see and claim it in the normal marketplace; claims carry `kind=business_offer`. Administrators use `/admin/business-offers` (review queue, post on behalf of a verified partner `?partner=` or an employer `?organization=`, suspend/reinstate; `offers.offer.*`) and `/admin/business-enquiries` (`offers.business_enquiry.view`). Notifications link `received_enquiry` → `/business/leads/[id]` and `sent_enquiry` → `/business/enquiries/[id]`. Commercial features were removed with the FastAPI contract; rebuild them against Django endpoints when their slices land. `NEXT_PUBLIC_API_BASE_PATH` must equal Django's `{FORCE_SCRIPT_NAME}/api/v1` (README → API routing and cookies).

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
│   ├── business/        Business portal (B2B offers between organizations, enquiries/leads)
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
  `/partner/*`, `/business/*`; see `isOrganizationScoped`),
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
