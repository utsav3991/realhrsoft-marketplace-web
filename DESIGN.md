---
version: beta
name: realhrsoft-marketplace-web
description: The visual system for the four RealHRsoft Marketplace experiences (employee marketplace, Partner portal, Employer portal, Aayulogic Admin). It follows the SHMS frontend (prabhu-group/shms-frontend): a warm off-white canvas with a faint lime glow, near-black ink type in Inter, one lime green (#9FE870) for the action that commits work, white cards outlined by a 1px ring, a collapsible icon sidebar and a slim top bar. Light and dark themes switch from the top bar.

colors:
  primary: "#9fe870"
  on-primary: "#163300"
  primary-deep: "#054d28"
  canvas: "#f6f7f1"
  card: "#ffffff"
  sidebar: "#fbfcf7"
  ink: "#0e0f0c"
  text-soft: "#454745"
  muted: "#e8ebe6"
  muted-foreground: "#6b6f69"
  mint: "#e2f6d5"
  surface-soft: "#eef3e7"
  critical: "#d03238"
  warning: "#ffd11a"
  border: "rgba(14, 15, 12, 0.12)"
  input: "rgba(14, 15, 12, 0.14)"

typography:
  family: Inter (next/font, self-hosted), JetBrains Mono for identifiers
  body:
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.44
  page-title:
    fontSize: clamp(24px, 2.5vw, 32px)
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.03em
  dialog-title:
    fontSize: 26px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -0.03em
  kicker:
    fontSize: 12px
    fontWeight: 700
    letterSpacing: 0.18em
    textTransform: uppercase

rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  full: 9999px

elevation:
  ring: "0 0 0 1px rgba(14, 15, 12, 0.12)"
  panel: "ring + 0 12px 32px -12px rgba(14, 15, 12, 0.18)"
---

# RealHRsoft Marketplace design system

This document is the design specification. `src/design-system/styles/globals.css` implements it
as tokens, and `src/design-system/primitives/` implements it as components. Change all three
together. When the code and this document disagree, fix whichever one is wrong.

The reference is the SHMS frontend (`prabhu-group/shms-frontend`, its `globals.css`,
`components/ui/*` and `components/sidebar/*`). We copy its look, not its code: primitives keep this
project's APIs (`Badge intent`, `Button ink`, `FormSection`, …) and restyle them.

## Overview

- **Warm canvas, ink text.** Pages are `bg-background` (#F6F7F1) with a faint lime radial glow
  in the top-left corner (set on `body`). Text is `text-foreground` (#0E0F0C); supporting copy
  is `text-muted-foreground`.
- **Lime means "commit".** `bg-primary` (#9FE870, dark-green `text-primary-foreground`) marks
  the one action that moves work forward in a view: Save, Invite, Approve, Continue.
- **White cards on a 1px ring.** Cards, tables, dialogs and form controls are white (`bg-card`)
  with a hairline `border` and `shadow-ring` (a 1px ring, not a drop shadow), rounded `2xl`.
- **Heavy, tight type.** Inter at weight 600 for body, 600 with −0.03em tracking for titles,
  900 for bare headings, and uppercase tracked kickers above titles.
- **Sidebar chrome.** A collapsible sidebar (full width or icons only) and a slim top bar with
  the sidebar trigger, organization switcher, theme switch and sign-out.

## Colors

Always use the semantic Tailwind token. Never a hex value, a Tailwind palette color
(`green-600`), or an inline style.

| Token (Tailwind)                         | Light                 | Dark                  | Use                                                       |
| ---------------------------------------- | --------------------- | --------------------- | --------------------------------------------------------- |
| `background` / `foreground`              | `#f6f7f1` / `#0e0f0c` | `#0e0f0c` / `#f3f6eb` | Page canvas and primary text                              |
| `card`, `popover`                        | `#ffffff`             | `#161813`             | Cards, tables, controls, menus, dialogs                   |
| `primary` / `primary-foreground`         | `#9fe870` / `#163300` | same                  | Committing action, checked controls, focus ring           |
| `primary-deep`                           | `#054d28`             | `#cdffad`             | Links and lime-family text on light surfaces              |
| `ink` / `ink-foreground`                 | `#0e0f0c` / `#fff`    | inverted              | Black promotional CTA (marketplace only)                  |
| `secondary`, `muted`                     | lime 8% / `#e8ebe6`   | lime 12% / `#1d211a`  | Secondary buttons, tab track, soft fills                  |
| `accent` / `accent-foreground`           | `#e2f6d5` / `#163300` | `#22301a` / `#e2f6d5` | Mint: hover on outline/ghost buttons, menu focus, today   |
| `surface-soft`                           | `#eef3e7`             | `#171a14`             | Hover on list results and filter triggers                 |
| `destructive`                            | `#d03238`             | `#ff6a70`             | Errors, destructive actions                               |
| `success`, `warning`                     | `#054d28`, `#ffd11a`  | `#b8f28f`, `#ffd11a`  | Solid status marks (ink text on `warning`)                |
| `*-soft` / `*-soft-foreground`           | tinted pairs          | tinted pairs          | Badges and alerts: `neutral`, `info`, `success`, `warning`, `danger` |
| `border` / `input`                       | ink 12% / 14%         | light 12% / 14%       | Outlines, dividers, control borders                       |
| `sidebar`, `sidebar-accent`, `sidebar-border` | `#fbfcf7`, ink 6%, ink 8% | `#12140f`, light 8%, light 8% | Sidebar surface, active and hover item, edge |
| `chart-1` … `chart-5`                    | lime, forest, yellow, sky, peach | lighter forest | Data series                                  |

Rules:

- **One `default` (lime) button per view region**: page header, dialog footer, form. The rest are
  `outline`, `secondary` or `ghost`.
- Status colors are for status. Soft tints (`bg-success-soft text-success-soft-foreground`) are
  the default; solid `success`/`warning`/`destructive` fills are for rare emphasis.
- Dark mode is a class on `<html>` set by `next-themes` (`@custom-variant dark`), toggled in the
  top bar. Its inline script carries the CSP nonce (`app/layout.tsx` reads it from the request).

## Typography

Inter via `next/font/google` (`--font-body`, self-hosted at build time, so `font-src 'self'`
holds); JetBrains Mono for `font-mono`.

| Role          | Tailwind                                                                  | Use                                       |
| ------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| page-title    | `text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.1] font-semibold tracking-[-0.03em]` | `PageHeader`, one per page       |
| dialog-title  | `text-[1.625rem] leading-[1.05] font-semibold tracking-[-0.03em]`         | `CardTitle`, `DialogTitle`, `SheetTitle`  |
| section-title | `text-lg font-semibold tracking-[-0.02em]`                                | `FormSection` legends, empty-state titles |
| kicker        | `kicker text-muted-foreground` (utility in `globals.css`)                 | Eyebrow above a title, detail labels      |
| body          | `text-sm` (body weight 600)                                               | Default UI text, table cells              |
| supporting    | `text-sm font-medium text-muted-foreground`                               | Descriptions, hints, form descriptions    |
| badge         | `text-[11px] font-semibold tracking-[0.14em] uppercase`                   | Badges                                    |

- `h1`–`h6` default to weight 900 with −0.02em tracking; components set their own weight.
- Show identifiers (codes, request ids) in `font-mono text-xs`.

## Layout and spacing

- **Portal chrome** (`shared/navigation/portal-shell.tsx`): `SidebarProvider` → `Sidebar`
  (17rem, collapses to a 4.5rem icon rail) + `SidebarInset` (sticky 56px top bar, then `main`).
- **Page container:** `main` wraps every page in `mx-auto max-w-[1600px] px-4 py-8 sm:px-6
  lg:px-10`. List and detail pages share that width so moving between them does not shift.
- The base unit is 4px. Stack page sections with `space-y-6`/`gap-6`, cards in grids with
  `gap-6`, form fields 20px apart.
- **Auth pages** (`app/(auth)/layout.tsx`): split screen, the form on the left, a lime brand
  panel with a kicker, headline and short bar on the right (hidden below `md`).

## Shapes

| Radius         | Value | Use                                                                   |
| -------------- | ----- | --------------------------------------------------------------------- |
| `rounded-sm`   | 4px   | Checkbox                                                              |
| `rounded-md`   | 6px   | Inputs, selects, sidebar items, tab triggers, tooltips, skeletons     |
| `rounded-lg`   | 8px   | Buttons, textareas, menu and select items, close buttons              |
| `rounded-xl`   | 12px  | Menus, select and popover panels, alerts                              |
| `rounded-2xl`  | 16px  | Cards, table cards, dialogs, empty states                             |
| `rounded-full` | pill  | Badges, switches, avatars                                             |

## Elevation

| Level | Tailwind       | Use                                                                    |
| ----- | -------------- | ---------------------------------------------------------------------- |
| ring  | `shadow-ring`  | Cards, table cards, buttons, inputs, selects, dialogs, sheets, alerts  |
| panel | `shadow-panel` | Menus, select and popover panels (ring plus a soft drop)               |

Dialog and sheet overlays dim the page (`bg-foreground/60`) and blur it (`backdrop-blur-sm`).

## Components

Every one of these exists in `src/design-system/`. Use it as it is, and extend it through
variants instead of `className` overrides that repaint it.

### Buttons (`primitives/button.tsx`)

`rounded-lg text-sm font-semibold`, a 1px `shadow-ring`, and a small scale on hover (1.05) and
press (0.95). Focus shows a 3px lime halo.

| Variant       | Look                                        | When                                          |
| ------------- | ------------------------------------------- | --------------------------------------------- |
| `default`     | Lime fill, dark-green text                  | The one committing action                     |
| `ink`         | Black fill                                  | Promotional CTA on marketplace browsing pages |
| `outline`     | White card fill, input border, mint hover   | Secondary action, partner of a primary        |
| `secondary`   | Muted fill, mint hover                      | Tertiary or toolbar action                    |
| `ghost`       | No chrome until mint hover                  | Row actions, icon buttons                     |
| `destructive` | Red fill                                    | Irreversible or governance-negative action    |
| `link`        | `primary-deep` text, no scale               | Inline navigation                             |

Sizes: `default` 44px, `sm` 36px, `xs` 28px, `lg` 48px, `icon` 36px, `icon-sm` 32px, `icon-lg`
40px. Icon-only buttons always carry an `aria-label` or `sr-only` text.

### Badges (`primitives/badge.tsx`, through `StatusBadge`)

Uppercase tracked pills on a soft tint: `neutral`, `info` (blue), `success` (green), `warning`
(amber), `danger` (red), `primary` (solid lime, for one highlighted item) and `outline`. Domain
statuses render only through `StatusBadge` + `STATUS_DEFINITIONS`.

### Cards (`primitives/card.tsx`)

`bg-card rounded-2xl border shadow-ring`, 24px padding, `gap-6` between header and content,
`CardTitle` in dialog-title type, `CardAction` for a button beside the title.

### Form controls (`input`, `textarea`, `select`, `checkbox`, `primitives/form`)

- Inputs and selects: 44px, `rounded-md`, white `bg-card`, `border-input`, `shadow-ring`,
  `text-sm font-semibold`, 16px horizontal padding (`fieldControlClassName` in `input.tsx`).
  Textareas are the same at `rounded-lg`, min 112px. Placeholders are muted and medium weight.
- **Focus** shows a lime `border-ring` and a 3px `ring-ring/50` halo. **Error** shows a
  `border-destructive` border, the label turns `text-destructive`, and the message below
  (`text-destructive text-sm font-semibold` with an alert icon) is linked through
  `aria-describedby`.
- Checkboxes and switches fill lime when on.
- Forms use shadcn's react-hook-form bindings in `primitives/form.tsx`: `<Form {...form}>`, then
  `FormField` → `FormItem` → `FormLabel` / `FormControl` / `FormDescription` / `FormMessage`.
  `FormControl` wires the id, `aria-invalid` and `aria-describedby`; never hand-write them. Mark
  optional fields with `<FormLabel optional>`.
- Group fields with `FormSection` (section-title legend, optional description, a 2-column grid
  from `sm`; consecutive sections get a divider), put buttons in `FormActions` (divider above,
  end-aligned, stacked on mobile) and unplaced failures in `FormAlert`. Labels are 12px above
  their control; wide fields take `sm:col-span-2`.
- Controls outside a form (URL filters, lookups) use `Field` (`components/field.tsx`).
- **Dates** use `DatePicker` / `DateTimePicker` (`components/date-picker.tsx`), never a native
  date input. The trigger looks like an input; the calendar marks today in mint and the
  selected day in lime. Values stay `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm` (local time).
- **Long-form content** uses `RichTextEditor` (Tiptap, stored as Markdown), shown with
  `RichText` or `richTextPreview()`. Audit reasons and notes stay a plain `Textarea`.

### Navigation (`shared/navigation/portal-shell.tsx` over `primitives/sidebar.tsx`)

- **Sidebar header:** a lime logo tile with the portal's icon, "RealHRsoft Marketplace" and the
  portal name. With several portals it is the workspace switcher (a dropdown).
- **Sidebar content:** an uppercase `SidebarGroupLabel` (the portal name) and the portal's
  items as `SidebarMenuButton`s (32px, `rounded-md`, icon + label). Hover and the active item
  take `bg-sidebar-accent`; the active item is semibold with `aria-current="page"`. Collapsed,
  only icons show and each has a tooltip.
- **Sidebar footer:** the account menu (initial avatar on a lime tint, actor type and roles),
  opening upward with a destructive "Sign out".
- **Top bar:** `SidebarTrigger` (also Ctrl/Cmd+B), the organization switcher for portals that
  act for one, then on the right the sun/switch/moon theme toggle and a red ghost sign-out
  button. Sticky, `border-b`, translucent canvas with backdrop blur.
- Below `md` the sidebar opens as a sheet from the left and closes when a link is chosen.

### Tables (`components/data-table.tsx` over `primitives/table.tsx`)

- The table sits in a card: `bg-card rounded-2xl border shadow-ring overflow-hidden`.
- The header row has a faint ink tint (`bg-foreground/2`); header cells are 56px,
  `text-sm font-semibold text-muted-foreground`. Rows are divided by hairlines and hover to
  `bg-foreground/3`.
- The first cell of every row pads `pl-6` and the last `pr-6` (built into `TableHead` and
  `TableCell`), so text lines up with the card edge.
- Every list renders through `DataTable` (typed columns), or `QueryDataTable` for a paginated
  query. Loading shows skeleton rows under the real headers; errors and empty results replace
  the table with `ErrorState`/`EmptyState`. A column's `className` covers header and cells
  (`text-right tabular-nums` for numbers, `hidden md:table-cell` for low-value columns). A table
  nested in a card passes `className="rounded-none border-0 shadow-none"`.
- **Sorting.** A sortable header is a semibold ghost chip (`rounded-md`) with a muted up/down
  chevron; the active column shows an ink arrow and sets `aria-sort`. A click goes ascending,
  then descending, then back to the default order. Blank values sort last either way.
- **Pages.** A footer inside the card shows "Showing 1-10 of 120 results", a rows-per-page select
  and outline Prev/Next buttons. A new page keeps the old rows on screen, dimmed, until it lands.
- **Record filters** use `FilterCombobox`: an input-styled trigger ("All partners" or the chosen
  name), a clear button, and a searchable menu with a muted detail line.

### Dialogs, sheets, menus and toasts

- **Dialogs:** `rounded-2xl border shadow-ring`, `p-6 sm:p-7`, up to `max-w-xl`, `gap-5`; the
  close button is a bordered 32px square top-right; dialog-title heading and supporting
  description. The footer puts the primary action on the right on desktop and on top on mobile.
- **Sheets:** same surface, 92vw up to `max-w-xl`, the same close button.
- **Menus, selects, popovers, command lists:** `rounded-xl border shadow-panel`, `p-1`; items
  are `rounded-lg` and focus to mint (`bg-accent`). Destructive menu items
  (`variant="destructive"`) are red and focus to `danger-soft`.
- **Toasts** (`primitives/sonner.tsx`): Sonner with `richColors`, so success, error, warning and
  info toasts are tinted; the neutral toast uses the popover surface. Top right. Use them only to
  confirm a completed mutation; errors stay inline.
- **Alerts** (`primitives/alert.tsx`): `rounded-xl` with `shadow-ring`; `default` on the card
  surface, and `info`, `success`, `warning`, `destructive` on their soft tints.
- **Tooltips:** ink chip with an arrow, supplementary text only, never a control's only label.

### Page scaffolding (`components/`)

`PageHeader` has an optional `eyebrow` kicker, the page-title, an optional description and an
actions slot (at most one `default` button). `EmptyState` is a dashed `rounded-2xl` box with a
mint icon tile, a section-title and one action. `Detail` labels use the kicker style.

### Other primitives

`tabs` (a muted segmented track; the active trigger is raised on `bg-background` with a small
shadow), `switch`, `separator`, `scroll-area`, `avatar`, `collapsible`, `skeleton` (mint pulse).

## Do's and don'ts

**Do**

- Keep lime to one committing action per region.
- Put cards, tables, controls and dialogs on `shadow-ring`, and floating panels on `shadow-panel`.
- Use soft status tints for badges and alerts, and ink text on yellow `warning`.
- Pad the first and last table cells to the card edge (the primitives do it).

**Don't**

- Don't use raw colors, Tailwind palette colors, `style={…}` or arbitrary hex values.
- Don't add a hue that is not a token.
- Don't add drop shadows (`shadow-md`, `shadow-lg`) to cards or tables.
- Don't make a status badge by hand. Add the status to `STATUS_DEFINITIONS`.
- Don't narrow detail pages with their own `max-w-*`; the page container sets the width.

## Responsive behavior

| Breakpoint     | Width      | Changes                                                                                     |
| -------------- | ---------- | ------------------------------------------------------------------------------------------- |
| Mobile         | < 768px    | One column. The sidebar is a sheet opened from the top bar. Dialog footers stack. Auth pages show the form only. |
| Tablet (`md`)  | 768–1023px | The sidebar returns, expanded or as an icon rail. Card grids go to 2-up.                    |
| Desktop (`lg`) | ≥ 1024px   | 3-up and 4-up card grids; page gutters grow to 40px.                                        |

- **Touch targets:** default buttons and inputs are 44px. Don't ship an interactive target
  under 32px.
- **Tables** scroll horizontally inside their card and never force the page to scroll
  horizontally.

## Motion

- **Buttons** scale to 1.05 on hover and 0.95 on press (200ms ease-out).
- **Sidebar** width and position animate over 200ms linear when it collapses.
- **Content entry** (`components/motion.tsx`, framer-motion): `FadeIn` is a 250ms fade with an
  8px rise. `Stagger`/`StaggerItem` reveal card grids 40ms apart. Table rows fade in 25ms apart,
  capped at the tenth row. Portal page content fades in on each route change.
- **Overlays** (dialog, sheet, menu, select, popover, tooltip) fade and zoom in from 95% with
  `tw-animate-css` `data-[state]` classes.
- **Reduced motion:** entry animations don't run (`useEntryInitial`), `MotionConfig
  reducedMotion="user"` removes transforms elsewhere, and `globals.css` cuts CSS animations and
  transitions to a frame.

## Accessibility

- Lime is never a text color on the canvas: text on lime is `primary-foreground` (#163300), and
  lime-family text uses `primary-deep`.
- Every control has a label. Invalid fields set `aria-invalid` and `aria-describedby`.
  Decorative icons are `aria-hidden`. The theme switch has `aria-label="Dark mode"`.
- Never remove the focus-visible ring. Never convey status by color alone. The badge carries a
  label.

## Changing the system

1. Change the token or primitive and this document in the same change.
2. Add variants through `cva`, not call-site overrides.
3. Check contrast for any new color pair (AA: 4.5:1 for body text, 3:1 for large text and UI
   edges), in light and dark.
4. Run `yarn check`, then look at the admin console and a portal page in both themes.
