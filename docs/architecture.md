# Insight architecture

Insight is a product analytics platform. The application is a conventional Laravel app with a React and TypeScript interface. People sign in with a Laravel session. A signed-in user can create workspaces, belong to them as an owner, admin, or member, and keep analytics projects inside a workspace. A project accepts named events through a public write key. Funnels, retention, and billing are later milestones.

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
├── app/                  Laravel application code
├── bootstrap/
├── config/
├── database/migrations/  Existing cache, session, and queue tables
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
├── sdk/src/index.ts      Browser tracking SDK, not an npm package
├── tests/                Pest feature tests
└── docs/
```

`php artisan` runs from the repository root.

## Inertia

`routes/web.php` maps `/` to the `Welcome` page and `/dashboard` to the `Dashboard` page. `App\Http\Middleware\HandleInertiaRequests` is appended to the web middleware group and renders `resources/views/app.blade.php`.

`resources/js/app.tsx` starts the Inertia React app and resolves pages from `resources/js/pages`. Navigation uses Inertia links and Laravel routes.

Server-side rendering is disabled. Vite compiles the client assets. `php artisan serve` and `npm run dev` run together during development.

Shared Inertia props contain the application name, a flash status string, the signed-in user's id and name, and the workspaces that user belongs to (`id`, `name`, and `role`). Passwords, tokens, and email addresses are not shared. The members page shows names and roles, and it does not include email addresses.

## Interface

`PublicLayout` renders the landing page: the Insight wordmark, a light, dark, and system theme control, and links to log in or create an account. `Welcome` describes privacy-first product analytics. Event tracking, conversion funnels, retention, and user journeys are explained as later work.

`AuthLayout` renders login, registration, forgot password, and reset password. Validation errors stay tied to each field.

`AppLayout` is the signed-in shell: a skip link, sidebar, mobile dialog navigation, theme control, API status, a workspace switcher, a flash status, and an account menu whose logout is a POST. Dashboard, Workspaces, and Projects are working links. Events, funnels, retention, and account settings stay visible as coming-soon items and are not links. `Dashboard` requires a session. It lists the signed-in user's workspaces and does not invent metrics. It also lists the planned capabilities:

- Event tracking
- Conversion funnels
- Retention analytics
- User journeys
- Product engagement
- Workspaces and projects

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

Future event ingestion and authenticated product routes belong in this API file. They are not implemented.

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

The migrations for `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, and `failed_jobs` are already in `database/migrations` and are already applied to the `insight` database. Do not create a second set. Do not run `migrate:fresh`, `migrate:reset`, or `db:wipe`.

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

## Later milestones

- Invitations, role changes, and ownership transfer
- Batch event ingestion, funnels, retention, journeys, and engagement
- Billing, notifications, and subscription plans
