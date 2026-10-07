import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

function createDb() {
  return drizzle({ client: neon(requireEnv("DATABASE_URL")), schema });
}

let db: ReturnType<typeof createDb> | undefined;

// Created on first use so a missing DATABASE_URL fails at request time with a
// clear message instead of breaking `next build`.
export function getDb() {
  db ??= createDb();
  return db;
}
