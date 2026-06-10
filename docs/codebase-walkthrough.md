# Paw2Paw — Comprehensive Codebase Walkthrough

This document is a self-contained guide to the Paw2Paw repository. A reader who has never opened a source file should be able to understand what the product is, how it works at runtime, and where every important file lives and why. For definitions of every platform and package (Supabase, Next.js, RLS, Zod, and the rest), see the [Tech Stack Glossary](./glossary.md).

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

**codebase-walkthrough.md** — This document.

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

# Part 5 — What's NOT in This Codebase

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

# Part 6 — How a New Engineer Would Extend This

**Adding a new topic tag** — Add the slug to `TOPIC_TAGS` in `lib/constants/topic-tags.ts`. No migration needed because tags are `text[]`, not a Postgres enum (ADR in `docs/decisions.md`). Zod `topicTagSchema` updates automatically from the const array. Copy files may need new hint text if the tag warrants explanation.

**Adding a new crisis phrase** — Add a regex to `CRISIS_PHRASE_PATTERNS` in `lib/constants/crisis-phrases.ts` with word-boundary discipline. Add unit tests when P1 test infrastructure lands. Review against false-positive risk per `docs/conversation-design.md`. No server changes; detection is client-side only.

**Adding a new RLS policy** — Write a new SQL migration in `drizzle/`, register in `meta/_journal.json` via `pnpm db:generate` or manual entry, run `pnpm db:migrate`. Update `SECURITY.md` plain-English summary. Never apply dashboard-only DDL.

**Adding a new RPC** — Migration with `SECURITY INVOKER`, `SET search_path = public`, `GRANT EXECUTE TO authenticated`. Optionally add Drizzle-agnostic wrapper in a Server Action. Map exceptions to copy in the action file. Validate inputs with Zod in `lib/validations/`.

**Adding a new route** — Create `app/[route]/page.tsx` as Server Component by default. Add Client form component if needed. Create `lib/copy/[route].ts` for strings. If the route requires auth, middleware already protects all non-public paths; add onboarding/profile checks in the page if needed. Add section to `docs/e2e-checklist.md` for manual verification.

**Adding analytics events** — Define constant in `lib/analytics/events.ts`, call `trackEvent` without content fields, document in `SECURITY.md` if it touches user data boundaries.

---

# Part 7 — Where the Project Stands

**What works today:** The verified happy path runs end-to-end in local development. A student can sign up, onboard with tags, compose a message, wait on the pending page, and have a different opted-in responder with overlapping tags claim the thread from FIFO browse. Both participants exchange messages with realtime delivery, optimistic UI, crisis interstitial gating, resource strips, message reporting, and soft conversation close. Closed and pending threads appear in inbox with correct routing. Authorization holds via RLS even if Server Actions are bypassed. Phase 2 chunks 1–5 are complete per `docs/phase-2-progress.md`.

**What's next:** P0.2 production deploy to Vercel with env vars, production migrations, and README update with live URL. P0.7 Loom walkthrough for recruiters. P1 engineering discipline: GitHub Actions running `pnpm lint` and `pnpm build`, plus focused tests. P2 polish: app shell, accessible end-conversation dialog replacing `window.confirm`, optional shadcn adoption, and minimal match notifications. Weighted matching v2 remains designed but unimplemented in `docs/matching.md`.

**What a recruiter should take away:** This is a student-built MVP demonstrating production-minded choices — database-enforced authorization, migration-driven infrastructure, honest UX about limitations, crisis safety without surveillance, and documented architectural decisions. The code is readable, convention-consistent, and intentionally scoped. Gaps (no CI, no deploy, no tests) are labeled with priority in `docs/known-issues.md`, not hidden. The repository tells a complete product story from problem statement through runtime behavior to deliberate deferrals.
