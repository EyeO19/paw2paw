import { defineConfig } from "drizzle-kit";

function getMigrateUrl(): string {
  const url = process.env.DATABASE_MIGRATE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_MIGRATE_URL is not set (use Supabase Session pooler on port 5432, not Direct/IPv6)",
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