# realhrsoft-marketplace-web

The RealHRsoft Marketplace frontend: one Next.js 16 application serving the Employee
Marketplace, Partner Portal, Employer Portal and Aayulogic Admin as route segments. The backend
is the Django/DRF `realhrsoft-marketplace-rest-api`. Working conventions are in `CLAUDE.md`.

## Quickstart

Requires Node 20.9+ and a running `realhrsoft-marketplace-rest-api` (default
`http://127.0.0.1:8000`, with `FORCE_SCRIPT_NAME` unset).
Yarn is pinned in `.yarn/releases`, so any global `yarn` delegates to it.

```bash
cp .env.example .env.local
yarn install
yarn dev            # http://localhost:3000
```

The app must run on an origin listed in the backend's `DJANGO_TRUSTED_ORIGINS`
(`http://localhost:3000` in its `.env.example`). Otherwise session refresh and logout are rejected
with 403. There is no sign-up page: an administrator creates the account under Admin → Users, and
the invitation email links to `/set-password/{uidb64}/{token}` (the backend's `FRONTEND_URL`).

### API routing and cookies

The browser only calls the API on this app's origin, under `NEXT_PUBLIC_API_BASE_PATH`. That path
must equal Django's `{FORCE_SCRIPT_NAME}/api/v1`, because the refresh cookie is scoped to it
plus `/auth`:

| Environment          | Django `FORCE_SCRIPT_NAME` | `NEXT_PUBLIC_API_BASE_PATH` | Routing                              |
| -------------------- | -------------------------- | --------------------------- | ------------------------------------ |
| Local                | unset                      | `/api/v1`                   | Next rewrites `/api/*` to Django     |
| Behind `infra/nginx` | `/backend`                 | `/backend/api/v1`           | Nginx serves Django under `/backend` |

`NEXT_PUBLIC_*` values are inlined at build time, so set it before `yarn build`.

## Routes

| Route                  | Experience      | Access                                                  |
| ---------------------- | --------------- | ------------------------------------------------------- |
| `/login`               | Sign-in         | Public; `?next=` returns to the requested page          |
| `/marketplace`         | Employee        | Any signed-in actor                                     |
| `/set-password/…`      | Invitation      | Public; completes an emailed password-setup link        |
| `/partner`             | Partner         | Closed until Django provisions Partner capacity         |
| `/employer`            | Employer / HR   | Closed until Django provisions Employer capacity        |
| `/admin`               | Aayulogic Admin | Any global `identity.*` or `organizations.*` permission |
| `/admin/users`         | User directory  | `identity.user.view`                                    |
| `/admin/organizations` | Organizations   | `organizations.organization.view`                       |

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
yarn api:generate --pull    # fetch Django's /api/schema/?format=json first (OPENAPI_URL to override)
```

The Makefile wraps the same commands (`make help` lists them). `make check` runs what CI
runs except Playwright: lint, type-check, format check, tests, `make api-check` (generated
types match `openapi/v1.json`) and the production build. `make e2e` runs Playwright
(`make e2e-install` once first). CI (`.github/workflows/ci.yml`) runs `make check` and,
in a separate job, `make e2e`; every e2e spec fakes the API, so no backend is needed.
