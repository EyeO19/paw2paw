# Contributing

Paw2Paw is a personal project; this doc describes how work is done locally so future-you (or a reviewer) can onboard quickly.

## Local setup

```bash
pnpm install
cp .env.local.example .env.local   # fill in values from Supabase dashboard
pnpm db:migrate
pnpm dev
```

See `.env.local.example` for each variable. Use **pooler** hosts (`*.pooler.supabase.com`), not `db.*.supabase.co`, on IPv4-only networks.

## Branching

- `main` — deployable; migrations applied on prod before merge when schema changes.
- `feature/<short-name>` — one logical change per branch (e.g. `feature/profile-settings`).

## Database changes

- **All schema and RLS changes go through `drizzle/*.sql`**, registered in `drizzle/meta/_journal.json`.
- Run `pnpm db:migrate` locally; never apply DDL from the Supabase SQL editor without a matching migration file in git.
- Realtime publication changes are migrations too (see `0009_enable_realtime.sql`), not dashboard toggles.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, etc. One concern per commit when possible.

## Pre-PR / pre-push checklist

- [ ] `pnpm lint` and `pnpm build` pass
- [ ] New migrations applied locally (`pnpm db:migrate`)
- [ ] Relevant section of `docs/e2e-checklist.md` exercised for the change
- [ ] **No logging of message content, email, or `hashed_display_id`** in handlers or analytics (`lib/analytics/track.ts` is event names only)
- [ ] User-facing strings live in `lib/copy/`, not inline in components

## Docs

Architecture, security, and design decisions live under `docs/`. Update `docs/decisions.md` when making a notable tradeoff.
