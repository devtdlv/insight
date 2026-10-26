# Insight

Insight is a privacy-first product analytics platform for understanding how people use your software. It is a Laravel application with a React and TypeScript interface rendered through Inertia.js.

The public page explains event tracking, conversion funnels, retention, and user journeys. A signed-in user can create workspaces and analytics projects. Each project has a public write key. An application can send named events to that project, and the project page lists the events it has stored. The dashboard does not show product metrics. Light, dark, and system themes are supported.

## Stack

- Laravel 12 on PHP 8.2
- React 19, TypeScript, and Inertia.js
- Vite and Tailwind CSS
- MariaDB 10.11 through Laravel's `mysql` driver
- Database-backed cache, sessions, and queues
- Pest for PHP tests
- Vitest and React Testing Library for interface tests
- Laravel Pint, ESLint, and Prettier

Docker, Redis, PostgreSQL, and WSL are not required.

## Local Windows development

Run these commands from the repository root in PowerShell.

```powershell
composer install
npm install
php artisan serve
npm run dev
```

Open `http://127.0.0.1:8000`. Keep `php artisan serve` and `npm run dev` running in separate windows. Vite serves the frontend assets. Laravel serves the pages.

Run the queue worker in a third window when you want queued jobs processed:

```powershell
php artisan queue:work
```

The existing MariaDB database is `insight` on `127.0.0.1:3306`, with the username `insight`. Copy `.env.example` to `.env` on a new machine and set `DB_USERNAME` and `DB_PASSWORD` there. Do not commit `.env`, and do not point `DB_DATABASE` at any other database.

The original cache, session, and queue migrations are already applied to MariaDB. Workspace, project, write-key, and analytics event tables are added by later migrations. From the repository root, run:

```powershell
php artisan migrate
```

Do not run `migrate:fresh`, `migrate:reset`, or `db:wipe`. `php artisan migrate` adds `projects.write_key` and the `analytics_events` table. It does not reset existing rows.

## Checks

```powershell
vendor\bin\pint
php artisan test
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

`php artisan test` uses SQLite in memory. That suite does not connect to MariaDB, and a passing run is not proof that MariaDB is reachable.

## Routes

- `GET /` renders the Insight landing page through Inertia.
- `GET /register` and `POST /register` create an account.
- `GET /login` and `POST /login` start a session.
- `POST /logout` ends a session.
- `GET /forgot-password` and `POST /forgot-password` request a password reset.
- `GET /reset-password/{token}` and `POST /reset-password` choose a new password.
- `GET /dashboard` renders the dashboard for a signed-in user.
- `GET /workspaces` lists workspaces for the signed-in user. Creating one makes that user the owner.
- `GET /workspaces/{workspace}` is the workspace overview. Settings, members, and projects are nested under that workspace.
- `GET /api/v1/health` returns JSON: `{"status":"ok","service":"insight-api"}`.
- `POST /api/v1/events` stores one event for the project identified by a public write key.
- `GET /workspaces/{workspace}/projects/{project}/tracking` shows that key and an SDK example.
- `POST /workspaces/{workspace}/projects/{project}/write-key` rotates the key. Owners and admins only.
- `GET /workspaces/{workspace}/projects/{project}/events` lists stored events for that project.

Password reset messages use `MAIL_MAILER`. The example environment logs them. Authentication does not add a migration and does not create a workspace. Workspace, membership, project, write-key, and event tables are added with `php artisan migrate`.

Web pages live in `routes/web.php` and keep Laravel session authentication and CSRF protection. The public API lives in `routes/api.php` and stays outside the Inertia middleware. Ingestion does not use a session.

## Event ingestion

`POST /api/v1/events` accepts one JSON object. The project is the row whose `write_key` matches. A `project_id` in the body is ignored.

```json
{
  "write_key": "iw_0123456789abcdef0123456789abcdef",
  "name": "note_created",
  "anonymous_id": "anon_reader001",
  "user_id": "reader_42",
  "properties": { "notebook": "Field notes" },
  "occurred_at": "2026-10-26T12:00:00Z",
  "event_id": "evt_note000000001"
}
```

`write_key`, `name`, `anonymous_id`, and `occurred_at` are required. `user_id`, `properties`, and `event_id` are optional. Names start with a letter and may contain letters, numbers, underscores, dots, colons, and hyphens, up to 80 characters. Identifiers are 8 to 64 characters from the same set without a leading-letter rule. `occurred_at` must fall between 30 days ago and one day ahead. Properties must be a JSON object, at most 8 KB, with at most 40 keys, four levels of nesting, and string values of at most 500 characters. The whole request body must be at most 16 KB.

| Status                       | Meaning                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 200 `{"status":"accepted"}`  | The event was stored.                                                                                                                 |
| 200 `{"status":"duplicate"}` | The same `event_id` was already stored for this project. No second row is created.                                                    |
| 401                          | The write key is well formed and does not match a project.                                                                            |
| 403                          | The project is archived.                                                                                                              |
| 413                          | The body is larger than 16 KB.                                                                                                        |
| 415                          | The request is not JSON.                                                                                                              |
| 422                          | The payload failed validation.                                                                                                        |
| 429                          | The write key and client IP sent more than the configured number of events in a minute. The default is 60. `Retry-After` is included. |

A repeated request with the same `event_id` for the same project returns `duplicate` and leaves the first row unchanged. A different project may use that same `event_id`. Requests without an `event_id` are stored every time. The database unique index is `(project_id, client_event_id)`.

The endpoint allows any browser origin, the `POST` and `OPTIONS` methods, and the `Content-Type` and `Accept` headers. It does not accept credentials. `GET /api/v1/health` still uses the `CORS_ALLOWED_ORIGINS` list. Authenticated pages keep CSRF protection.

Errors name the problem. They do not include the project name, workspace name, or internal id.

## JavaScript SDK

The SDK is `sdk/src/index.ts`. It is not published to npm. Copy it into an application, or point the bundler at that file. The import name below is illustrative.

```ts
import { Insight } from '@insight/sdk';

const insight = new Insight({
  writeKey: 'iw_0123456789abcdef0123456789abcdef',
  endpoint: 'http://127.0.0.1:8000/api/v1/events',
});

insight.track('note_created', {
  notebook: 'Field notes',
});
```

`track()` sends one event, generates an event id, and includes the time. It returns a promise that resolves with `{ ok: true, status }` or `{ ok: false, error }`. It does not throw when the network fails, and it does not block the page. Set `debug: true` to print those failures in the console.

By default the SDK stores an anonymous id in `localStorage` under `insight.anonymous_id`. It does not set a cookie. Pass `persistence: 'memory'` to keep the id for the current page only. `identify('reader_42')` stores an application user id. Pass an id the application already has, not an email address. `reset()` replaces the anonymous id and clears the identified id.

The SDK does not track pages, clicks, forms, sessions, fingerprints, IP addresses, or location. An event is sent only when the application calls `track()`.

## Write keys

Each project receives a key shaped like `iw_` plus 32 hexadecimal characters. The key is stored so the project page can display and copy it. It is public. Anyone who can read the application source can send events. The key cannot read events, open settings, or change the workspace.

Owners and admins can rotate it. The previous key stops working immediately. Archived projects reject new events until they are restored. Existing events stay in the project.

`INSIGHT_INGESTION_PER_MINUTE` defaults to 60. The limit uses the configured Laravel cache. Local development uses the database cache. The automated tests use the array cache.

## Further reading

See `docs/architecture.md` for the directory layout, the Inertia integration, and later milestones.
