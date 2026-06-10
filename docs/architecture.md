# Architecture

Package and platform definitions: [codebase-full-index-glossary.md — Part 5](./codebase-full-index-glossary.md#part-5--tech-stack-glossary).

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

Terms in the diagram — [Next.js](codebase-full-index-glossary.md#nextjs), [React](codebase-full-index-glossary.md#react), [@supabase/supabase-js](codebase-full-index-glossary.md#supabasesupabase-js), [Supabase](codebase-full-index-glossary.md#supabase), [PostgreSQL](codebase-full-index-glossary.md#postgresql), [Row-Level Security (RLS)](codebase-full-index-glossary.md#row-level-security-rls), and Supabase Realtime (see [Realtime](codebase-full-index-glossary.md#realtime)) — are defined in [Part 5 of the codebase full index / glossary](codebase-full-index-glossary.md#part-5--tech-stack-glossary).

## Trust boundaries

**Client → server.** The browser holds only the publishable anon key and the user’s session cookie. [Client Components](codebase-full-index-glossary.md#nextjs) may call Server Actions or the browser [Supabase](codebase-full-index-glossary.md#supabase) client ([@supabase/supabase-js](codebase-full-index-glossary.md#supabasesupabase-js)); they never receive `SIGN_DISPLAY_ID_SECRET`, service-role keys, or direct Postgres URLs. Middleware refreshes the session and redirects unauthenticated or onboarding-incomplete users before protected routes render.

**Server → database (RLS enforced).** Every query and RPC runs as the authenticated user (`auth.uid()`), not as a privileged application role. Authorization is enforced in [PostgreSQL](codebase-full-index-glossary.md#postgresql) policies and `SECURITY INVOKER` functions — [Row-Level Security (RLS)](codebase-full-index-glossary.md#row-level-security-rls) is the source of truth; the [Next.js](codebase-full-index-glossary.md#nextjs) layer validates input ([Zod](codebase-full-index-glossary.md#zod)) and maps errors, but does not decide who can read a thread or flag a message. A leaked anon key still cannot bypass RLS without a valid user JWT.

**Database → realtime broadcast.** The `messages` table is on the `supabase_realtime` publication (migration `0009`). Inserts that pass RLS are broadcast to subscribed clients on `conversation:{threadId}`. Subscribers still only receive rows their JWT could have selected; Supabase Realtime (see [Realtime](codebase-full-index-glossary.md#realtime)) does not widen access beyond existing SELECT policies.
