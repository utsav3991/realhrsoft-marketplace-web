# Frontend — realhrsoft-marketplace-web

Next.js 14 + TypeScript + Tailwind CSS frontend for the RealHRsoft Workforce Marketplace.

**Root context:** `CLAUDE.md` at the workspace root. Read that first. This file adds frontend-specific detail.

---

## Portal layout

```
realhrsoft-marketplace-web/
├── partner-portal/     # Partner/advertiser portal — SSR/ISR, standalone Node container
├── employer-portal/    # Employer/HR admin portal — SSR/ISR, standalone Node container
├── admin-console/      # Aayulogic admin console — SSR/ISR, standalone Node container
└── employee-embed/     # Employee-facing embed — STATIC EXPORT ONLY (runs in RealHRsoft iframe)
```

Each portal is an independent Next.js application with its own `package.json`, `next.config.ts`, and `app/` directory.

---

## Critical delivery rule: employee-embed is static only

`employee-embed` renders inside RealHRsoft's iframe. It **must** be a static export:
- Next.js config: `output: 'export'`
- **No** server components that use `cookies()`, `headers()`, or other Node-only APIs
- **No** `getServerSideProps` or server actions
- **No** internal Next.js API routes
- All data fetching must be client-side (React Query / SWR)
- Auth token is passed by RealHRsoft via `postMessage` or URL param — not via cookies

The `frontend-component-reviewer` agent enforces this on every edit to `employee-embed/`.

---

## Rendering per portal

| Portal | `output` | Data fetching pattern |
|---|---|---|
| `partner-portal` | `standalone` | Server components for initial data, React Query for mutations/refetch |
| `employer-portal` | `standalone` | Server components for initial data, React Query for mutations/refetch |
| `admin-console` | `standalone` | Server components for initial data, React Query for mutations/refetch |
| `employee-embed` | `export` | React Query / SWR (client-side only) |

---

## API call pattern

**Never call the backend API directly from a component.** Always go through the shared API client:

```typescript
// lib/api-client.ts (one per portal)
// Handles: auth token injection, base URL, error normalization (RFC 7807)
import { apiClient } from '@/lib/api-client'

// In a Server Component (SSR portals):
const offers = await apiClient.get('/api/v1/partner/offers')

// In a Client Component:
const { data } = useQuery({ queryKey: ['offers'], queryFn: () => apiClient.get('/api/v1/partner/offers') })
```

The API client must:
- Attach the portal JWT as `Authorization: Bearer <token>` on every request
- Forward `X-Request-ID` (generate if absent)
- Parse RFC 7807 error responses into typed `ApiError` objects — never expose raw HTTP error details to UI

---

## Next.js App Router conventions

- **Server components** (no `"use client"`): data fetching, layout, static rendering — default for everything
- **Client components** (`"use client"`): interactivity only — forms, modals, dropdowns, real-time updates
- Push `"use client"` as deep as possible. Don't mark a parent layout `"use client"` just because one child needs interactivity.
- **Loading states:** `loading.tsx` for every async page (Next.js Suspense boundary)
- **Error boundaries:** `error.tsx` for every async page
- **Not found:** `not-found.tsx` for every major route group

---

## Tailwind CSS conventions

- Use Tailwind utility classes for all styling. No CSS modules, no styled-components.
- No inline `style={{...}}` unless the value is dynamic and cannot be expressed as a Tailwind class.
- No arbitrary values (`w-[357px]`) unless the value matches a documented design token.
- Design tokens (colors, spacing, typography) defined in each portal's `tailwind.config.ts` — don't hardcode hex colors in class names.
- Shared component patterns live in each portal's `components/ui/` directory — check there before creating new components.

---

## TypeScript conventions

- `strict: true` in every portal's `tsconfig.json` — no exceptions
- No `any` type. No `@ts-ignore` or `@ts-expect-error` without an accompanying explanation comment.
- All API response shapes must have corresponding TypeScript types in `types/api.ts` — generated from the OpenAPI spec where possible
- Props typed with explicit `interface` or `type` — not `{}` or `object`
- Form state: React Hook Form with Zod validation schemas (mirrors the backend Pydantic v2 schemas)

---

## Auth flow per portal

| Portal | Token source | Token storage |
|---|---|---|
| `partner-portal` | Login form → backend `/api/v1/auth/partner/login` | `httpOnly` cookie (managed by Next.js middleware) |
| `employer-portal` | Login form → backend `/api/v1/auth/employer/login` | `httpOnly` cookie |
| `admin-console` | Login form → backend `/api/v1/auth/admin/login` | `httpOnly` cookie |
| `employee-embed` | RealHRsoft SSO → identity handoff | In-memory / `sessionStorage` only (no cookie — no server) |

Middleware in each portal (`middleware.ts`) validates the cookie on every request and redirects to `/login` if invalid.

---

## Key commands (run from `realhrsoft-marketplace-web/<portal>/`)

```bash
npm run dev       # dev server (http://localhost:3000)
npm run build     # production build
npm run start     # production server (standalone portals only)
npm run lint      # ESLint + TypeScript check
npm run type-check # tsc --noEmit
```

---

## Where to look before creating a new component

1. `components/ui/` — base UI elements (Button, Input, Modal, Table, Badge, etc.)
2. `components/<feature>/` — feature-specific composite components
3. `app/<route>/` — page-level components and layouts

If the component you need doesn't exist: create it in `components/ui/` if it's generic, or `components/<feature>/` if it's domain-specific. Use the `/new-frontend-page` command for new pages.
