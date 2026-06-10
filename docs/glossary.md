# Paw2Paw — Tech Stack Glossary

This glossary defines every major package and platform in the Paw2Paw codebase for readers who have never written a web application. Each entry explains what the technology is, how Paw2Paw uses it, and what it is not. For the full product narrative and file-by-file tour, see [codebase-walkthrough.md](./codebase-walkthrough.md).

---

## Platforms (the cloud services)

### Supabase

Supabase is a hosted backend platform that bundles PostgreSQL (see [PostgreSQL](#postgresql)), user authentication, a REST API, and realtime message broadcasting into one managed service. A mental model: Supabase is like renting a fully staffed building for your app's data and identity — the database lives in the basement, security badges are issued at the front desk (Auth), and a messenger service (Realtime) pushes updates to waiting rooms without everyone polling the front desk.

Paw2Paw uses Supabase as the authoritative store for profiles, threads, and messages, and as the enforcement layer for who can read or write each row. The application never connects to Postgres with a god-mode admin key in the browser. Instead, every request carries the logged-in student's identity as a signed token (a JWT — a compact proof of login issued by Supabase Auth). Postgres evaluates Row-Level Security policies (see [Row-Level Security (RLS)](#row-level-security-rls)) on every query using that identity. Even if someone copies the public "anon" key from the JavaScript bundle, they still cannot read another student's thread without a valid session.

The Supabase pieces Paw2Paw touches fit together as follows. **Supabase Auth** handles email-and-password signup and login; sessions are stored in HTTP cookies refreshed by `middleware.ts` via `@supabase/ssr` (see [@supabase/ssr](#supabasessr)). **PostgREST** is the REST layer Supabase exposes over Postgres; the `@supabase/supabase-js` client speaks to it for SELECT, INSERT, UPDATE, and RPC calls. **PostgreSQL functions** defined in `drizzle/*.sql` — `create_thread_with_message`, `claim_thread_for_responder`, `send_message`, `close_thread` — run as `SECURITY INVOKER`, meaning they execute with the caller's JWT, not elevated privileges. **Supabase Realtime** watches the `messages` table (publication added in migration `0009_enable_realtime.sql`) and pushes INSERT events to subscribed browsers on channels named `conversation:{threadId}` in `app/thread/[id]/conversation-view.tsx`.

Connection to Postgres from the developer machine and from future Vercel serverless functions uses Supabase's **pooler** URLs, not the raw database hostname. Supabase offers two pooler modes on different ports. The **Transaction pooler** (port 6543, `DATABASE_URL`) hands out short database connections suited to serverless — each Next.js request borrows a connection briefly and returns it. The app sets `prepare: false` in `lib/db/index.ts` because prepared statements do not survive transaction-pooling mode. The **Session pooler** (port 5432, `DATABASE_MIGRATE_URL`) keeps a stable session for Drizzle Kit migrations and `pnpm db:studio`. The direct `db.*.supabase.co` host is avoided because it is often IPv6-only and fails on many home networks — documented in `docs/decisions.md` and `.env.local.example`.

Environment variables split cleanly: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe in the browser bundle (RLS still applies); `DATABASE_URL`, `DATABASE_MIGRATE_URL`, and `SIGN_DISPLAY_ID_SECRET` stay server-only. URL normalization in `lib/supabase/normalize-url.ts` rejects the PostgREST path (`/rest/v1/`) that caused a resolved signup bug — the base project URL is required.

Supabase is not a replacement for Next.js (see [Next.js](#nextjs)) — it does not render web pages. It is not Firebase's document database model; data is relational tables in Postgres. It is not a moderation or crisis-classification service; crisis phrase detection runs in the browser for UX only. Version in this project: `@supabase/supabase-js` ^2.107.0, `@supabase/ssr` ^0.10.3. The tradeoff versus self-hosting Postgres plus custom Auth is operational simplicity and a single dashboard for Auth, SQL, and Realtime — appropriate for a student MVP with strong SQL-first security requirements.

### Vercel

Vercel is a cloud platform for deploying web applications built with frameworks like Next.js. A mental model: Vercel is a print shop and delivery network for your website — you push source code, Vercel builds an optimized version, and distributes it to edge locations so students load pages quickly without you operating servers.

Paw2Paw targets Vercel as its production host (deploy not yet live; see `docs/known-issues.md` P0.2). The repository's `package.json` scripts `build` and `start` follow the standard Next.js production path Vercel runs automatically on each deploy. When a student visits Paw2Paw in production, their browser requests HTML and JavaScript from Vercel's CDN. Interactive routes that need server logic — loading the inbox, running Server Actions for login or sending a message — trigger **serverless functions**: short-lived Node.js processes (see [Node.js](#nodejs)) that spin up on demand, execute `app/` Server Components and Server Actions, call Supabase with cookie-bound sessions from `lib/supabase/server.ts`, and return a response. Functions do not stay running between requests; cold starts are a known cost of serverless, acceptable for an MVP conversation product with moderate traffic.

Vercel's environment variable UI will hold production values mirroring `.env.local.example`: Supabase URLs and keys, both pooler connection strings, and `SIGN_DISPLAY_ID_SECRET`. Server-only variables are never exposed to the client bundle; only `NEXT_PUBLIC_*` prefixes reach the browser. The pre-production checklist in `docs/roadmap-resume.md` requires running `pnpm db:migrate` against production `DATABASE_MIGRATE_URL` before or immediately after first deploy so RLS policies and RPCs exist before real users sign up.

Vercel integrates naturally with GitHub (see [GitHub](#github)): pushes to `main` can trigger automatic deploys once CI is added (P1). Preview deployments per pull request are a common pattern not yet configured. Vercel is not Supabase — it does not store message content or enforce thread access. It is not a database host in this architecture; Postgres remains on Supabase. It is not required for local development; `pnpm dev` runs entirely on the developer's machine. Compared to running Next.js on a single long-lived VPS, Vercel trades always-on server simplicity for zero server administration and automatic scaling — a fit for a portfolio project that should stay online without manual ops.

### GitHub

GitHub is a web service for storing Git repositories, reviewing code changes, and coordinating collaboration. A mental model: GitHub is a time-stamped library of every version of the project, with a front desk for proposed edits (pull requests) and a mailbox for security reports.

The Paw2Paw source lives at `github.com/EyeO19/paw2paw`. Git records each commit; GitHub hosts the remote copy the developer pushes to. `CONTRIBUTING.md` describes branching (`main` plus `feature/*` branches) and Conventional Commits. `SECURITY.md` directs security researchers to GitHub Security Advisories or private issues for responsible disclosure. Documentation, migrations, and application code share one repository so recruiters and future contributors see a single coherent history. Planned P1 work adds GitHub Actions to run `pnpm lint` and `pnpm build` on push — not yet present in the repo.

GitHub is not Vercel — it does not run the live website unless connected via deploy hooks. It is not a package registry; dependencies are fetched from npm via pnpm. It does not replace local Git; developers still commit on their machines before pushing.

---

## Languages and Runtimes

### TypeScript

TypeScript is a programming language that adds static type annotations to JavaScript — labels on data shapes that the compiler checks before the code runs. A mental model: TypeScript is a spell-checker for code structure; it catches "you tried to use a thread ID where a password was expected" during development instead of at runtime when a student hits an error.

Every `.ts` and `.tsx` file in Paw2Paw is TypeScript. `tsconfig.json` enables `strict` mode, so nullability and type mismatches fail the build. Types flow from Zod schemas (see [Zod](#zod)) via `z.infer`, from Drizzle schema in `lib/db/schema.ts`, and from hand-written types like `ConversationMessage` in `lib/conversation/message-types.ts`. Server Actions return discriminated unions such as `{ ok: true; threadId: string } | { ok: false; error: string }` so Client Components handle success and failure explicitly.

TypeScript does not run in the browser or on the server by itself. It compiles to JavaScript (see [JavaScript](#javascript)) as part of the Next.js build. It is not a separate runtime from Node.js. Version: TypeScript ^5 in `package.json`. Versus plain JavaScript: more upfront typing discipline, fewer whole classes of production bugs in a codebase where authorization mistakes would harm students.

### JavaScript

JavaScript is the programming language web browsers execute and Node.js runs on servers. A mental model: JavaScript is the lingua franca of the web — every interactive button, form submission, and serverless function ultimately runs as JavaScript machine instructions.

TypeScript is JavaScript plus compile-time types. Paw2Paw authors write TypeScript; Next.js and `tsc` emit JavaScript bundles for the browser and for Node.js serverless handlers. Client Components marked `'use client'` — `conversation-view.tsx`, `compose-form.tsx`, crisis components — ship JavaScript to the student's browser. Server Components default to running on the server without shipping their logic to the client, reducing download size and keeping secrets off the wire.

JavaScript is not Java (a different language despite the name). It is not HTML or CSS — those describe page structure and appearance; JavaScript handles behavior. Paw2Paw does not author raw `.js` source files; output JavaScript lives in `.next/` after build.

### Node.js

Node.js is a runtime that executes JavaScript outside the browser, on servers and developer machines. A mental model: Node.js is a JavaScript engine in a box you can run from the terminal — same language as the browser, but with access to files, networks, and environment variables.

Paw2Paw uses Node.js when the developer runs `pnpm dev`, `pnpm build`, `pnpm db:migrate`, and when Vercel runs serverless functions in production. Server Actions in `app/actions/*` execute in a Node-compatible server context. `lib/auth/hash-display-id.ts` uses Node's `crypto` module for HMAC hashing. `package.json` database scripts invoke Drizzle Kit via `node --env-file=.env.local`.

Node.js is not the browser — it has no DOM (document object model for HTML). Code that calls `sessionStorage` in `lib/crisis/crisis-ack.ts` runs only in Client Components. Node.js is not Deno or Bun (alternative runtimes); this project follows standard Next-on-Node assumptions. `@types/node` ^20 supplies TypeScript definitions for Node APIs.

---

## Framework Layer

### Next.js

Next.js is a React-based framework for building full-stack web applications with routing, server rendering, and API patterns built in. A mental model: Next.js is React plus an operating system for URLs — it decides which code runs on the server, which ships to the browser, and which URL path shows which page.

Paw2Paw uses the **App Router** (the `app/` directory), not the legacy Pages Router. Each folder under `app/` maps to a URL: `app/inbox/page.tsx` serves `/inbox`, `app/thread/[id]/page.tsx` serves `/thread/{id}` with dynamic segments. `middleware.ts` runs at the **edge** before pages render, refreshing Supabase sessions and redirecting unauthenticated users to `/login`.

Next.js distinguishes **Server Components** and **Client Components**. Server Components are the default — no `'use client'` directive. They run only on the server during a request (or at build time for static parts). `app/respond/page.tsx` fetches claimable threads on the server and passes JSON props to child components; the student's browser never receives the raw Supabase query logic. **Client Components** carry `'use client'` and hydrate in the browser. They are required for React hooks (`useState`, `useEffect`), browser APIs, and Supabase Realtime subscriptions in `conversation-view.tsx`. Paw2Paw keeps Client Components as leaf nodes — forms and interactive views — per `.cursor/rules/general.mdc`.

**Server Actions** are async functions in `app/actions/*` marked `'use server'`. Forms call them with `useActionState`; they validate with Zod and call Supabase server client. They replace hand-written REST API routes for mutations like `signIn` and `sendMessage`.

Next.js is not React alone (see [React](#react)) — it adds routing, bundling, and server execution. It is not a database. Version: 16.2.7. Versus Remix or SvelteKit: Next.js was chosen for ecosystem maturity, Vercel integration, and App Router Server Components aligning with "fetch on server, interactivity on client" security boundaries.

### React

React is a library for building user interfaces from composable components — functions that return descriptions of HTML-like structure (JSX). A mental model: React is a recipe card system for UI — each component is a recipe; React figures out what changed on screen when data updates and updates only those parts.

Next.js embeds React as its view layer. Every `page.tsx` and component file exports a React function component. React 19.2.4 pairs with Next.js 16.2.7. State in Client Components (`messages` array in `conversation-view.tsx`, form `pending` flags in `login-form.tsx`) drives re-renders when realtime events arrive or actions complete. Server Components still use JSX syntax but do not use client-side state hooks.

React is not a full framework — it does not define routing or data fetching without Next.js. It is not Vue or Angular. React does not implement Paw2Paw's security; authorization lives in Supabase RLS. `react-dom` ^19.2.4 is the package that mounts React trees into the browser DOM.

---

## Styling

### Tailwind CSS v4

Tailwind CSS is a utility-first CSS framework: instead of writing separate `.css` class definitions, developers apply pre-built utility classes directly in JSX (`className="rounded-md bg-zinc-900 px-4 py-2"`). A mental model: Tailwind is a box of labeled LEGO bricks for layout and color — compose utilities instead of painting each brick from scratch.

Paw2Paw uses Tailwind v4 (^4 in `package.json`) with the CSS-first configuration model. `app/globals.css` imports Tailwind via `@import "tailwindcss"` and defines design tokens in `@theme inline` (background, foreground, font variables wired to Geist fonts from `app/layout.tsx`). There is no `tailwind.config.js`; v4 configures through CSS. All visual styling in routes and `app/components/*` uses Tailwind utility classes — zinc palette, rounded buttons, responsive `md:` breakpoints for resource sidebar versus collapsible mobile layout.

Tailwind is not a component library — it does not ship pre-built dialogs or nav bars (shadcn/ui adoption is deferred to P2). It is not inline styles in the React `style` prop. Versus CSS Modules: Tailwind keeps styling colocated with markup and speeds iteration for a solo developer; tradeoff is long `className` strings.

### PostCSS

PostCSS is a tool that transforms CSS through plugins before the browser or bundler consumes it. A mental model: PostCSS is a CSS assembly line — raw stylesheets pass through plugins that add vendor prefixes, bundle imports, or inject utility classes.

`postcss.config.mjs` registers `@tailwindcss/postcss` as the sole plugin. When Next.js builds CSS, PostCSS runs Tailwind's compiler so utility classes in JSX become real CSS rules in the production bundle. Paw2Paw does not author custom PostCSS plugins or complex CSS pipelines beyond Tailwind integration.

PostCSS is not Sass or Less (alternate CSS preprocessors). It is not required to understand for day-to-day Paw2Paw feature work — it runs automatically during `pnpm dev` and `pnpm build`.

---

## Data Layer

### PostgreSQL

PostgreSQL is an open-source relational database: data lives in tables with typed columns and foreign-key relationships, queried with SQL. A mental model: PostgreSQL is a spreadsheet engine at industrial scale — rows are students, threads, and messages; SQL is the language for asking precise questions across tables.

Supabase hosts Paw2Paw's Postgres instance. Tables `users`, `threads`, and `messages` mirror `lib/db/schema.ts`. The `thread_status` enum (`pending`, `matched`, `closed`) constrains conversation lifecycle. `topic_tags` are `text[]` arrays compared with overlap operator `&&` for matching. Cross-schema foreign key `users.id` references `auth.users.id` so every profile ties to exactly one Supabase Auth account.

PostgreSQL is not MongoDB (document store) or SQLite (embedded single-file DB for local apps). Paw2Paw does not query Postgres directly from the browser — access goes through Supabase's API with JWT identity. Migrations in `drizzle/` are the schema source of truth.

### Drizzle ORM

Drizzle ORM is a TypeScript library for describing database tables as code and generating SQL migrations. A mental model: Drizzle is a bilingual dictionary between TypeScript types and SQL table definitions — one definition drives both compile-time types and migration files.

`lib/db/schema.ts` defines Paw2Paw tables with Drizzle's `pgTable`, `pgEnum`, and column helpers. `drizzle.config.ts` points Drizzle Kit at that schema. `pnpm db:generate` diffs schema against the database and writes SQL to `drizzle/`; `pnpm db:migrate` applies pending files. The running application primarily uses Supabase JS for queries under RLS; `lib/db/index.ts` creates a Drizzle client for tooling and potential future server-side queries with `prepare: false` for the transaction pooler.

Drizzle is not Prisma (the most popular alternative ORM with a different schema language and client). It is not the query layer students hit in production — RLS-aware access uses Supabase client. Version: `drizzle-orm` ^0.45.2, `drizzle-kit` ^0.31.10. Tradeoff: SQL-forward migrations stay readable in git for security review; Prisma's abstraction can obscure raw RLS policy SQL.

### @supabase/supabase-js

`@supabase/supabase-js` is the official JavaScript client library for Supabase's Auth, REST (PostgREST), and Realtime APIs. A mental model: it is the telephone the app uses to call Supabase — login, fetch threads, subscribe to new messages.

`lib/supabase/client.ts` creates a browser client with `createBrowserClient` for Realtime in `conversation-view.tsx`. `lib/supabase/server.ts` creates a server client with cookie access for Server Components and Server Actions. Both use the publishable anon key and project URL. Calls like `supabase.from('threads').select(...)` and `supabase.rpc('send_message', ...)` translate to HTTP requests evaluated by Postgres RLS.

This package is not the database itself (see [Supabase](#supabase)). It is not `@supabase/ssr` — that package handles cookie bridging in Next.js specifically. Version ^2.107.0.

### @supabase/ssr

`@supabase/ssr` is a thin adapter that makes Supabase Auth sessions work with server-side rendering and middleware in frameworks like Next.js. A mental model: SSR is the coat-check desk for login sessions — the server and browser must share the same session cookie without leaking secrets to client bundles.

Paw2Paw uses `@supabase/ssr` in three places: `createBrowserClient` in `lib/supabase/client.ts`, `createServerClient` in `lib/supabase/server.ts`, and middleware session refresh in `lib/supabase/middleware.ts`. Cookies carry the JWT; middleware calls `getUser()` on every matched route so expired sessions redirect to login before protected pages render.

Without SSR helpers, Supabase sessions often break across server renders — users would appear logged out on navigation. This package does not replace `@supabase/supabase-js`; it wraps the same client with cookie handlers. Version ^0.10.3.

### postgres (the driver)

`postgres` is a low-level Node.js driver that speaks the PostgreSQL wire protocol — the binary language databases and clients use over TCP. A mental model: the driver is the phone line; Drizzle and SQL are the conversation.

`lib/db/index.ts` uses `postgres` ^3.4.9 to connect Drizzle to `DATABASE_URL` with `prepare: false` for Supabase transaction pooling. Paw2Paw does not use this driver for application request handling in the current MVP — Supabase JS handles runtime queries. The driver appears in migration tooling and Drizzle Studio (`pnpm db:studio`).

It is not `pg` (the older popular driver) or Supabase JS. Direct driver connections bypass PostgREST but still require credentials; Paw2Paw keeps driver usage server-only.

### Row-Level Security (RLS)

Row-Level Security is a PostgreSQL feature that filters which rows each database connection may see or modify, evaluated on every query based on policies written in SQL. A mental model: RLS is a bouncer inside the database — every row asks "does this logged-in user have permission?" before leaving the building.

Paw2Paw treats RLS as the authorization source of truth, documented in `docs/decisions.md` and `SECURITY.md`. Migration `0001_enable_rls.sql` enables RLS on `users`, `threads`, and `messages`. Policies name who can select participant threads (`threads_select_participant`), browse claimable pending threads (`threads_select_claimable`), insert messages (`messages_insert_participant_sender`), claim as responder (`threads_claim_as_responder`), and flag messages (`messages_flag_participant`). RPCs use `SECURITY INVOKER` so policies apply inside functions too.

Application Server Actions validate input with Zod but do not decide thread access — a buggy action cannot grant cross-user reads if RLS is correct. RLS is not application middleware, not Next.js middleware, and not optional defense — it is the enforcement layer. It is not encryption; rows remain readable to participants who pass policies. Anonymous visitors have no JWT, so `auth.uid()` is null and policies deny access.

---

## Validation

### Zod

Zod is a TypeScript library for defining runtime schemas — rules that check untrusted input shape and content at execution time. A mental model: Zod is a bouncer at the form door — it checks IDs are UUIDs, passwords meet length, and topic tag arrays are within bounds before data touches the database.

Schemas live in `lib/validations/auth.ts`, `compose.ts`, `conversation.ts`, and `respond.ts`. Server Actions call `safeParse` on form data and RPC arguments. `topicTagsSchema` in `lib/constants/topic-tags.ts` enforces one to five tags from the curated list. Zod 4 uses `z.email()` for email fields in auth schemas.

Zod does not replace RLS — a validated UUID thread ID still fails if RLS denies access. It is not TypeScript — types can lie if raw `FormData` bypasses compile checks. Version ^4.4.3. Versus hand-written `if` checks: schemas stay centralized and composable. Versus Yup or Joi: Zod's TypeScript inference is the standard in modern Next.js projects.

---

## Auth

Paw2Paw authentication is implemented through **Supabase Auth** — see [Supabase](#supabase) for the full platform picture. Email and password signup and login flow through `supabase.auth.signUp` and `signInWithPassword` in `app/actions/auth.ts`. Sessions live in cookies managed by [@supabase/ssr](#supabasessr). Profile rows in `public.users` are created by `ensureUserProfile` on sign-in (and on sign-up when email confirmation is disabled in dev), not by Supabase Auth itself — Auth stores credentials; the app stores tags and responder opt-in.

`middleware.ts` gates routes: public paths are `/`, `/login`, `/signup`; all others require a session. Onboarding completion is enforced by checking empty `topic_tags` in middleware and pages. `SIGN_DISPLAY_ID_SECRET` hashes stable anonymous display identifiers without exposing email to peers — see `lib/auth/hash-display-id.ts`.

Supabase Auth is not OAuth in v1 (no Google sign-in yet). It is not session management in application memory — cookies and JWT refresh are Supabase's responsibility. Confirm email is disabled in local dev per README; production checklist requires re-enabling it.

---

## Realtime

Live message delivery uses **Supabase Realtime** — see [Supabase](#supabase). When `send_message` inserts a row into `messages`, Postgres replication publishes the INSERT to subscribers on WebSocket channels. `conversation-view.tsx` subscribes to `conversation:{threadId}` with filter `thread_id=eq.{id}`. On reconnect, the client refetches and merges by message id to avoid duplicates alongside optimistic `tmp-*` sends.

Realtime does not replace Server Actions for sending — writes still go through `send_message` RPC. It does not widen access: subscribers only receive rows their JWT could SELECT under RLS. Publication is migration-driven (`0009_enable_realtime.sql`), not a dashboard toggle. No typing indicators or read receipts — see `docs/conversation-design.md`.

---

## Tooling

### pnpm

pnpm is a package manager for installing JavaScript dependencies from the npm registry — an alternative to npm and Yarn. A mental model: pnpm is a librarian that stores one copy of each library and links it into projects, saving disk space and install time.

Paw2Paw uses `pnpm install`, `pnpm dev`, `pnpm build`, and `pnpm db:migrate`. `pnpm-lock.yaml` locks exact dependency versions for reproducible installs. `pnpm-workspace.yaml` exists though the repo is effectively a single package. README and CONTRIBUTING assume pnpm commands.

pnpm is not the npm CLI — commands are `pnpm` not `npm`. It does not deploy code; Vercel runs its own install during build. Tradeoff versus npm: stricter dependency layout reduces phantom dependency bugs; slightly different CLI muscle memory.

### ESLint

ESLint is a static analysis tool that scans JavaScript and TypeScript for likely bugs and style violations. A mental model: ESLint is a linter for code patterns — unused variables, suspicious comparisons, React hook rules.

`eslint.config.mjs` extends `eslint-config-next` (core-web-vitals and TypeScript presets). `pnpm lint` runs ESLint. Planned P1 CI will enforce lint on push. ESLint does not type-check — TypeScript's compiler handles types. It does not format code — no Prettier is configured in this repo. Version ESLint ^9 with `eslint-config-next` 16.2.7.

### Turbopack

Turbopack is a fast bundler — the tool that compiles TypeScript, React, and CSS into browser-ready assets during development. A mental model: Turbopack is the assembly line that watches files and rebuilds only what changed when you edit code.

Next.js 16 uses Turbopack as the default development bundler when running `pnpm dev` (`next dev`). Production builds use Webpack or Turbopack depending on Next release defaults; `pnpm build` produces optimized output for Vercel. Paw2Paw does not configure Turbopack separately — it ships with Next.js.

Turbopack is not Vite (another popular dev bundler). It is not used for database migrations. Students using the deployed site never interact with Turbopack directly.

### drizzle-kit

drizzle-kit is the CLI companion to Drizzle ORM for generating and applying migrations and opening a database browser. A mental model: drizzle-kit is the construction foreman for schema changes — compares blueprint (`schema.ts`) to the building and writes change orders (`drizzle/*.sql`).

Scripts in `package.json`: `db:generate`, `db:migrate`, `db:studio`. All load `.env.local` via `node --env-file`. `db:migrate` uses `DATABASE_MIGRATE_URL` (session pooler). Contributors must never apply DDL only in Supabase dashboard without a matching git migration — see `CONTRIBUTING.md`.

drizzle-kit is not the runtime ORM (`drizzle-orm`). It is not Supabase's SQL editor. Version ^0.31.10.

### create-next-app

create-next-app is the official Next.js scaffolding command that generated the initial project structure — `app/`, `next.config.ts`, default `layout.tsx`, and toolchain wiring. Paw2Paw was bootstrapped with this template and then replaced generic content with Paw2Paw routes, Supabase integration, and Drizzle migrations. Residual template artifacts remain: `app/layout.tsx` metadata still says "Create Next App" (logged in `docs/known-issues.md` P2). create-next-app is not an ongoing dependency — it ran once at project creation. It is not Paw2Paw's architecture; the student-developer shaped everything after bootstrap.
