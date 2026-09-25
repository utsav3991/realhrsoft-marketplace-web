---
version: alpha
name: realhrsoft-marketplace-web
description: The visual system for the four RealHRsoft Marketplace experiences (employee marketplace, Partner portal, Employer portal, Aayulogic Admin). It adapts the Meta commerce design language (reference analysis DESIGN-meta.md, 2026) to a work tool. The canvas is stark white with a deep-ink type hierarchy. Every button, tab and badge is a pill. Cards are flat and outlined in hairlines. One saturated cobalt blue (#0064E0) marks the action that commits work, and a black pill carries promotional CTAs on marketplace browsing surfaces.

colors:
  primary: "#0064e0"
  primary-deep: "#0457cb"
  primary-soft: "#0091ff"
  on-primary: "#ffffff"
  ink-button: "#000000"
  ink-button-pressed: "#444950"
  on-ink-button: "#ffffff"
  focus: "#1876f2"
  success: "#237b3a"
  warning: "#f7b928"
  critical: "#e41e3f"
  canvas: "#ffffff"
  surface-soft: "#f1f4f7"
  accent-tint: "#dbeeff"
  ink-deep: "#0a1317"
  ink: "#1c2a31"
  steel: "#5d6c7b"
  stone: "#8595a4"
  hairline: "#ced0d4"
  hairline-soft: "#dee3e9"

typography:
  display:
    fontSize: 36px
    fontWeight: 500
    lineHeight: 1.28
  page-title:
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.25
  section-title:
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.3
  card-title:
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.44
  body-md:
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.16px
  body-sm:
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: -0.14px
  body-sm-bold:
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.43
    letterSpacing: -0.14px
  caption:
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
  caption-bold:
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.33

rounded:
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 16px
  2xl: 24px
  3xl: 32px
  4xl: 40px
  full: 9999px

spacing:
  base-unit: 4px
  control-gap: 8px
  field-stack: 16px
  card-padding: 24px
  section: 32px
  page-gutter-mobile: 16px
  page-gutter-desktop: 32px
  marketing-section: 64px

elevation:
  flat: none
  panel: "0 1px 4px 0 rgb(20 22 26 / 0.3)"
---

# RealHRsoft Marketplace design system

This document is the design specification. `src/design-system/styles/globals.css` implements it
as tokens, and `src/design-system/primitives/` implements it as components. Change all three
together. When the code and this document disagree, fix whichever one is wrong. Don't leave the
disagreement in place.

The reference is the Meta commerce design analysis (`DESIGN-meta.md`). We took its visual
language: white canvas, pill geometry, cobalt used scarcely, hairline cards and a snug type
hierarchy. We changed what does not suit an authenticated HR and benefits tool, and
[Deviations from the reference](#deviations-from-the-reference) lists each change.

## Overview

- **White canvas, deep-ink text.** Pages are `bg-background` (#FFFFFF) with `text-foreground`
  (#0A1317). Soft cloud (#F1F4F7, `bg-secondary`/`bg-muted`) is the only other surface fill.
- **Pills everywhere.** Every button, navigation tab, badge and chip uses `rounded-full`. A
  squared button reads as a foreign widget in this system.
- **Cobalt means "commit".** `bg-primary` (#0064E0) is kept for the one action that moves work
  forward in a view: Save, Invite, Approve, Continue. It stays meaningful because it is scarce.
- **Flat, outlined cards.** Cards sit on a 1px hairline (`border`, #DEE3E9) with no shadow.
  Shadows (`shadow-panel`) are kept for layers that float above the page.
- **Tight three-tier type.** A medium-weight title, regular body text and bold labels. Labels,
  buttons and tabs share one bold 14px style so everything interactive looks related.

## Colors

Always use the semantic Tailwind token. Never a hex value, a Tailwind palette color
(`blue-600`), or an inline style.

| Token (Tailwind)                           | Light     | Dark      | Use                                                                   |
| ------------------------------------------ | --------- | --------- | --------------------------------------------------------------------- |
| `background` / `foreground`                | `#ffffff` / `#0a1317` | `#0a1317` / `#f1f4f7` | Page canvas and primary text                    |
| `card`, `popover`                          | `#ffffff` | `#111c21` | Card, menu and dialog surfaces                                        |
| `primary` / `primary-foreground`           | `#0064e0` / `#fff` | `#0091ff` / `#0a1317` | Committing action, links, active icons         |
| `primary-deep`                             | `#0457cb` | `#3aa7ff` | Primary hover and pressed state, visited or active links             |
| `ink` / `ink-foreground`, `ink-pressed`    | `#000` / `#fff`, `#444950` | inverted | Black promotional CTA (marketplace only)                    |
| `secondary`, `muted`                       | `#f1f4f7` | `#1c2a31` | Soft surfaces: thumbnails, table-row hover, secondary buttons        |
| `muted-foreground`                         | `#5d6c7b` | `#9aa8b5` | Supporting copy, hints, captions (AA on canvas and soft)             |
| `accent` / `accent-foreground`             | `#dbeeff` / `#0457cb` | `#0f2e4d` / `#9fd0ff` | Informational callout tint                      |
| `destructive`                              | `#e41e3f` | `#ff5c75` | Validation errors, destructive actions, danger badges                |
| `success`                                  | `#237b3a` | `#45bd62` | Active, current or approved states                                   |
| `warning` / `warning-foreground`           | `#f7b928` / `#0a1317` | same | Pending, expiring or limited-time states (always ink text on it) |
| `border`                                   | `#dee3e9` | `#26343b` | Card outlines, dividers, table rows                                  |
| `input`                                    | `#ced0d4` | `#34434b` | Form control borders                                                 |
| `ring`                                     | `#1876f2` | `#0091ff` | Focus ring, checked checkboxes, selected option borders              |

Rules:

- **One `primary` button per view region**, such as a page header, dialog footer or form. The
  other actions are `outline`, `secondary` or `ghost`. When cobalt shows up somewhere that
  commits nothing (a filter, a navigation link that looks like a button), use a quieter variant.
- **No new accent hues.** Outside the tokens above, the product is monochrome. Brand color in
  partner offer imagery counts as content, not as system color.
- Status colors are for status. Don't use `success` or `destructive` for decoration.

## Typography

The reference face (Optimistic VF) is proprietary, and we don't ship it. We use the system UI
stack (`font-sans` in `globals.css`) and borrow the reference's weights, sizes and tracking.
The body gets `letter-spacing: -0.01em` globally. `h1`–`h4` default to weight 500.

| Role            | Tailwind                                  | Use                                                   |
| --------------- | ----------------------------------------- | ----------------------------------------------------- |
| display         | `text-4xl font-medium leading-tight`      | Marketplace hero and landing headlines only           |
| page-title      | `text-2xl font-medium leading-tight`      | `PageHeader` title: one per page                      |
| section-title   | `text-xl font-medium`                     | Section headings, dialog titles                       |
| card-title      | `text-lg font-bold leading-snug`          | `CardTitle`, empty-state titles                       |
| body-md         | `text-base`                               | Form field values, long-form copy                     |
| body-sm         | `text-sm`                                 | Default UI text, table cells, descriptions            |
| body-sm-bold    | `text-sm font-bold`                       | Buttons, nav tabs, table headers, labels that matter  |
| caption         | `text-xs text-muted-foreground`           | Hints, timestamps, fine print                         |
| caption-bold    | `text-xs font-bold`                       | Badge labels                                          |

- Three weights only: 400, 500 for titles and 700 for labels. Don't use `font-semibold` or
  `font-light`.
- Keep line-height at 1.5 or more for body copy. The negative tracking already tightens it.
- Show identifiers (codes, request ids) in `font-mono text-xs`.

## Layout and spacing

- The base unit is 4px, and most steps are 8px (`gap-2`, `p-4`, `p-6`, `p-8`).
- **Portal pages:** `main` pads `p-4` on mobile and `md:p-8` from tablet up. Stack page sections
  with `space-y-8`, cards in a grid with `gap-6`, and form fields with `space-y-4`.
- **Cards:** 24px inner padding (`px-6`, `py-6`). Callout tiles can go to 32px (`p-8`).
- **Marketplace browsing pages** may breathe more: `py-16` between sections and a max width of
  about `max-w-7xl` with `px-4 md:px-8` gutters.
- **Portal chrome:** a 64px (`h-16`) sticky white header with a bottom hairline, and a 240px
  (`md:w-60`) sidebar on the white canvas separated by a hairline, not a fill.

## Shapes

| Radius         | Value | Use                                                                    |
| -------------- | ----- | ---------------------------------------------------------------------- |
| `rounded-xs`   | 2px   | Checkbox                                                               |
| `rounded-md`   | 6px   | Menu items, skeletons, small thumbnails                                |
| `rounded-lg`   | 8px   | Inputs, selects, textareas, menus, option cards                        |
| `rounded-xl`   | 16px  | Cards, dialogs, alerts, toasts, empty states, accordion items          |
| `rounded-2xl`  | 24px  | Callout or promo tiles on soft surfaces                                |
| `rounded-3xl`  | 32px  | Photographic offer cards, marketplace promo strips                     |
| `rounded-4xl`  | 40px  | Hero feature panels (marketplace only)                                 |
| `rounded-full` | pill  | Every button, nav tab, badge, chip, search field, avatar, icon button  |

Images always sit in rounded frames, never hard rectangles.

## Elevation

The system is flat. There are two levels:

| Level | Tailwind       | Use                                                                  |
| ----- | -------------- | -------------------------------------------------------------------- |
| flat  | `border`       | Cards, tables, tiles, empty states                                   |
| panel | `shadow-panel` | Menus, select popovers, dialogs, toasts, sticky action or summary bars |

Don't add `shadow-sm`, `shadow-md` or `shadow-lg` to cards. Elevation signals "this floats",
not "this matters".

## Components

Every one of these exists in `src/design-system/`. Use it as it is, and extend it through
variants instead of `className` overrides that repaint it.

### Buttons (`primitives/button.tsx`)

The base is `rounded-full text-sm font-bold`, with a `focus-visible` 3px ring.

| Variant       | Look                                           | When                                                        |
| ------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| `default`     | Cobalt pill, deepens on hover/press            | The one committing action                                   |
| `ink`         | Black pill, charcoal on press                  | Promotional CTA on marketplace browsing pages ("View offer") |
| `outline`     | Transparent, 2px `foreground/12` border        | Secondary action, the partner of a primary in a pair        |
| `secondary`   | Soft-cloud fill                                | Tertiary or toolbar action                                  |
| `ghost`       | No chrome until hover                          | Row actions, icon buttons in dense tables                   |
| `destructive` | Critical red pill                              | Confirming an irreversible or governance-negative action    |
| `link`        | Cobalt text                                    | Inline navigation                                           |

| Size      | Height     | When                                                         |
| --------- | ---------- | ------------------------------------------------------------ |
| `default` | 44px       | Forms, dialogs, page actions. Matches input height            |
| `sm`      | 36px       | Table toolbars and rows, compact filters                     |
| `lg`      | 48px       | Marketplace hero CTAs                                        |
| `icon`    | 40px round | Icon-only actions. Always give an `aria-label` or `sr-only` text |

A dual-CTA pair (hero or empty state) is `default` or `ink` plus `outline`, with the primary on
the left.

### Badges (`primitives/badge.tsx`, through `StatusBadge`)

Solid pills with `text-xs font-bold`. Intents: `success` (green, white text), `warning` (yellow,
ink text), `danger` (red, white text), `info` (cobalt), `neutral` (soft cloud), and `outline`.
Domain statuses render only through `StatusBadge` + `STATUS_DEFINITIONS`, so a given status
always has the same color everywhere.

### Cards (`primitives/card.tsx`)

`rounded-xl border`, no shadow, 24px padding, and a `CardTitle` in card-title type. Photographic
offer cards on the marketplace use `rounded-3xl`, drop the padding and let the image fill the
card, with copy overlaid or below.

### Form controls (`input`, `textarea`, `select`, `checkbox`, `FormField`)

- 44px tall, `rounded-lg`, `border-input`, 16px text (which also stops iOS zooming on focus).
- **Focus** shows a 2px `ring` blue edge (`border-ring` + `ring-1`). **Error** shows a
  `border-destructive` border with the message below in `text-destructive text-sm`, linked
  through `aria-describedby` (`fieldDescriptionIds`).
- A checked checkbox fills with `ring` blue. Selectable option cards use `rounded-lg border`, and
  the selected one gets `border-2 border-ring`.
- Use `FormField` for label, hint and error spacing. Don't hand-roll it.

### Navigation (`shared/navigation/portal-shell.tsx`)

Sidebar and tab items are pill tabs: `rounded-full px-4 py-2 text-sm font-bold`. The active tab
is inverted (`bg-foreground text-background`, `aria-current="page"`). Inactive tabs are
`text-muted-foreground` and get a soft-cloud hover.

### Tables (`primitives/table.tsx`)

Header cells use `text-sm font-bold text-foreground`. Rows are separated by hairlines and get
a soft-cloud hover. Keep cells to `text-sm`. Row actions are `ghost` or `outline` buttons at
`size="sm"`.

### Dialogs, menus and toasts

Dialogs: `rounded-xl`, `shadow-panel`, `p-6`, and a section-title heading. The footer puts the
primary action on the right on desktop and on top on mobile (`DialogFooter`). Menus and select
popovers: `rounded-lg`, `shadow-panel`, with the focused item on `bg-secondary`. Toasts:
`rounded-xl`, `shadow-panel`. Use them only for success confirmations. Errors stay inline.

### Page scaffolding (`components/`)

`PageHeader` has the page-title plus description and actions (at most one `default` button).
`EmptyState` is a dashed `rounded-xl` box with a round soft icon well, a card-title and one
action.

## Do's and don'ts

**Do**

- Use `rounded-full` on every button, tab, badge and chip.
- Keep cobalt to one committing action per region.
- Use the `ink` button only for promotional calls on marketplace browsing surfaces.
- Give floating layers `shadow-panel` and nothing else.
- Put ink text on yellow `warning` surfaces, never white.
- Keep interactive labels in bold 14px (`text-sm font-bold`).

**Don't**

- Don't square a button or put a pill below `rounded-full`.
- Don't use raw colors, Tailwind palette colors, `style={…}` or arbitrary hex values.
- Don't add a hue that is not a token.
- Don't put shadows on cards or tables.
- Don't use `font-semibold`, or body line-height below 1.5.
- Don't make a status badge by hand. Add the status to `STATUS_DEFINITIONS`.

## Responsive behavior

| Breakpoint     | Width      | Changes                                                                                  |
| -------------- | ---------- | ---------------------------------------------------------------------------------------- |
| Mobile         | < 768px    | One column. The sidebar becomes a horizontal, scrollable row of pill tabs under the header. Dialog footers stack. Grids go to one column. |
| Tablet (`md`)  | 768–1023px | The sidebar returns (240px). Card grids go to 2-up. `main` pads 32px.                     |
| Desktop (`lg`) | ≥ 1024px   | 3-up and 4-up card grids. Marketplace offer detail splits gallery and summary about 60/40, with a sticky `shadow-panel` summary. |

- **Touch targets:** default buttons and inputs are 44px, and icon buttons are 40px (pad the
  hit area on mobile if they sit alone). Don't ship an interactive target under 36px.
- **Hero type** drops from display (36px) to page-title (24px) below `md`.
- **Tables** scroll horizontally inside their wrapper and never force the page to scroll
  horizontally. Hide low-value columns below `md` instead of squeezing them.
- **Sticky action bars** (a multi-step form, or the offer summary on mobile) use `shadow-panel`
  and sit above the bottom safe area.

## Motion

Use 150–250ms ease-out for color and surface transitions (`transition-colors`), and 300ms
ease-in-out for expand and collapse. Respect `prefers-reduced-motion`. Nothing in the chrome
animates on its own.

## Accessibility

- Text tokens meet WCAG AA on their surfaces. `success` is darkened from the reference's
  #31A24C (3.3:1) to #237B3A (5.3:1) so a white label on a solid badge passes.
- Every control has a label. Invalid fields set `aria-invalid` and `aria-describedby`.
  Decorative icons are `aria-hidden`.
- Never remove the focus-visible ring. Never convey status by color alone. The badge carries
  a label.

## Deviations from the reference

| Reference (Meta commerce)                              | Here                                                                 | Why                                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Optimistic VF with `ss01, ss02`                        | System UI stack, same weights and tracking                           | Proprietary face, and there is no license                           |
| Cobalt kept for buy-now; black pill for primary CTAs   | Cobalt is the primary in-app action; black `ink` is for marketplace promotion | Most surfaces are workflows, where "commit" plays the part of "buy" |
| Solid success badge `#31a24c`                          | `#237b3a`                                                            | AA contrast for white badge text                                    |
| 32px cards as the default                              | 16px (`rounded-xl`) for app cards; 32px only for photographic cards | Dense admin screens need tighter geometry                           |
| No dark mode published                                 | Dark tokens derived from ink-deep and primary-soft                   | The app follows `prefers-color-scheme`                              |
| Hover states undocumented                              | Hover darkens (primary to primary-deep) or fills soft cloud          | Desktop portal users rely on hover affordance                       |
| Promo banner, product gallery, SKU picker, tech specs  | Not adopted yet                                                      | Adopt them when marketplace offer pages are rebuilt against Django  |

## Changing the system

1. Change the token or primitive and this document in the same change.
2. Add variants through `cva` (`-pressed` and `-disabled` belong in the variant, not at the
   call site).
3. Check contrast for any new color pair (AA: 4.5:1 for body text, 3:1 for large text and UI
   edges).
4. Run `yarn check`, then look at the admin console and a portal page in light and dark mode.
