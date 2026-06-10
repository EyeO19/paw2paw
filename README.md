# Paw2Paw

**Status:** MVP in dev — production deploy in progress.

Paw2Paw is an anonymous peer-support messaging platform for Princeton students. Marginalized students and communities — first-gen, neurodivergent, students of color, student-athletes, LGBTQ+, international, diabetic, disabled — get less mental health support at elite institutions because everyone assumes they have enough help. Paw2Paw works to pair students for one-to-one conversations with crisis resources always one tap away.

**Live demo:** coming soon — URL and Loom walkthrough will be added after deploy.

## Documentation

- Full walkthrough: [docs/codebase-walkthrough.md](docs/codebase-walkthrough.md) (includes Tech Stack Glossary as Part 8)
- Glossary shortcut: [docs/glossary.md](docs/glossary.md)

## Architecture

```mermaid
flowchart TB
  subgraph browser["Browser"]
    CC["Client Components<br/>conversation-view, compose-form,<br/>crisis-interstitial, realtime subscribe"]
    BC["createBrowserClient()<br/>lib/supabase/client.ts<br/>anon key + session in memory"]
    CC --> BC
  end

  subgraph edge["Next.js edge"]
    MW["middleware.ts<br/>session refresh + auth gating"]
  end

  subgraph server["Next.js server"]
    SC["Server Components<br/>page.tsx, inbox, respond"]
    SA["Server Actions<br/>auth, thread, conversation, respond"]
    SSC["createServerClient()<br/>lib/supabase/server.ts<br/>anon key + auth cookies"]
    SC --> SSC
    SA --> SSC
  end

  subgraph supabase["Supabase"]
    AUTH["Supabase Auth<br/>JWT in cookie"]
    API["PostgREST / Supabase client<br/>SELECT · INSERT · UPDATE · RPC"]
    RLS["Row-Level Security<br/>policies on users · threads · messages"]
    PG["PostgreSQL"]
    RT["Realtime publication<br/>supabase_realtime · messages"]
    RPC["SECURITY INVOKER RPCs<br/>create_thread_with_message<br/>claim_thread_for_responder<br/>send_message · close_thread"]
    AUTH --> API
    API --> RLS
    RLS --> PG
    RPC --> RLS
    PG --> RT
  end

  browser -->|"HTTP / Server Actions"| MW
  MW --> server
  BC -->|"REST · Realtime WebSocket<br/>(matched threads)"| API
  BC --> RT
  SSC -->|"cookie-bound JWT"| AUTH
  SSC --> API
  RT -->|"INSERT events"| CC
```

Trust boundaries and interview notes: [docs/architecture.md](docs/architecture.md).

## Tech stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js (App Router) | 16.2.7 |
| Language | TypeScript (strict) | ^5 |
| UI | Tailwind CSS | ^4 |
| Auth + DB + Realtime | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) | ^0.10.3 / ^2.107.0 |
| ORM / migrations | Drizzle ORM + Drizzle Kit | ^0.45.2 / ^0.31.10 |
| Validation | Zod | ^4.4.3 |
| Runtime | React | 19.2.4 |
| Deploy target | Vercel | — |

## Local setup

1. Clone the repo and `cd paw2paw`
2. `pnpm install`
3. `cp .env.local.example .env.local` — fill in Supabase project URL (base URL, **no** `/rest/v1/`), publishable key, pooler URLs, and `SIGN_DISPLAY_ID_SECRET`
4. `pnpm db:migrate`
5. `pnpm dev` → [http://localhost:3000](http://localhost:3000)

For local E2E testing, disable **Confirm email** in Supabase (Auth → Providers → Email). Re-enable before production deploy and verify confirmation email templates.

## Project structure

```
app/           # Routes, Server Components, Client Components, Server Actions
lib/           # Supabase clients, auth, copy, validations, crisis, db schema
docs/          # Architecture, security, decisions, E2E checklist, roadmap
drizzle/       # SQL migrations (RLS, RPCs, realtime) — schema source of truth
```

## Roadmap

Resume and shipping priorities: [docs/roadmap-resume.md](docs/roadmap-resume.md).

## Security

Threat model, RLS summary, and responsible disclosure: [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
