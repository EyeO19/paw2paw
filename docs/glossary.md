# Paw2Paw — Tech Stack Glossary

Standalone reference for every package in `package.json`, major platforms, and the `drizzle/` and `public/` directories. Each entry ties back to `architecture.md` where relevant.

## Platforms (the cloud services)

### Supabase

Supabase is a hosted backend platform that bundles PostgreSQL (see [PostgreSQL](#postgresql)), user authentication, a REST API, and realtime message broadcasting into one managed service. A mental model: Supabase is like renting a fully staffed building for the app's data and identity — the database lives in the basement, security badges are issued at the front desk (Auth), and a messenger service (Realtime) pushes updates without everyone polling the front desk.

In [architecture.md](./architecture.md), the entire **Supabase** subgraph is the authoritative data and authorization plane. Paw2Paw never connects from the browser with a god-mode admin key. Every request carries the logged-in student's identity as a JWT (a signed proof of login from Supabase Auth). Postgres evaluates [Row-Level Security (RLS)](#row-level-security-rls) on every query. Even a copied anon key from the JavaScript bundle cannot read another student's thread without a valid session.

**Supabase Auth** handles email/password signup and login via `app/actions/auth.ts`; sessions live in cookies refreshed by `middleware.ts` through [@supabase/ssr](#supabasessr). **PostgREST** is the REST API over Postgres; [@supabase/supabase-js](#supabasesupabase-js) sends SELECT, INSERT, UPDATE, and RPC calls. **PostgreSQL functions** in `drizzle/*.sql` — `create_thread_with_message`, `claim_thread_for_responder`, `send_message`, `close_thread` — run as `SECURITY INVOKER` under the caller's JWT. **Supabase Realtime** publishes INSERTs on `messages` (migration `0009`) to channel `conversation:{threadId}` in `conversation-view.tsx` — the diagram's arrow from Postgres to Client Components.

**Pooler URLs** split connection modes. **Transaction pooler** (port 6543, `DATABASE_URL`) suits serverless: short borrows per Next.js/Vercel request; `prepare: false` in `lib/db/index.ts`. **Session pooler** (port 5432, `DATABASE_MIGRATE_URL`) suits Drizzle Kit migrations and `pnpm db:studio`. Direct `db.*.supabase.co` is avoided (often IPv6-only). `NEXT_PUBLIC_*` vars are browser-safe; `DATABASE_*` and `SIGN_DISPLAY_ID_SECRET` are server-only. `lib/supabase/normalize-url.ts` rejects `/rest/v1/` URLs that broke signup (see `known-issues.md`).

Supabase is not Next.js — it does not render pages. It is not Firebase's document model. Crisis phrase detection is browser UX, not Supabase moderation. Versions: `@supabase/supabase-js` ^2.107.0, `@supabase/ssr` ^0.10.3. Tradeoff versus self-hosted Postgres: one dashboard for Auth, SQL, and Realtime with SQL-first RLS reviewable in git.

### Vercel

Vercel is a cloud platform for deploying Next.js and similar frameworks. A mental model: Vercel is a print shop and CDN — push code, get an optimized build distributed globally without operating servers.

Paw2Paw targets Vercel for production (not yet live; P0.2). In architecture terms, Vercel hosts the **browser**, **edge** (`middleware.ts`), and **server** (Server Components, Server Actions) boxes — not the Supabase subgraph. Students load HTML/JS from the CDN; routes that need server logic invoke **serverless functions**: short-lived [Node.js](#nodejs) processes that run `app/` code, call `lib/supabase/server.ts`, and return responses. No persistent server between requests; cold starts are an accepted MVP tradeoff.

`pnpm build` produces the artifact Vercel deploys. Environment variables mirror `.env.local.example`. Only `NEXT_PUBLIC_*` reaches the client bundle; pooler URLs and `SIGN_DISPLAY_ID_SECRET` stay server-side — matching architecture's rule that secrets never ship to the browser. Pre-production: run `pnpm db:migrate` on production `DATABASE_MIGRATE_URL` before real users arrive (`roadmap-resume.md`).

Vercel integrates with [GitHub](#github) for deploy-on-push once CI exists (P1). It is not Supabase, not GitHub, not required for `pnpm dev` locally. Versus a single VPS: zero ops, automatic scaling — fit for a portfolio MVP.

### GitHub

GitHub hosts the Git repository, pull requests, and security advisories. A mental model: a time-stamped library of every project version with a desk for proposed edits.

Source: `github.com/EyeO19/paw2paw`. Architecture docs, `drizzle/` migrations, and `app/` routes share one history for recruiters. `SECURITY.md` points researchers to GitHub Security Advisories. Planned P1: Actions running `pnpm lint` and `pnpm build`. GitHub does not run the live site without Vercel hooks; dependencies install from npm via pnpm, not from GitHub directly.

---

## Languages and Runtimes

### TypeScript

TypeScript adds static type annotations to JavaScript — compile-time checks that catch shape errors before students hit broken flows. Mental model: spell-checker for code structure.

Every `.ts` and `.tsx` file uses TypeScript with `strict` in `tsconfig.json`. Types flow from [Zod](#zod) via `z.infer`, from Drizzle in `lib/db/schema.ts`, and from hand-written types like `ConversationMessage`. Compiles to [JavaScript](#javascript) during `pnpm build`; does not run directly. Version ^5. `@types/node`, `@types/react`, and `@types/react-dom` supply TypeScript definitions for those ecosystems (see below). Versus plain JS: fewer authorization and data-shape bugs in a privacy-sensitive app.

### JavaScript

JavaScript is the language browsers and Node.js execute. TypeScript is JavaScript plus compile-time types. Paw2Paw authors TypeScript; Next.js emits JS for the browser (Client Components) and serverless handlers. Output lives in `.next/` after build — not authored as `.js` source. JavaScript is not Java. It handles behavior; HTML/CSS handle structure and appearance.

### Node.js

Node.js runs JavaScript outside the browser. Mental model: the same language as the browser, with files, network, and environment access.

Runs `pnpm dev`, `pnpm build`, `pnpm db:migrate`, and Vercel serverless functions. Server Actions execute in Node context. `lib/auth/hash-display-id.ts` uses Node `crypto`. Database scripts use `node --env-file=.env.local` (Node 20+ native env loading). [dotenv](#dotenv) is listed in `package.json` but application code does not import it — see dotenv entry. `@types/node` ^20 types Node APIs for TypeScript. Not the browser DOM — `sessionStorage` in `lib/crisis/crisis-ack.ts` runs only in Client Components.

---

## Framework Layer

### Next.js

Next.js is a React framework with routing, server rendering, and Server Actions. Mental model: React plus an operating system for URLs — decides what runs on server vs browser per route.

Version **16.2.7**. Uses **App Router** (`app/`). `middleware.ts` runs at the edge (architecture diagram). **Server Components** default — no `'use client'` — fetch on server (`app/respond/page.tsx`, `app/inbox/page.tsx`). **Client Components** (`'use client'`) for hooks, Realtime, forms — leaf nodes only. **Server Actions** in `app/actions/*` replace custom API routes for mutations.

Maps to architecture: Server Components and Server Actions box; edge middleware box. Not a database. Not React alone (see [React](#react)). Chosen for Vercel integration and server-first security boundaries.

### React

React builds UI from composable components returning JSX. Mental model: recipe cards — React updates only what changed when data updates.

**react** ^19.2.4 and **react-dom** ^19.2.4 pair with Next.js 16. `react-dom` mounts React trees into the browser DOM for Client Components. State in `conversation-view.tsx` and form `pending` flags drives re-renders. Server Components use JSX without client hooks. `@types/react` and `@types/react-dom` ^19 provide TypeScript types for React APIs. React does not enforce security — RLS does. Not a full framework without Next.js.

---

## Styling

### Tailwind CSS v4

Utility-first CSS framework — apply classes like `rounded-md bg-zinc-900` in JSX instead of separate CSS files. Mental model: labeled LEGO bricks for layout and color.

**tailwindcss** ^4 with CSS-first config in `app/globals.css` (`@import "tailwindcss"`, `@theme inline`). No `tailwind.config.js`. Zinc palette, responsive `md:` breakpoints for resource sidebar. Not a component library (shadcn deferred P2). Versus CSS Modules: faster solo iteration; longer `className` strings.

### PostCSS

CSS transformation pipeline before bundling. Mental model: CSS assembly line.

**postcss.config.mjs** registers **@tailwindcss/postcss** ^4 — the bridge plugin that compiles Tailwind utilities during `pnpm dev` and `pnpm build`. Runs automatically; not a day-to-day authoring surface. Not Sass/Less.

---

## Data Layer

### PostgreSQL

Open-source relational database — tables, typed columns, SQL queries. Mental model: industrial-scale spreadsheets with relationships.

Hosted by Supabase; architecture diagram's **PG** node. Tables `users`, `threads`, `messages` mirror `lib/db/schema.ts`. `thread_status` enum; `topic_tags` as `text[]` with `&&` overlap for matching. `users.id` FK to `auth.users.id`. Migrations in `drizzle/` are schema source of truth. Browser never talks to Postgres directly — only via Supabase API with JWT.

### Drizzle ORM

TypeScript library describing tables as code and generating migrations. Mental model: bilingual dictionary between TypeScript and SQL.

**drizzle-orm** ^0.45.2 in `lib/db/schema.ts` and `lib/db/index.ts`. Not the production query path — Supabase JS handles runtime reads/writes under RLS. Drizzle drives `pnpm db:generate` and schema types. Versus Prisma: SQL migrations stay readable in git for RLS security review.

### drizzle/ directory

The **`drizzle/`** folder is not an npm package — it is the versioned **SQL migration history** applied to Postgres. Mental model: a ledger of every structural change to the database, each entry reviewable in pull requests.

Contains `0000_init.sql` through `0010_messages_flag_participant.sql` plus `meta/_journal.json` (Drizzle Kit's migration index). This is where RLS policies, RPCs, and the Realtime publication live — the enforcement layer architecture.md describes. **Never** apply DDL only in Supabase dashboard without a matching file here (`CONTRIBUTING.md`). Applied via `pnpm db:migrate` using [drizzle-kit](#drizzle-kit) and `DATABASE_MIGRATE_URL`. Cross-schema FK to `auth.users` in `0000_init.sql`. Distinct from `lib/db/schema.ts` (TypeScript blueprint) and from `drizzle-orm` (runtime library).

### @supabase/supabase-js

Official JavaScript client for Supabase Auth, PostgREST, and Realtime. Mental model: the phone the app uses to call Supabase.

^2.107.0. `lib/supabase/client.ts` (browser, Realtime) and `lib/supabase/server.ts` (Server Components, Actions). Architecture: **API** node and browser **BC** arrow to REST/WebSocket. Not the database. Not `@supabase/ssr`.

### @supabase/ssr

Adapter for Supabase sessions in SSR and middleware. Mental model: coat-check desk for login cookies across server and browser.

^0.10.3. Used in `client.ts`, `server.ts`, and `lib/supabase/middleware.ts`. Without it, sessions break across navigations. Wraps `@supabase/supabase-js`; does not replace it.

### postgres (the driver)

Low-level Node driver for PostgreSQL wire protocol. Mental model: the phone line; Drizzle speaks over it.

**postgres** ^3.4.9 in `lib/db/index.ts` with `prepare: false` for transaction pooler. Server-only; not used for student-facing request paths in MVP — Supabase JS handles those. Used for Drizzle Studio and potential future server Drizzle queries. Not `pg` (older driver).

### Row-Level Security (RLS)

PostgreSQL feature filtering which rows each connection may see or modify, per policies in SQL. Mental model: bouncer inside the database checking every row against `auth.uid()`.

Architecture's **RLS** node — authorization source of truth (`docs/decisions.md`, `SECURITY.md`). Enabled in `0001_enable_rls.sql`; extended through `0010`. Policies: own profile, participant threads, claimable browse, message insert/select, flag update. RPCs are `SECURITY INVOKER`. Next.js validates with Zod but does not decide access. Not middleware, not encryption. Anonymous users have null `auth.uid()` and are denied.

---

## Validation

### Zod

Runtime schema validation for untrusted input. Mental model: bouncer at the Server Action door before PostgREST.

**zod** ^4.4.3 in `lib/validations/*` and `lib/constants/topic-tags.ts`. `safeParse` in Server Actions. Zod 4 uses `z.email()` in auth schemas. Does not replace RLS. Not TypeScript compile-time checks alone. Versus Yup/Joi: standard TypeScript inference in Next.js projects.

---

## Auth

Authentication uses **Supabase Auth** — see [Supabase](#supabase). `signUp` / `signIn` in `app/actions/auth.ts`; cookies via [@supabase/ssr](#supabasessr). `public.users` profiles via `lib/auth/ensure-user-profile.ts` — Auth holds credentials; app holds tags and opt-in. Middleware gates routes; `SIGN_DISPLAY_ID_SECRET` hashes display IDs. Architecture: **AUTH** node, JWT in cookie, server client bound to session. No OAuth in v1. Confirm email disabled in dev.

---

## Realtime

Live messages use **Supabase Realtime** — see [Supabase](#supabase). `send_message` INSERT → publication `0009` → WebSocket channel `conversation:{threadId}` in `conversation-view.tsx`. Architecture: **RT** arrow from PG to Client Components. Does not widen RLS. Writes still go through Server Actions/RPC. No typing indicators or read receipts.

---

## Tooling

### pnpm

Package manager installing dependencies from npm registry. Mental model: librarian linking shared library copies into the project.

`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm db:migrate`. `pnpm-lock.yaml` locks versions. `pnpm-workspace.yaml` exists for monorepo compatibility; repo is effectively single-package. Not npm CLI. Vercel runs its own install on deploy.

### ESLint

Static analysis for JS/TS bug patterns. Mental model: linter for suspicious code.

**eslint** ^9 with **eslint-config-next** 16.2.7 — see [eslint.config.mjs](#eslintconfigmjs). `pnpm lint`. Planned CI enforcement (P1). Does not type-check (TypeScript does). No Prettier configured.

### eslint.config.mjs

The ESLint **flat config** file at the repo root (ESLint 9 style). Extends `eslint-config-next` core-web-vitals and TypeScript presets; ignores `.next/`, `out/`, `build/`. Mental model: the rulebook `pnpm lint` enforces. Not a runtime dependency — dev tooling only. Keeps React hook rules and Next.js best practices consistent before CI lands.

### Turbopack

Fast dev bundler shipping with Next.js 16. Mental model: assembly line that rebuilds only changed files during `pnpm dev`.

Default for `next dev`. Production `pnpm build` produces Vercel output. Not configured separately. Not Vite. Students never interact with it directly.

### drizzle-kit

CLI for Drizzle migrations and Studio. Mental model: foreman comparing `schema.ts` blueprint to database and writing change orders in `drizzle/`.

**drizzle-kit** ^0.31.10. Scripts: `db:generate`, `db:migrate`, `db:studio` — each uses `node --env-file=.env.local`. Not runtime `drizzle-orm`. Not Supabase SQL editor.

### dotenv

Library for loading `.env` files into `process.env`. Mental model: reading secrets from a local file into the running process.

**dotenv** ^17.4.2 is in `devDependencies` but **no application or lib file imports it**. Paw2Paw loads secrets via Node's native `--env-file=.env.local` flag on database scripts (`package.json` `db:*` commands) and via Next.js automatic `.env.local` loading for `pnpm dev` / `pnpm build`. dotenv may satisfy a transitive tooling dependency or remain for future scripts. Do not commit `.env.local` — `.gitignore` excludes it; `.env.local.example` documents required keys. Not a substitute for Vercel env vars in production.

### create-next-app

Official Next.js scaffold that bootstrapped the repo — `app/`, `next.config.ts`, default `layout.tsx`, `public/*.svg`. Ran once at project creation; not an ongoing dependency. Residual: layout metadata still says "Create Next App" (P2). Paw2Paw architecture was built after bootstrap.

### Type definition packages (@types/node, @types/react, @types/react-dom)

**@types/*** packages are TypeScript-only — they describe JavaScript APIs for the compiler without shipping runtime code. `@types/node` ^20 types Node APIs (`crypto`, `process.env`). `@types/react` and `@types/react-dom` ^19 type React and DOM mounting APIs. Mental model: dictionary entries for TypeScript, not code students run. DevDependencies only; stripped from production bundles.

---
