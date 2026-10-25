# Insight

Insight is a privacy-first product analytics platform for understanding how people use your software. It is a Laravel application with a React and TypeScript interface rendered through Inertia.js.

The public page explains event tracking, conversion funnels, retention, and user journeys. The dashboard is an empty state for a signed-in user. It does not collect events, and it does not show product metrics. Light, dark, and system themes are supported.

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

This environment already has the Insight migrations applied. Do not run `migrate:fresh`, `migrate:reset`, or `db:wipe`.

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
- `GET /api/v1/health` returns JSON: `{"status":"ok","service":"insight-api"}`.

Password reset messages use `MAIL_MAILER`. The example environment logs them. No new database migration is required for authentication.

Web pages live in `routes/web.php`. The public API lives in `routes/api.php` and stays outside the Inertia middleware. Event ingestion is a later milestone.

## Further reading

See `docs/architecture.md` for the directory layout, the Inertia integration, and later milestones.
