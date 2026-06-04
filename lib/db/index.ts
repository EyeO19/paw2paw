import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function getConnectionString(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (/db\.[a-z0-9]+\.supabase\.co/i.test(url)) {
    throw new Error(
      "DATABASE_URL must use the Supabase pooler (*.pooler.supabase.com:6543), not db.*.supabase.co",
    );
  }
  return url;
}

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

function getClient() {
  if (!globalForDb.client) {
    globalForDb.client = postgres(getConnectionString(), { prepare: false });
  }
  return globalForDb.client;
}

export const db = drizzle(getClient(), { schema });
export type Database = typeof db;
