# realhrsoft-marketplace-web

The RealHRsoft Marketplace frontend: one Next.js 16 application serving the Employee
Marketplace, Partner Portal, Employer Portal and Aayulogic Admin as route segments. Design
decisions are in ADR-013 (`realhrsoft-marketplace-api/docs/architecture/adrs/`). Working
conventions are in `CLAUDE.md`.

## Quickstart

Requires Node 20.9+ and a running `realhrsoft-marketplace-api` (default `http://127.0.0.1:8000`).
Yarn is pinned in `.yarn/releases`, so any global `yarn` delegates to it.

```bash
cp .env.example .env.local
yarn install
yarn dev            # http://localhost:3000
```

The app must run on an origin listed in the backend's `MARKETPLACE_TRUSTED_ORIGINS`
(`http://localhost:3000` by default). Otherwise session refresh and logout are rejected with 403.
Accounts are provisioned through the backend CLI (`make admin EMAIL=…`). There is no sign-up page.

## Routes

| Route          | Experience      | Access                                                |
| -------------- | --------------- | ----------------------------------------------------- |
| `/login`       | Sign-in         | Public; `?next=` returns to the requested page        |
| `/marketplace` | Employee        | Any signed-in actor                                   |
| `/partner`     | Partner         | Closed until the backend defines partner permissions  |
| `/employer`    | Employer / HR   | Closed until the backend defines employer permissions |
| `/admin`       | Aayulogic Admin | Any `identity.*` permission                           |
| `/admin/users` | User directory  | `identity.user.view`                                  |

Route guards are UX only. The API authorizes every request.

## Commands

```bash
yarn dev                    # dev server
yarn build && yarn start    # production build (output: standalone)
yarn lint                   # ESLint
yarn type-check             # tsc --noEmit
yarn test                   # Vitest
yarn test:e2e               # Playwright (first time: yarn playwright install chromium)
yarn format                 # Prettier
yarn check                  # lint + type-check + format:check + test
yarn api:generate           # regenerate src/generated/api from openapi/v1.json
yarn api:generate --pull    # fetch the running backend's contract first (OPENAPI_URL to override)
```
