# Insight v0.1.0: Portfolio MVP

Insight is a privacy-first product analytics portfolio application built with Laravel 12, React, TypeScript, Inertia.js, and MariaDB. This release marks the completed MVP. It is source code to run locally, not a hosted service, and it has not been deployed to production.

## What is included

**Authentication**

- Registration, sign-in, sign-out, and password reset with Laravel session authentication
- Rate-limited login and password-reset requests

**Workspaces and projects**

- Workspaces with owner, admin, and member roles
- Projects with a timezone, a public write key, and archive and restore
- Server-side authorization through policies and a tenant check that returns 404 outside your workspaces

**Event tracking**

- `POST /api/v1/events` with strict validation, a 16 KB body limit, and a per-key, per-IP rate limit
- Per-project deduplication by client event id
- A dependency-free TypeScript SDK (`sdk/src/index.ts`) with `track()`, `identify()`, and `reset()`
- Rotatable write keys that can only record events

**Analytics**

- Total events, unique visitors, identified users, and events per visitor, with previous-period comparison
- Activity over time, top events, and a recent event list
- Preset and custom date ranges up to 90 days, calculated in the project timezone

**Quality**

- Pest feature and unit tests, and Vitest with React Testing Library
- TypeScript, ESLint, Prettier, and Laravel Pint checks
- GitHub Actions CI for all of the above

## Requirements

PHP 8.2 or newer, Composer, Node.js (20.19+, 22.13+, or 24), npm, and MariaDB 10.11. See the [README](../README.md#local-development) for setup.

## Known limitations

- Not deployed, audited, or certified
- PHP tests run on SQLite in memory, so MariaDB-specific behavior is not covered by automated tests
- No member invitations or role changes
- No batch ingestion, funnels, retention, or workspace-wide reporting
- The SDK is not published to npm

See the [README](../README.md#known-limitations) for the full list.
