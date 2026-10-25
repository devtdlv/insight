# Insight architecture

Insight is a product analytics platform. The application is a conventional Laravel app with a React and TypeScript interface. People sign in with a Laravel session. Workspaces, projects, event ingestion, funnels, retention, and billing are later milestones.

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

Shared Inertia props contain the application name, a flash status string, and the signed-in user's id and name. Passwords, tokens, and email addresses are not shared.

## Interface

`PublicLayout` renders the landing page: the Insight wordmark, a light, dark, and system theme control, and links to log in or create an account. `Welcome` describes privacy-first product analytics. Event tracking, conversion funnels, retention, and user journeys are explained as later work.

`AuthLayout` renders login, registration, forgot password, and reset password. Validation errors stay tied to each field.

`AppLayout` is the signed-in shell: a skip link, sidebar, mobile dialog navigation, theme control, API status, and an account menu whose logout is a POST. Dashboard is a working link. Workspaces, projects, events, funnels, retention, and settings are visible as coming-soon items and are not links. `Dashboard` requires a session and is an empty state. It lists the planned capabilities:

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

The `users`, `password_reset_tokens`, and `sessions` tables come from the original migration. This milestone does not add another migration.

## Later milestones

- Workspaces and projects
- Event ingestion and a tracking SDK
- Conversion funnels, retention, journeys, and engagement
- Billing, notifications, and subscription plans
