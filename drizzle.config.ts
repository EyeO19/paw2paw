import { defineConfig } from "drizzle-kit";

function getMigrateUrl(): string {
  const url = (process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL)?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_MIGRATE_URL is not set (use Supabase Session pooler on port 5432, not Direct/IPv6)",
    );
  }

  if (/db\.[a-z0-9]+\.supabase\.co/i.test(url)) {
    throw new Error(
      "DATABASE_MIGRATE_URL must use the Supabase pooler host (*.pooler.supabase.com), not db.*.supabase.co (direct is often IPv6-only and fails on many networks). Copy Session mode URI from Supabase → Connect → Database.",
    );
  }

  return url;
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getMigrateUrl(),
  },
});