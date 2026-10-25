# Insight architecture

Insight is a product analytics platform. The first milestone is a conventional Laravel application with a React and TypeScript interface. Authentication, workspaces, projects, event ingestion, funnels, retention, billing, and notifications are later milestones.

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
├── tests/                Pest feature tests
└── docs/
```

`php artisan` runs from the repository root.

## Inertia

`routes/web.php` maps `/` to the `Welcome` page and `/dashboard` to the `Dashboard` page. `App\Http\Middleware\HandleInertiaRequests` is appended to the web middleware group and renders `resources/views/app.blade.php`.

`resources/js/app.tsx` starts the Inertia React app and resolves pages from `resources/js/pages`. Navigation uses Inertia links and Laravel routes.

Server-side rendering is disabled. Vite compiles the client assets. `php artisan serve` and `npm run dev` run together during development.

The shared Inertia props contain the application name only. Secrets are not shared with the browser.

## Interface

`AppLayout` is the responsive shell: a skip link, the Insight wordmark, Home and Dashboard links, and the API status indicator. `Welcome` introduces Insight as a product analytics platform. `Dashboard` states that analytics are not available yet and lists the planned capabilities:

- Event tracking
- Conversion funnels
- Retention analytics
- User journeys
- Product engagement
- Workspaces and projects

The pages do not invent metrics. The status indicator calls `GET /api/v1/health` on the same origin and accepts only the two-field health contract.

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

## Later milestones

- Authentication
- Workspaces and projects
- Event ingestion and a tracking SDK
- Conversion funnels, retention, journeys, and engagement
- Billing, notifications, and subscription plans
