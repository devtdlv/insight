# Insight architecture

Insight is a privacy-first product analytics portfolio application (a completed portfolio MVP, not a hosted service). It is a conventional Laravel app with a React and TypeScript interface. People sign in with a Laravel session. A signed-in user can create workspaces, belong to them as an owner, admin, or member, and keep analytics projects inside a workspace. A project accepts named events through a public write key, from the TypeScript SDK or any HTTP client, and shows analytics computed from those events.

Everything described in this document is implemented, except the final section, [Possible future enhancements](#possible-future-enhancements), which lists work that does not exist.

## Stack

| Concern                 | Choice                                   |
| ----------------------- | ---------------------------------------- |
| Application             | Laravel 12, PHP 8.2                      |
| Interface               | React 19, TypeScript, Inertia.js         |
| Assets                  | Vite, Tailwind CSS                       |
| Database                | MariaDB 10.11 through the `mysql` driver |
| Cache, sessions, queues | Laravel database drivers                 |
| PHP tests               | Pest, with SQLite in memory              |
| Interface tests         | Vitest and React Testing Library         |
| Formatting              | Laravel Pint, ESLint, Prettier           |

PostgreSQL, Redis, Docker, and WSL are not part of the local workflow.

## Directory layout

Laravel lives at the repository root. There is one frontend, and it is rendered by Laravel.

```text
insight/
├── app/
│   ├── Console/Commands/ insight:seed-demo (local showcase data)
│   ├── Http/             Controllers (web and Api/V1), middleware, form requests
│   ├── Models/           User, Workspace, WorkspaceMembership, Project, AnalyticsEvent
│   ├── Policies/         WorkspacePolicy, ProjectPolicy
│   ├── Services/Analytics/  ProjectAnalytics and its result objects
│   └── Support/          Tenant, WriteKey, Timezones, Analytics/DateRangeResolver
├── bootstrap/
├── config/
├── database/migrations/  Users, cache, and queue tables, then workspaces, memberships,
│                         projects, write keys, and analytics_events
├── public/               HTTP entry point and the Vite build
├── resources/
│   ├── css/app.css
│   ├── js/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── types/
│   │   └── app.tsx
│   └── views/app.blade.php
├── routes/
│   ├── web.php           Inertia pages
│   └── api.php           JSON API
├── sdk/src/              Browser tracking SDK (index.ts) and its Vitest tests, not an npm package
├── scripts/              Optional Playwright screenshot capture
├── tests/                Pest feature and unit tests (frontend tests sit next to their components)
├── .github/workflows/    CI workflow
└── docs/
```

`php artisan` runs from the repository root.

## Inertia

`routes/web.php` maps `/` to the `Welcome` page, the guest authentication pages, `/dashboard` to the `Dashboard` page, and the workspace and project routes listed under [Workspaces and projects](#workspaces-and-projects). `App\Http\Middleware\HandleInertiaRequests` is appended to the web middleware group and renders `resources/views/app.blade.php`.

`resources/js/app.tsx` starts the Inertia React app and resolves pages from `resources/js/pages`. Navigation uses Inertia links and Laravel routes.

Server-side rendering is disabled. Vite compiles the client assets. `php artisan serve` and `npm run dev` run together during development.

Shared Inertia props contain the application name, a flash status string, the signed-in user's id and name, and the workspaces that user belongs to (`id`, `name`, and `role`). Passwords, tokens, and email addresses are not shared. The members page shows names and roles, and it does not include email addresses.

## Interface

`PublicLayout` renders the landing page: the Insight wordmark, a light, dark, and system theme control, and links to log in or create an account. `Welcome` describes privacy-first product analytics and what the product shows today.

`AuthLayout` renders login, registration, forgot password, and reset password. Validation errors stay tied to each field.

`AppLayout` is the signed-in shell: a skip link, sidebar, mobile dialog navigation, theme control, API status, a workspace switcher, a flash status, and an account menu whose logout is a POST. The sidebar lists only working links: Dashboard, Workspaces, Projects, and Events. Unfinished features are not shown in the application. `Dashboard` requires a session. It lists the signed-in user's workspaces and explains where project analytics live.

Project analytics are on the project overview page (`Projects/Show`): metric cards with previous-period comparison, an activity chart with a data-table toggle, top events, and a date-range selector. `Projects/Events` lists recent events, `Projects/Tracking` shows the write key and a copyable SDK example, and `Projects/Settings` edits the project. Workspace pages live in `pages/Workspaces`.

The pages do not invent metrics. The theme preference is stored in localStorage under `insight-theme`. That key does not hold credentials. The status indicator calls `GET /api/v1/health` on the same origin and accepts only the two-field health contract.

## API

`routes/api.php` is mounted at `/api/v1`. These routes do not pass through the Inertia middleware.

`GET /api/v1/health` always returns JSON:

```json
{
  "status": "ok",
  "service": "insight-api"
}
```

An HTML `Accept` header does not turn that response into a page and does not redirect it. Unknown API paths return JSON errors.

`POST /api/v1/events` (and its CORS preflight `OPTIONS`) is the public event ingestion endpoint, handled by `Api\V1\EventIngestionController` behind the `AllowPublicEventIngestion` middleware. See [Event collection](#event-collection). The API has no authenticated routes: signed-in pages use Inertia, not this API.

## MariaDB

Local configuration is:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=insight
DB_USERNAME=insight

CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=database
```

The password stays in the local `.env` file. It is not committed and it is not copied into `.env.example`.

The migrations for `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, and `failed_jobs` are already in `database/migrations`. Do not create a second set. Do not run `migrate:fresh`, `migrate:reset`, or `db:wipe`.

Pest forces `DB_CONNECTION=sqlite` and `DB_DATABASE=:memory:`. Those tests check configuration and HTTP behavior. They do not verify the MariaDB server.

The queue worker is a separate process:

```powershell
php artisan queue:work
```

## Local workflow

From the repository root:

```powershell
composer install
npm install
php artisan serve
npm run dev
```

Quality checks:

```powershell
vendor\bin\pint
php artisan test
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

## Authentication

Registration, login, logout, and password reset use Laravel's session guard and password broker. Sessions are stored in the database. Login regenerates the session. Logout invalidates it and replaces the CSRF token. Login attempts are rate limited. Password reset responses use the same confirmation whether or not the email matches an account.

Guest pages are `/login`, `/register`, `/forgot-password`, and `/reset-password/{token}`. `/dashboard` and `POST /logout` require a session. Reset mail uses the configured mailer. The local example uses the `log` mailer, so the reset message is written to the Laravel log until a delivery mailer is configured.

The `users`, `password_reset_tokens`, and `sessions` tables come from the original migration. Authentication does not create a workspace.

## Workspaces and projects

Migrations add `workspaces`, `workspace_memberships`, `projects`, `projects.write_key`, and `analytics_events`. They do not change the users table. Apply them with `php artisan migrate` from the repository root. Do not run `migrate:fresh`, `migrate:reset`, or `db:wipe`.

A user who creates a workspace becomes its only owner. Registration and login do not create a workspace. Roles are owner, admin, and member. Owners and admins can rename the workspace and can create, edit, archive, and restore projects. Members can view the workspace, its members, and its projects. They receive 403 when they try to change those records. Someone who is not a member receives 404, including when a project id is placed under another workspace's URL. Laravel policies (`WorkspacePolicy`, `ProjectPolicy`) decide view and manage rights. `App\Support\Tenant` turns a missing membership into 404 and a failed manage check into 403.

Projects belong to one workspace. A project has a name, an optional description, an optional http or https website URL, a timezone, a public write key, and an optional `archived_at`. Archive keeps the row and stops ingestion. There is no workspace delete, project delete, invitation, role change, or ownership transfer in the product.

Workspace URLs:

- `GET /workspaces` and `GET /workspaces/create`
- `POST /workspaces`
- `GET /workspaces/{workspace}`, `GET /workspaces/{workspace}/settings`, `PATCH /workspaces/{workspace}`
- `GET /workspaces/{workspace}/members`
- `GET /workspaces/{workspace}/projects` and `GET /workspaces/{workspace}/projects/create`
- `POST /workspaces/{workspace}/projects`
- `GET /workspaces/{workspace}/projects/{project}` and `GET /workspaces/{workspace}/projects/{project}/settings`
- `PATCH /workspaces/{workspace}/projects/{project}`
- `GET /workspaces/{workspace}/projects/{project}/tracking`
- `POST /workspaces/{workspace}/projects/{project}/write-key`
- `GET /workspaces/{workspace}/projects/{project}/events`
- `POST /workspaces/{workspace}/projects/{project}/archive` and `POST .../restore`

Nested project routes use scoped bindings, so a project resolves only when it belongs to the workspace in the URL. Members can open tracking setup and recent events. Only owners and admins can rotate the write key. A write key cannot call these routes.

## Event collection

`POST /api/v1/events` is public. It does not use a Laravel session, and it is not on the web middleware group, so it does not change CSRF protection for signed-in pages. `AllowPublicEventIngestion` checks the content type, a 16 KB body limit, and a per-key, per-IP rate limit before validation. The default limit is 60 events per minute (`INSIGHT_INGESTION_PER_MINUTE`). The cache is the database cache in local development and the array cache while tests run.

The request allowlist is `write_key`, `name`, `anonymous_id`, `user_id`, `properties`, `occurred_at`, and `event_id`. `project_id` is discarded. The project is loaded by `write_key`. A missing key returns 401. An archived project returns 403. Neither response includes the project name. Validation failures return 422. A body over 16 KB returns 413. A non-JSON body returns 415. A rate-limit failure returns 429 with `Retry-After`.

A successful insert returns `{"status":"accepted"}`. The same `event_id` for the same project hits the unique index `(project_id, client_event_id)` and returns `{"status":"duplicate"}` with the original row unchanged. Another project may reuse that event id. Rows without an event id are not deduplicated, because the unique index allows multiple nulls.

`analytics_events` stores the project id, event name, anonymous id, optional application user id, JSON properties, `occurred_at`, `received_at`, and optional client event id. It does not store an IP address, a user-agent, or a location. `identified_user_id` is the application's own id, not `users.id`. Eloquent refuses updates and deletes. Deleting a project still removes its events through the foreign key. Indexes cover `(project_id, received_at)` and `(project_id, occurred_at)` for later time-based queries. The recent-events page reads only the authorized project's rows, orders them by `received_at`, and uses simple pagination so it does not count the whole table.

The write key is `iw_` plus 32 random hexadecimal characters. It is generated when a project is created and backfilled for existing projects by the migration. It is stored in plaintext because the project page must show it. Rotation replaces it immediately. A project update cannot set it.

Ingestion CORS allows any origin and does not allow credentials. Health-check CORS stays limited to `CORS_ALLOWED_ORIGINS`. The two path lists are separate so a public event post cannot widen the health endpoint.

The browser SDK lives at `sdk/src/index.ts` and is not an npm package. `track()` is the only way it sends an event. It can persist an anonymous id in `localStorage` or keep it in memory. It does not set a cookie, fingerprint the browser, or read the page automatically. Properties are whatever the host application passes.

## Analytics aggregation

`ProjectAnalyticsRequest` validates the range query (a preset of 24 hours, 7, 30, or 90 days, or custom dates up to 90 days). `App\Support\Analytics\DateRangeResolver` turns it into a `DateRange`: half-open UTC windows computed from the project's IANA timezone, so a daylight saving day of 23 or 25 hours is handled correctly. The previous period is built with the same calendar rules.

`App\Services\Analytics\ProjectAnalytics::summarize()` runs every query against one project's events, filtered on `occurred_at`:

- **Metrics:** one aggregate query with `COUNT(*)`, `COUNT(DISTINCT anonymous_id)`, and `COUNT(DISTINCT identified_user_id)` (which ignores nulls), for the current and the previous period. Events per visitor is derived from those counts.
- **Activity:** hourly buckets for the 24-hour preset and custom ranges of up to two days, and daily buckets otherwise, counted in SQL with a `CASE` expression over the bucket boundaries, so empty buckets still appear and the current, partial bucket is marked.
- **Top events:** counts grouped by event name with each name's share of all events.

The project overview receives the result as a single `analytics` prop. Changing the date range makes an Inertia partial reload of only that prop.

## Tenant isolation

Data belongs to a hierarchy: workspace → project → event. Isolation is enforced on the server at each level:

- Workspace and project controllers (or their form requests) check access through `App\Support\Tenant`, which returns 404 when the user has no membership, so other tenants' workspaces are not revealed. A failed manage check returns 403.
- Project routes use scoped bindings, so a project id placed under another workspace's URL does not resolve.
- `WorkspacePolicy` and `ProjectPolicy` decide view and manage rights from the membership role.
- Analytics and event queries always filter on the authorized project's id.
- Ingestion finds the project by write key only and ignores any `project_id` in the body.
- Shared Inertia props include only the signed-in user's own workspaces, and never email addresses, passwords, or tokens.

The React interface hides actions a user cannot take, but security does not depend on it.

## Privacy design

- Collection is explicit: an event exists only when application code calls `track()` or posts to the endpoint. There is no automatic page, click, or form capture, no session recording, and no fingerprinting.
- `analytics_events` has no IP address, user-agent, or location columns. The client IP is used only, combined with the write key, as a hashed rate-limit key.
- The SDK keeps an anonymous id in `localStorage` (or in memory only) and sets no cookies.
- `identified_user_id` is the host application's own id. Applications should not send emails or other personal data as ids or properties. Insight does not inspect property contents beyond size and shape limits.
- Write keys can only record events. They cannot read data or change settings.

These are design decisions, not audited guarantees or certifications.

## Possible future enhancements

None of these are implemented:

- Invitations, role changes, and ownership transfer
- Batch event ingestion
- Funnels, retention, journeys, and engagement analysis
- Workspace-wide reporting
