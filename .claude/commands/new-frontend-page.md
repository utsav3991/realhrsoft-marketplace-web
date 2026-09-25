---
description: Scaffold a page in the correct portal segment, following ADR-013
argument-hint: <portal: marketplace|partner|employer|admin> <page-path>
---

Scaffold a page at `src/app/$1/$2/page.tsx`. `$1` is one of `marketplace`, `partner`,
`employer` or `admin`.

Before writing anything:

1. Read `CLAUDE.md` (session/API rules, authorization layers, dependency direction).
2. Look at the existing pages in `src/app/$1/` and the portal entry in
   `src/shared/navigation/portals.ts`.
3. Read `DESIGN.md` for the visual rules (pill buttons, one cobalt action per region, flat
   cards, type scale).
4. Check `src/design-system/primitives/`, `src/design-system/components/` and
   `src/shared/components/` for reusable pieces.

Structure:

- `page.tsx` is a Server Component: `metadata`, `PageHeader`, and the feature component. It
  does no data fetching.
- The interactive feature component lives in `src/features/<domain>/components/` (`"use client"`).
  Its data comes from hooks in `src/features/<domain>/api/` that use `api` + `unwrap`, typed by
  the generated contract (`Schemas`). Run `yarn api:generate --pull` if the endpoint is new.
- Wrap the page in `<RequirePermission anyOf={[…]}>` when it needs a permission. Gate actions
  with `<Can>`. Add a nav item (with `anyOf`) to the portal registry if the page belongs in
  the navigation.
- Handle pending, empty and error states (`Skeleton`, `EmptyState`, `ErrorState`).
- Put filters and pagination in URL search params. A component using `useSearchParams` sits
  under `<Suspense>`.
- Add tests for any permission logic or non-trivial behaviour.

Afterwards, run `yarn check` and offer to invoke the `frontend-component-reviewer` agent.
