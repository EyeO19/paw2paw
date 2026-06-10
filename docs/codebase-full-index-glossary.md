# Paw2Paw — Codebase Full Index / Glossary

This document is the single reference for the Paw2Paw repository: product overview, runtime journey, file-by-file index, cross-cutting patterns, tech stack glossary, and extension guide. A reader who has never opened a source file can understand what the product is, how it works at runtime, where every important file lives, and what every dependency in `package.json` actually does. The architecture trust-boundary diagram lives in [architecture.md](./architecture.md); **Part 5 — Tech Stack Glossary** maps each technology to that diagram and to specific files.

---

# Part 1 — Project Overview

Paw2Paw is an anonymous peer-support messaging platform built for Princeton students. The problem it addresses is familiar at elite institutions: marginalized students — first-generation, neurodivergent, students of color, student-athletes, LGBTQ+, international — are often assumed to be fine because they made it through a selective admissions process. In reality, they receive less mental health support than their peers need. Paw2Paw pairs students with peers who share overlapping identity and experience tags, anonymously, for one-to-one conversations. Crisis resources (988 and campus services) are always one tap away. Authorization is enforced at the database via Postgres Row-Level Security, not in application code — so even a leaked anon key cannot bypass access control without a valid user JWT.

The product loop has three stages. **Write** is where a student composes an anonymous message on `/compose`, selects topic tags, and submits. The `create_thread_with_message` RPC atomically creates a `pending` thread and its first message. **Match** is where an opted-in responder browses `/respond`, sees a FIFO queue of claimable threads whose tags overlap their own, and claims one via `claim_thread_for_responder`. The thread transitions to `matched`. **Connect** is the realtime conversation on `/thread/[id]`: both participants exchange messages through the `send_message` RPC, with inserts broadcast over Supabase Realtime on channel `conversation:{threadId}`. Either side can soft-close via `close_thread`, which sets `status = 'closed'` while preserving history.

The architectural philosophy rests on four pillars. First, **authorization at the database**: RLS policies and `SECURITY INVOKER` RPCs are the single source of truth; Server Actions validate input with Zod and map errors, but never decide who can read a thread. Second, **honest copy**: user-facing strings live in `lib/copy/*`, not inline in components, so messaging about limitations (no notifications, no read receipts) stays consistent. Third, **migration-driven schema**: every table, policy, RPC, and realtime publication change is a versioned SQL file in `drizzle/`, never a dashboard toggle. Fourth, **Server Components by default**: only forms, realtime subscriptions, and interactive UI carry the `'use client'` directive.

Current completion status is tracked in `docs/phase-2-progress.md`. All five Phase 2 chunks are done: Auth + onboarding (Chunk 1), Write flow with compose and pending state (Chunk 2), Match flow and responder side (Chunk 3), Conversation with realtime and end conversation — E2E signed off (Chunk 4), and Crisis interstitial plus safety UX (Chunk 5). The resume roadmap in `docs/roadmap-resume.md` lists pre-production checklist items: re-enable Confirm email, set Vercel env vars, run production migrations, and replace the README "coming soon" with a deployed URL and Loom. Broader P0–P5 priorities (deploy, CI, tests, polish) are referenced there for expansion.

This codebase serves three audiences. The primary builder is the student-developer (Ife Oluborode), using Cursor as a pair-programming partner with rules in `.cursor/rules/general.mdc`. Eventually, recruiters reviewing the repository should see a coherent MVP with deliberate security boundaries, documented tradeoffs in `docs/decisions.md`, and honest gaps rather than accidental omissions.

---

# Part 2 — How the System Works at Runtime

This section traces a single user's journey through the codebase, naming files and data flows at each step.

## Step 1: Anonymous student lands on the home page

The request hits `middleware.ts`, which delegates to `lib/supabase/middleware.ts` `updateSession`. With no auth cookie, `isPublicPath` allows `/` through. `app/page.tsx` is a Server Component: it calls `createClient` from `lib/supabase/server.ts`, runs `supabase.auth.getUser()`, finds no user, and renders login/signup links from `lib/copy/auth.ts`. No database query occurs for unauthenticated visitors.

## Step 2: Clicks Sign up, enters email + password

The user navigates to `app/signup/page.tsx` (Server Component shell) which renders `app/signup/signup-form.tsx` (Client Component). The form posts to the `signUp` Server Action in `app/actions/auth.ts`. Zod validates via `signUpSchema` from `lib/validations/auth.ts`. `supabase.auth.signUp` creates a row in `auth.users`. If Confirm email is disabled in dev and a session is returned immediately, `ensureUserProfile` from `lib/auth/ensure-user-profile.ts` inserts into `public.users` with `hashed_display_id` from `hashDisplayId` in `lib/auth/hash-display-id.ts` (HMAC-SHA256 + base32, keyed by `SIGN_DISPLAY_ID_SECRET`). `redirectAfterAuthenticatedSession` in `lib/auth/redirect-after-auth.ts` checks `needsOnboarding` from `lib/auth/onboarding.ts` (empty `topic_tags` means onboarding required) and redirects to `/onboarding` or `/`. If email confirmation is enabled, the user is redirected to `/login?message=confirm-email` without a session; profile creation waits until first sign-in.

## Step 3: Onboards — picks topic tags, decides whether to opt-in as responder

Middleware detects an authenticated user with empty `topic_tags` and redirects any non-`/onboarding` route to `/onboarding`. `app/onboarding/page.tsx` ensures the profile row exists, then renders `app/onboarding/onboarding-form.tsx`. Tags come from `TOPIC_TAGS` in `lib/constants/topic-tags.ts`. Submitting calls `completeOnboarding` in `app/actions/auth.ts`, validated by `onboardingSchema`. The action updates `users.topic_tags` and `users.opt_in_responder` via Supabase client (RLS policy `users_update_own` permits self-update only). Redirect goes to `/`.

## Step 4: Composes a message anonymously

From home, the onboarded user clicks "New conversation" → `/compose`. `app/compose/page.tsx` fetches profile tags for suggestions. `app/compose/compose-form.tsx` is a Client Component with crisis gating via `useCrisisSendGate` from `lib/crisis/use-crisis-send-gate.ts`. On submit, `createThread` in `app/actions/thread.ts` validates with `createThreadSchema`, then calls RPC `create_thread_with_message` (migration `0004`). The RPC runs as `SECURITY INVOKER` with `auth.uid()` as writer: inserts a `pending` thread and first message in one transaction. RLS policy `threads_insert_writer_pending` would also permit direct insert, but the RPC centralizes validation. Crisis phrase detection in `lib/constants/crisis-phrases.ts` may show `CrisisInterstitial` from `app/components/crisis-interstitial.tsx` before send; `CrisisResourceStrip` from `app/components/crisis-resource-strip.tsx` is always visible.

## Step 5: Their message lands in pending state

On success, `compose-form.tsx` tracks `message_sent` via `lib/analytics/track.ts` and navigates to `/thread/{id}/pending`. `app/thread/[id]/pending/page.tsx` verifies the user is the writer and status is `pending` (RLS `threads_select_participant` returns the row only for participants — here, writer only since `responder_id` is null). Honest copy from `lib/copy/compose.ts` explains no notifications exist yet. Links point to `/inbox` and home.

## Step 6: A different student (the responder) logs in, sees the message in /respond

The responder signs in (same auth path; `ensureUserProfile` on sign-in). They must have `opt_in_responder = true` and overlapping tags. `app/respond/page.tsx` queries `threads` with `.eq("status", "pending")`, `.neq("writer_id", user.id)`, `.overlaps("topic_tags", userTopicTags)`, ordered `created_at ASC`, limit 20. RLS policy `threads_select_claimable` enforces the same rules at the database. Nested `messages` select is allowed by `messages_select_on_claimable_thread` for preview text. `firstMessagePreview` from `lib/utils/message-preview.ts` and `formatRelativeTime` from `lib/utils/relative-time.ts` shape the list. `app/respond/respond-list.tsx` renders claim buttons.

## Step 7: Responder claims the thread

Claim submits to `claimThread` in `app/actions/respond.ts`, which calls RPC `claim_thread_for_responder` (migration `0005`). The RPC verifies opt-in, tag overlap, not self-match, then atomically sets `responder_id` and `status = 'matched'`. RLS policy `threads_claim_as_responder` (migration `0006`) requires `WITH CHECK (status = 'matched')`. Race losers get `already_claimed`. On success, client navigates to `/thread/{id}`.

## Step 8: Both sides exchange messages in realtime

`app/thread/[id]/page.tsx` loads thread and messages server-side (participant check via RLS `threads_select_participant` and `messages_select_thread_participant`). Pending threads redirect: writers to `/pending`, others to `/respond`. `ConversationShell` and `ConversationView` (Client Components) render the chat. `ConversationView` subscribes to Supabase Realtime channel `conversation:{threadId}` on `INSERT` to `public.messages` (publication added in migration `0009_enable_realtime.sql`). Optimistic sends use `tmp-{uuid}` ids; `sendMessage` Server Action calls RPC `send_message` (migration `0007`). De-duplication uses `removeTempDuplicate` in `lib/conversation/message-types.ts`. Scroll behavior follows `lib/utils/scroll-helpers.ts` (auto-scroll only when near bottom). `Composer` handles Enter-to-send, Shift+Enter for newline.

## Step 9: One side ends the conversation

`EndConversationButton` in `app/thread/[id]/end-conversation-button.tsx` calls `endConversation` → RPC `close_thread` (migration `0008`). Sets `threads.status = 'closed'`. `ConversationShell` updates local state; banner shows ended copy; composer hides. History remains visible. `send_message` would reject further sends with `thread_not_matched`.

## Step 10: Both sides can see the closed thread later in their inbox

`/inbox` in `app/inbox/page.tsx` queries threads where `writer_id` or `responder_id` matches the user (RLS participant policy). `InboxList` shows status badges and links: pending writer threads go to `/thread/{id}/pending`, others to `/thread/{id}`. Closed threads load normally with ended banner and no composer.

---

# Part 3 — File-by-File Walkthrough

## 3.1 — Root configuration files

**package.json** defines the `paw2paw` package at version 0.1.0. Scripts include `dev`, `build`, `start`, `lint`, and database commands `db:generate`, `db:migrate`, `db:studio` (all loading `.env.local` via Node's `--env-file`). Dependencies center on Next.js 16.2.7, React 19, Supabase SSR 0.10.3, Drizzle ORM 0.45.2, Zod 4, and Tailwind CSS 4. No test runner is installed yet.

**tsconfig.json** enables strict TypeScript with `moduleResolution: "bundler"`, path alias `@/*` → project root, and the Next.js TypeScript plugin. `noEmit` is true because Next handles compilation.

**next.config.ts** exports a minimal `NextConfig` with no custom rewrites or headers. Deployment targets Vercel with default settings.

**postcss.config.mjs** registers `@tailwindcss/postcss` as the sole plugin. There is no separate `tailwind.config.*` file — Tailwind v4 uses CSS-first configuration in `app/globals.css` via `@import "tailwindcss"` and `@theme inline`.

**drizzle.config.ts** points Drizzle Kit at `lib/db/schema.ts` for schema introspection and `drizzle/` for migration output. `getMigrateUrl()` reads `DATABASE_MIGRATE_URL` (Session pooler, port 5432) and rejects direct `db.*.supabase.co` hosts that fail on IPv4 networks.

**middleware.ts** is a thin wrapper exporting `updateSession` from `lib/supabase/middleware.ts` with a matcher excluding static assets and images. Every non-public route requires authentication; onboarding-incomplete users are forced to `/onboarding`.

**.env.local.example** documents six environment variables: `NEXT_PUBLIC_SUPABASE_URL` (base URL, no `/rest/v1/`), `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` (Transaction pooler :6543), `DATABASE_MIGRATE_URL` (Session pooler :5432), and server-only `SIGN_DISPLAY_ID_SECRET`. Comments explain the pooler vs direct distinction.

**.gitignore** excludes `node_modules`, `.next`, `.env*` (except `.env.local.example`), build artifacts, and Vercel metadata.

**README.md** is the repository front door: problem statement, architecture Mermaid diagram, tech stack table, local setup steps, project structure summary, and links to roadmap and security docs. Status notes MVP in dev with production deploy in progress.

**LICENSE** is MIT, Copyright 2026 Ife Oluborode.

**CONTRIBUTING.md** describes local setup, branching (`main` + `feature/*`), migration discipline, Conventional Commits, and a pre-push checklist emphasizing no message-content logging and copy in `lib/copy/`.

**SECURITY.md** is the threat model: cross-user access, RLS probing, leaked anon key, future moderator abuse. Documents four RLS areas, what is not stored or logged, crisis UX as values-not-security, configuration hygiene, and responsible disclosure.

**.cursor/rules/general.mdc** is the always-applied Cursor rule file encoding stack choices, architecture rules (RLS source of truth, no inline copy, Server Components default), code style, and workflow conventions including pooler URLs and match/conversation flow summaries.

**eslint.config.mjs** extends `eslint-config-next` core-web-vitals and TypeScript presets with standard Next.js ignore patterns.

**pnpm-workspace.yaml** exists for pnpm monorepo compatibility though the project is effectively a single package.

### public/ directory

The **public/** folder holds static files served at the site root without processing — `public/window.svg`, `vercel.svg`, `next.svg`, `globe.svg`, and `file.svg` are leftover assets from [create-next-app](#create-next-app) bootstrap. Paw2Paw's UI does not reference these icons in routes; the product uses text and Tailwind styling rather than a custom logo asset. Next.js copies `public/` contents to the build output; Vercel serves them from the CDN alongside compiled JS. In the architecture diagram, static assets bypass Server Components and Supabase entirely — they are not part of the auth or data trust boundaries.

---

## 3.2 — app/ directory (the routes)

**app/layout.tsx** is the root layout Server Component. It loads Geist and Geist Mono from `next/font/google`, applies `app/globals.css`, and wraps children in a full-height flex column. Metadata still carries the create-next-app defaults ("Create Next App") — a known polish gap.

**app/page.tsx** (route: `/`) is a Server Component home page. It checks auth and profile to conditionally show links to `/compose`, `/inbox`, `/respond`, and `LogoutButton`. Unauthenticated users see login/signup links. No middleware-equivalent logic is duplicated; it trusts middleware for gating other routes.

**app/login/page.tsx** (route: `/login`) renders a Server Component shell with `LoginForm` inside `Suspense` (needed for `useSearchParams`). **app/login/login-form.tsx** is a Client Component using `useActionState` with `signIn` Server Action. Supports `?message=confirm-email` and `?error=` query params.

**app/signup/page.tsx** and **app/signup/signup-form.tsx** mirror the login pattern for registration with `signUp` action and minimum 8-character password.

**app/onboarding/page.tsx** (route: `/onboarding`) ensures profile exists, redirects if already onboarded, renders `OnboardingForm`. **app/onboarding/onboarding-form.tsx** is Client Component with topic checkboxes and responder opt-in.

**app/settings/page.tsx** (route: `/settings`) accepts optional `?from=` for safe return redirect via `safeInternalPath`. Loads current tags and opt-in state, renders `SettingsForm`. Currently linked from `/respond` opt-in prompt, not from home nav. **app/settings/settings-form.tsx** calls `updateProfile` action; newly enabling responder redirects to `/respond`.

**app/compose/page.tsx** (route: `/compose`) and **app/compose/compose-form.tsx** implement the write flow with crisis gating and suggested tags ordering.

**app/respond/page.tsx** (route: `/respond`) fetches claimable threads server-side. **app/respond/respond-list.tsx** is Client Component for claim forms. **app/respond/opt-in-prompt.tsx** directs non-opted-in users to settings.

**app/inbox/page.tsx** (route: `/inbox`) lists participant threads with role and status. **app/inbox/inbox-list.tsx** renders the link list with status badges.

**app/thread/[id]/page.tsx** (route: `/thread/[id]`) is the main conversation view for matched and closed threads. Server-fetches messages, handles pending redirects, renders `ConversationShell` + `ResourceBridge`. Uses `notFound()` when RLS returns no row.

**app/thread/[id]/pending/page.tsx** (route: `/thread/[id]/pending`) is the writer waiting room for pending threads.

**app/thread/[id]/conversation-shell.tsx** is Client Component managing thread status state and `EndConversationButton`. It holds local `threadStatus` state so the UI can transition to closed immediately after `close_thread` succeeds without a full page reload. The header shows topic tag pills and conditionally renders the end button only while status is `matched`.

**app/thread/[id]/conversation-view.tsx** is the most complex Client Component in the codebase. It owns the Supabase Realtime subscription, optimistic send pipeline, crisis send gate, message list rendering, toast notifications for report success/failure, and scroll discipline. On mount it scrolls to bottom; on each message array change it conditionally auto-scrolls only if the user is within 80px of the bottom. The realtime handler de-duplicates by message id and applies `removeTempDuplicate` when a confirmed message arrives that matches a pending optimistic row (same sender, content, within 5-second window). Reconnect logic sets `wasConnectedRef` so the first subscribe does not trigger a redundant refetch, but subsequent reconnects call `fetchAndMergeMessages` to heal any gaps.

**app/thread/[id]/composer.tsx** is the message input area with controlled textarea state, Enter-to-send (Shift+Enter for newline), 10,000-character max, and a registration callback so the crisis exit path can clear the composer without prop drilling.

**app/thread/[id]/message.tsx** renders individual bubbles aligned left (them) or right (you) without names or avatars, per conversation-design principles. Failed optimistic messages show a retry button; other-party messages show a report button unless already flagged or still sending.

**app/thread/[id]/end-conversation-button.tsx** uses `window.confirm` with copy from `conversationCopy.thread.confirmEnd` — a known P2 polish item to replace with an accessible dialog.

**app/thread/[id]/resource-bridge.tsx** renders collapsible campus resources on mobile (`<details>` element) and a persistent sidebar on desktop (`md:` breakpoint), sourcing links from `lib/constants/resources.ts` with headings from conversation copy.

There are no `loading.tsx`, `error.tsx`, or `not-found.tsx` route files. Loading states are inline (form `pending` flags); errors throw or return action errors; missing threads call `notFound()` from `next/navigation` inline.

### app/actions/

**app/actions/auth.ts** — Server Actions: `signUp`, `signIn`, `signOut`, `completeOnboarding`, `updateProfile`. All use Zod validation and Supabase server client. Profile bootstrap via `ensureUserProfile`.

**app/actions/thread.ts** — `createThread` calls `create_thread_with_message` RPC.

**app/actions/respond.ts** — `claimThread` calls `claim_thread_for_responder` RPC.

**app/actions/conversation.ts** — `sendMessage` (RPC), `endConversation` (RPC `close_thread`), `flagMessage` (direct UPDATE on `messages.flagged` under RLS policy `messages_flag_participant`).

---

## 3.3 — lib/ directory (the engine)

Everything in `lib/` is shared application logic — not a URL route, not a migration file, not user-facing copy isolated from code. The folder maps onto the trust boundaries in [architecture.md](./architecture.md) as follows.

**`lib/supabase/`** — The bridge between Next.js (browser, edge middleware, server) and Supabase. Browser Client Components use `client.ts`; Server Components and Server Actions use `server.ts`; `middleware.ts` in this folder refreshes JWT cookies at the edge. This is the "Client → server" and "Server → database" handoff in the diagram — still using the anon key and user JWT, never a service-role key.

**`lib/auth/`** — Identity bootstrap after Supabase Auth succeeds: create `public.users` rows, hash display IDs, detect incomplete onboarding, safe redirects. Auth stores email and password; `lib/auth` stores profile fields RLS protects.

**`lib/validations/`** — Zod schemas at the Server Action boundary. Validates shape before PostgREST/RPC calls. Complements RLS; does not replace it (see Part 5, Zod and RLS entries).

**`lib/db/`** — Drizzle schema (`schema.ts`) and optional runtime client (`index.ts`). Source of truth for table definitions that `drizzle/` migrations apply to Postgres. Runtime queries in production go through Supabase JS, not Drizzle — see Part 5, Drizzle ORM.

**`lib/copy/`** — All user-facing strings. Keeps honest product messaging (no false notification promises) separate from logic. Not in the security diagram; part of the values layer.

**`lib/constants/`** — Curated data: topic tags, campus resources, crisis phrase patterns. Shared between validation, UI, and client-side crisis detection.

**`lib/crisis/`** — Client-side interstitial and sessionStorage ack. Architecture.md classifies crisis UX as values, not a security boundary.

**`lib/analytics/`** — Dev-only event stub (`track.ts`). No message content; not wired to a production backend yet.

**`lib/conversation/`** — Message types, sort order, optimistic/realtime merge helpers for `conversation-view.tsx`.

**`lib/utils/`** — Small pure helpers: message previews, relative time, scroll discipline.

No `lib/` subdirectory holds secrets in source — `SIGN_DISPLAY_ID_SECRET` is read from environment at runtime in `hash-display-id.ts`.

### Database layer (lib/db/)

**lib/db/schema.ts** is the Drizzle ORM schema mirroring Postgres: `users` (id mirrors `auth.users`, `hashedDisplayId`, `optInResponder`, `topicTags` as `text[]`), `threads` (`thread_status` enum: pending/matched/closed, writer/responder FKs, topic tags), `messages` (content, flagged boolean). Indexes on `(status, created_at)` for threads and `(thread_id, created_at)` for messages.

**lib/db/index.ts** creates a Drizzle client over `postgres` with `prepare: false` for Transaction pooler compatibility. Validates pooler URL, caches client on `globalThis` for serverless reuse. The running app primarily uses Supabase JS client rather than Drizzle for queries; Drizzle is the schema source of truth and migration generator.

### Supabase clients (lib/supabase/)

**lib/supabase/client.ts** exports `createClient()` using `createBrowserClient` from `@supabase/ssr` for Client Components (realtime, no secrets).

**lib/supabase/server.ts** exports async `createClient()` using `createServerClient` with Next.js `cookies()` for Server Components and Server Actions.

**lib/supabase/middleware.ts** implements `updateSession`: refreshes JWT, gates unauthenticated users to public paths (`/`, `/login`, `/signup`), redirects auth users away from login/signup, enforces onboarding completion.

**lib/supabase/normalize-url.ts** validates `NEXT_PUBLIC_SUPABASE_URL` is the base project URL (rejects `/rest/v1/` suffix that caused a resolved signup bug documented in `docs/known-issues.md`).

### Auth helpers (lib/auth/)

**lib/auth/ensure-user-profile.ts** — idempotent insert into `public.users` with hashed display ID; handles race via unique constraint catch.

**lib/auth/hash-display-id.ts** — HMAC-SHA256 + base32 encoding; requires `SIGN_DISPLAY_ID_SECRET`.

**lib/auth/onboarding.ts** — `needsOnboarding()` returns true when `topic_tags` is empty.

**lib/auth/redirect-after-auth.ts** — post-login/signup redirect to onboarding or home.

**lib/auth/safe-internal-path.ts** — prevents open redirects; only same-origin paths starting with `/`.

### Copy files (lib/copy/)

All user-facing strings are centralized in seven modules, each exporting a single const object. **auth.ts** holds login and signup form labels, onboarding field descriptions, logout button text, and mapped error messages including invalid credentials and profile setup failures. **compose.ts** covers the new-conversation form (topic hints, content placeholder, submit states), the home page CTA label, and the pending-page body that honestly states the platform will not send notifications when a match occurs. **respond.ts** provides browse list empty state, claim button labels, created-time prefix, and error strings for unavailable threads. **conversation.ts** is the largest module: composer placeholder and send button, message delivery states (sending, failed, retry), end-conversation confirm dialog text, ended banner, resource sidebar headings, report button and toast messages, and navigation links back home. **inbox.ts** defines list title, empty state, status badge labels (pending, matched, closed), role labels (writer, responder), and footer links. **settings.ts** mirrors onboarding field copy for profile updates plus opt-in prompt CTA text used on the respond page. **crisis.ts** contains interstitial title, body, disclaimer, and continue/exit labels, plus the 988 strip heading and campus resources subheading. Components import these objects exclusively; grep for string literals in JSX should find only structural attributes, not product copy. This pattern means a content review can happen file-by-file without touching component logic, and a future i18n pass would swap `lib/copy/en/*.ts` modules per locale while leaving component imports stable.

### Validations (lib/validations/)

**auth.ts** — `signUpSchema`, `signInSchema`, `onboardingSchema` (reuses `topicTagsSchema`).

**compose.ts** — `createThreadSchema` with trimmed content 1–10,000 chars and 1–5 topic tags.

**conversation.ts** — `sendMessageSchema`, `endConversationSchema`, `flagMessageSchema` with UUID validation.

**respond.ts** — `claimThreadSchema` with thread UUID.

### Crisis layer (lib/crisis/ and lib/constants/crisis-phrases.ts)

**lib/constants/crisis-phrases.ts** — `normalizeForCrisisMatch`, `detectCrisisSignals` with high-specificity regex patterns. Explicitly excludes bare stems; phrases like "thoughts of suicide" are not matched so legitimate disclosure is not interrupted.

**lib/crisis/crisis-ack.ts** — sessionStorage keys to avoid re-showing interstitial for same content in one tab session.

**lib/crisis/use-crisis-send-gate.ts** — React hook wiring detection, interstitial state, analytics events, and proceed/clear callbacks. Used by compose and conversation forms.

### Analytics (lib/analytics/)

**events.ts** — constants: `message_sent`, `crisis_interstitial_shown`, `crisis_interstitial_acknowledged`, `message_reported`, `conversation_ended`, `resource_clicked`. Types for surface (`compose`, `conversation`, `crisis_strip`).

**track.ts** — dev-only `console.info` stub; never accepts message content, email, or `hashed_display_id`. Thread UUIDs are permitted.

### Constants (lib/constants/)

**topic-tags.ts** — curated list: identity, mental-health, academics, relationships, campus-life, family, other. Zod schemas for validation.

**format-topic-tag.ts** — slug-to-label helper (hyphens to spaces).

**resources.ts** — `CAMPUS_RESOURCES` array with Princeton-specific links (CPS Cares, SHARE, GSRC, Fields Center, Disability Services).

### Conversation utilities (lib/conversation/)

**message-types.ts** — `ConversationMessage` type with delivery status, `sortMessages`, `mapRowToMessage`, `upsertMessages`, `removeTempDuplicate` for optimistic/realtime merge.

### Utils (lib/utils/)

**message-preview.ts** — first message truncated to 200 chars for inbox/respond previews.

**relative-time.ts** — "just now", "5m ago", "3h ago", "2d ago" formatting.

**scroll-helpers.ts** — `isNearBottom` (80px threshold) and `scrollToBottom` for conversation scroll discipline.

---

## 3.4 — drizzle/ directory (the schema history)

**meta/_journal.json** tracks applied migrations: index, version, timestamp, tag name, and breakpoint flag for Drizzle Kit.

**0000_init.sql** — Creates `thread_status` enum, `users`, `threads`, `messages` tables, indexes, and FK from `users.id` to `auth.users.id` (cross-schema). Writer/responder/message FKs with appropriate `ON DELETE` behavior.

**0001_enable_rls.sql** — Enables RLS on all three tables. Policies: own profile select/insert/update; participant thread select/insert/update; claim policy (initial version); participant message select/insert.

**0002_responder_opt_in.sql** — Recreates `threads_claim_as_responder` to require `opt_in_responder = true` via subquery on `users`.

**0003_thread_topic_tags.sql** — Adds `topic_tags text[]` column to `threads`.

**0004_create_thread_with_message.sql** — `SECURITY INVOKER` RPC atomically creating pending thread + first message. Validates tags, content length. Granted to `authenticated`.

**0005_claim_thread_rpc.sql** — `claim_thread_for_responder` RPC with opt-in, overlap, self-match, and race checks.

**0006_rls_match_flow.sql** — Fixes claim `WITH CHECK` to `status = 'matched'`. Adds `threads_select_claimable` and `messages_select_on_claimable_thread` for responder browse.

**0007_send_message_rpc.sql** — `send_message` RPC: participant check, matched status only, content validation.

**0008_close_thread_rpc.sql** — `close_thread` RPC: participant check, matched → closed transition.

**0009_enable_realtime.sql** — `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages` (migration-driven, not dashboard).

**0010_messages_flag_participant.sql** — `messages_flag_participant` UPDATE policy: participants can set `flagged = true` only.

---

## 3.5 — docs/ directory (the documentation)

**architecture.md** — Mermaid trust-boundary diagram and prose on client→server→database→realtime boundaries. Written for interview prep and security review.

**decisions.md** — ADR-lite append-only log, one entry per notable tradeoff. The RLS entry explains why app-layer checks alone fail when PostgREST exposes direct API access. The FIFO entry documents fair queue behavior and starvation risk for niche tags. The crisis interstitial entry contrasts sender-side reflection against receiver badges that would leak distress signals. The soft-close entry explains why hard delete harms safety review. The pooler entry documents IPv6 direct-connection failures on Macs. The `text[]` entry explains flexibility over Postgres enums. The hashed display ID entry covers HMAC stability without PII. The profile-on-sign-in entry compares three options (signup atomic, first-sign-in, auth hook) and notes the bounded orphan window between signup and profile creation.

**conversation-design.md** — Principles (no read receipts, no typing), soft close behavior, realtime channel naming, optimistic sends, scroll rules, resource bridge, crisis safety, sender vs receiver framing for interviews.

**matching.md** — v1 FIFO rules (implemented) and v2 weighted sketch (not implemented).

**phase-2-progress.md** — Chunk completion table; all five chunks marked Done.

**roadmap-resume.md** — Pre-production checklist and pointer to expand P0–P5 priorities.

**known-issues.md** — Open: no notifications (P2), no production deploy (P0.2), no tests/CI (P1), app shell polish (P2). Resolved: signup URL bug.

**e2e-checklist.md** — Manual test script for conversation, crisis, report, inbox flows with sign-off table.

**codebase-full-index-glossary.md** — This document (walkthrough, file index, and tech stack glossary combined).

---

## 3.6 — components/ directory

Shared components live under **app/components/** (not a top-level `components/` directory).

**crisis-interstitial.tsx** — Modal dialog with continue/exit buttons; copy from `lib/copy/crisis.ts`.

**crisis-resource-strip.tsx** — Always-visible 988 + campus links with analytics on click.

**logout-button.tsx** — Server-rendered form posting to `signOut` action.

---

# Part 4 — Cross-Cutting Concerns

## Authorization flow

The chain is: **middleware** refreshes JWT and redirects unauthenticated or onboarding-incomplete users → **Server Component or Server Action** calls `supabase.auth.getUser()` for identity (never trusts client-sent user IDs) → **Supabase PostgREST** attaches JWT to every query → **RLS policies** evaluate `auth.uid()` against row data → **SECURITY INVOKER RPCs** run as the caller, so policies still apply inside functions. Application code maps RPC exceptions to user-friendly errors but does not grant access. A direct browser call to Supabase with a stolen anon key still requires a valid session cookie/JWT.

## Realtime end-to-end

Migration `0009` adds `messages` to `supabase_realtime` publication. `ConversationView` creates channel `conversation:{threadId}` filtered to `INSERT` events on that thread. On subscribe/reconnect, `fetchAndMergeMessages` refetches and merges by id. Optimistic sends insert `tmp-*` rows locally; realtime or RPC response replaces them via `removeTempDuplicate`. Subscribers only receive rows their JWT could SELECT under `messages_select_thread_participant`.

## Copy management

Every user-facing string lives in `lib/copy/[domain].ts`. Components import named exports (`authCopy`, `composeCopy`, etc.). This discipline supports future i18n by swapping copy modules per locale, keeps honest messaging consistent (e.g., "we won't notify you" on pending page), and separates content review from logic review. Tag display labels use `formatTopicTagLabel` for slugs; full sentences belong in copy files.

## Analytics wiring

`trackEvent` is called from compose-form (message sent), conversation-view (sent, reported), end-conversation-button (ended), crisis-resource-strip (resource clicked), and use-crisis-send-gate (interstitial shown/acknowledged). The no-content rule is enforced in `track.ts` documentation and code: only event names and safe metadata (thread_id, surface, resource_id, action). Development logs to console; production backend integration is not yet wired.

## Two pooler URL pattern

`DATABASE_URL` uses Supabase Transaction pooler (port 6543) with `prepare: false` for Next.js serverless short-lived connections. `DATABASE_MIGRATE_URL` uses Session pooler (port 5432) because Drizzle Kit migrations need a stable session for DDL. Direct `db.*.supabase.co` is avoided because it is IPv6-only on many networks (documented in ADR and `.env.local.example`). Both URLs are server-only; the browser never sees Postgres connection strings.

---

# Part 5 — Tech Stack Glossary

This glossary defines every package in `package.json`, every major platform, and the `drizzle/` and `public/` directories for readers who have never written a web application. Each entry ties back to [architecture.md](./architecture.md) where relevant. Marginalized students deserve a platform whose stack is legible — this section makes the reasoning public.

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

# Part 6 — What's NOT in This Codebase

These omissions are deliberate, documented, and scheduled — not oversights.

**No automated tests or CI** — `package.json` has no test script; `docs/known-issues.md` marks this P1. Roadmap expansion in `docs/roadmap-resume.md` references GitHub Actions and focused tests for auth, RLS paths, and crisis phrase detection.

**No email or push notifications** — Writers are not alerted when threads are claimed or messages arrive. Mitigated by honest pending copy and inbox. Deferred to P2 per `docs/known-issues.md` and `docs/decisions.md` conversation omissions.

**No moderator dashboard** — `messages.flagged` is stored (migration `0010`) for future review, but no admin UI exists. `SECURITY.md` notes flagged rows for future tooling without logging content.

**No shadcn/ui components** — Custom Tailwind components throughout. Deferred to P2 polish per `.cursor/rules/general.mdc` and `docs/known-issues.md`.

**No production deploy** — README shows "Live demo: coming soon". P0.2 in `docs/known-issues.md` and pre-production checklist in `docs/roadmap-resume.md`.

**No Loom demo or screenshots** — Referenced as post-deploy P0.3/P0.7 work in roadmap.

**No persistent app shell or nav** — Home page is minimal links; settings only reachable via respond opt-in prompt. P2 polish item.

**No rate limiting** — `SECURITY.md` out-of-scope list.

**No read receipts, typing indicators, edit/delete, attachments** — Explicit conversation-design omissions.

**Drizzle runtime queries unused** — App queries via Supabase JS; `lib/db/index.ts` exists for schema tooling and potential future server-side Drizzle use.

---

# Part 7 — How a New Engineer Would Extend This

**Adding a new topic tag** — Add the slug to `TOPIC_TAGS` in `lib/constants/topic-tags.ts`. No migration needed because tags are `text[]`, not a Postgres enum (ADR in `docs/decisions.md`). Zod `topicTagSchema` updates automatically from the const array. Copy files may need new hint text if the tag warrants explanation.

**Adding a new crisis phrase** — Add a regex to `CRISIS_PHRASE_PATTERNS` in `lib/constants/crisis-phrases.ts` with word-boundary discipline. Add unit tests when P1 test infrastructure lands. Review against false-positive risk per `docs/conversation-design.md`. No server changes; detection is client-side only.

**Adding a new RLS policy** — Write a new SQL migration in `drizzle/`, register in `meta/_journal.json` via `pnpm db:generate` or manual entry, run `pnpm db:migrate`. Update `SECURITY.md` plain-English summary. Never apply dashboard-only DDL.

**Adding a new RPC** — Migration with `SECURITY INVOKER`, `SET search_path = public`, `GRANT EXECUTE TO authenticated`. Optionally add Drizzle-agnostic wrapper in a Server Action. Map exceptions to copy in the action file. Validate inputs with Zod in `lib/validations/`.

**Adding a new route** — Create `app/[route]/page.tsx` as Server Component by default. Add Client form component if needed. Create `lib/copy/[route].ts` for strings. If the route requires auth, middleware already protects all non-public paths; add onboarding/profile checks in the page if needed. Add section to `docs/e2e-checklist.md` for manual verification.

**Adding analytics events** — Define constant in `lib/analytics/events.ts`, call `trackEvent` without content fields, document in `SECURITY.md` if it touches user data boundaries.

---

# Part 8 — Where the Project Stands

**What works today:** The verified happy path runs end-to-end in local development. A student can sign up, onboard with tags, compose a message, wait on the pending page, and have a different opted-in responder with overlapping tags claim the thread from FIFO browse. Both participants exchange messages with realtime delivery, optimistic UI, crisis interstitial gating, resource strips, message reporting, and soft conversation close. Closed and pending threads appear in inbox with correct routing. Authorization holds via RLS even if Server Actions are bypassed. Phase 2 chunks 1–5 are complete per `docs/phase-2-progress.md`.

**What's next:** P0.2 production deploy to Vercel with env vars, production migrations, and README update with live URL. P0.7 Loom walkthrough for recruiters. P1 engineering discipline: GitHub Actions running `pnpm lint` and `pnpm build`, plus focused tests. P2 polish: app shell, accessible end-conversation dialog replacing `window.confirm`, optional shadcn adoption, and minimal match notifications. Weighted matching v2 remains designed but unimplemented in `docs/matching.md`.

**What a recruiter should take away:** This is a student-built MVP demonstrating production-minded choices — database-enforced authorization, migration-driven infrastructure, honest UX about limitations, crisis safety without surveillance, and documented architectural decisions. The code is readable, convention-consistent, and intentionally scoped. Gaps (no CI, no deploy, no tests) are labeled with priority in `docs/known-issues.md`, not hidden. The repository tells a complete product story from problem statement through runtime behavior to deliberate deferrals.
