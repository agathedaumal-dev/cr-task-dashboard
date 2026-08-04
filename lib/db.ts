import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env";

// db is null when DATABASE_URL is not configured.
// Always guard with `if (!db)` before using it.
export const db = env.DATABASE_URL
  ? drizzle(postgres(env.DATABASE_URL))
  : null;
