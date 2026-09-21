---
description: Scaffold a Next.js page or component in the correct frontend portal
argument-hint: <portal> <page-name>
---

Scaffold a new Next.js page or component named `$2` in the `$1` portal (`$1/`).

Before writing anything:
1. Read `CLAUDE.md` for the portal-specific rules (SSR vs. static-export, API client conventions, Tailwind guidelines).
2. Check `$1/app/` for existing page structure to match the routing convention already in use.
3. Check `$1/components/` for existing components to reuse before creating new ones.

**Portal rules (enforce strictly):**

| Portal | Rendering | Node APIs | Backend calls |
|---|---|---|---|
| `partner-portal` | SSR/ISR allowed | Yes | Via shared API client |
| `employer-portal` | SSR/ISR allowed | Yes | Via shared API client |
| `admin-console` | SSR/ISR allowed | Yes | Via shared API client |
| `employee-embed` | **Static export only** | **No** | Via shared API client (client-side only) |

**Required structure for a new page:**
- Server component for data fetching (in `app/` directory)
- Client components only where interactivity is needed (marked with `"use client"`)
- Pydantic-compatible TypeScript type for the API response (in `types/` or `lib/`)
- Loading skeleton (`loading.tsx`) for any async page
- Error boundary (`error.tsx`) for any async page

After scaffolding, offer to invoke the `frontend-component-reviewer` agent on the new file.
