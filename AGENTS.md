# Frontend — Codex Instructions (realhrsoft-marketplace-web)

> Codex equivalent of `realhrsoft-marketplace-web/CLAUDE.md`.
> Also read the root `AGENTS.md` for project-wide rules.
> If these two files diverge, `CLAUDE.md` is authoritative.

## What this project is

Four Next.js 14 (App Router, TypeScript, Tailwind) portals:
- `partner-portal` — SSR/ISR, standalone Node container
- `employer-portal` — SSR/ISR, standalone Node container
- `admin-console` — SSR/ISR, standalone Node container
- `employee-embed` — **STATIC EXPORT ONLY** (renders in RealHRsoft iframe)

## Before making any change

1. Read `realhrsoft-marketplace-web/CLAUDE.md` for portal-specific rules.
2. Check which portal you're in. `employee-embed` has stricter rules than the others.
3. Check `components/ui/` for existing components before creating new ones.

## Critical rule: employee-embed is static only

In `employee-embed/`: no server components using `cookies()`, `headers()`, server actions, or internal API routes. All data fetching is client-side (React Query / SWR). Auth token from RealHRsoft via `postMessage` or URL param — not cookies.

## Non-negotiable rules

1. **API client only.** Never call the backend API directly. Always go through `lib/api-client.ts`.
2. **`"use client"` as deep as possible.** Don't mark parent layouts as client components.
3. **No inline styles.** All styling via Tailwind utility classes.
4. **No `any`.** TypeScript strict mode. No `@ts-ignore` without a comment.
5. **Type API responses.** Every API response shape has a corresponding TypeScript type in `types/api.ts`.
6. **Loading + error boundaries.** Every async page has `loading.tsx` and `error.tsx`.

## Key commands (run from portal directory)

```bash
npm run dev         # dev server
npm run build       # production build
npm run lint        # ESLint + TypeScript check
npm run type-check  # tsc --noEmit
```

## Codex sandbox rules

- Allowed writes: `partner-portal/`, `employer-portal/`, `admin-console/`, `employee-embed/`
- Read-only: `docs/`, `memory/`, `.claude/`
- Never read: `.env*`, `.env.production`, `*.pem`
