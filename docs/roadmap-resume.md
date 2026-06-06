# Resume roadmap

See git history and [phase-2-progress.md](./phase-2-progress.md) for current chunk progress. Full P0–P5 priority roadmap to be expanded here in P0.3.

## Pre-production checklist

- [ ] Re-enable **Confirm email** in Supabase (Auth → Providers → Email)
- [ ] Verify production signup uses Supabase email templates (confirmation link, redirect URLs)
- [ ] Set Vercel env vars (pooler URLs, `SIGN_DISPLAY_ID_SECRET`, Supabase publishable key)
- [ ] Run `pnpm db:migrate` against production `DATABASE_MIGRATE_URL`
- [ ] Replace README “Live demo: coming soon” with deployed URL + Loom
