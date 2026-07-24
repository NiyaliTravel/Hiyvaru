import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

// One DB entry point for the whole app.
// - DATABASE_URL set  -> real Postgres (production / docker compose)
// - DATABASE_URL empty -> embedded PGlite (local dev on machines w/o Docker)
// - NODE_ENV=test      -> in-memory PGlite (each test run starts clean)
// The Drizzle schema is identical in all three modes.

export type Db = ReturnType<typeof drizzlePg<typeof schema>>;

// The custom server (server.ts) and Next's compiled route bundles are separate
// module graphs in the same process. The singleton MUST live on globalThis so
// both share ONE connection — two PGlite instances on one data dir would not
// see each other's writes.
const g = globalThis as unknown as { __hiyvaruDb?: Db; __hiyvaruMigrated?: Promise<void> };

export function getDb(): Db {
  if (g.__hiyvaruDb) return g.__hiyvaruDb;
  let _db: Db;
  const url = process.env.DATABASE_URL;
  if (url && url.length > 0) {
    _db = drizzlePg(url, { schema });
  } else {
    const dataDir =
      process.env.NODE_ENV === "test"
        ? "memory://"
        : process.env.PGLITE_DIR ?? "./.data/pglite";
    // PGlite's drizzle instance is API-compatible for everything we use.
    _db = drizzlePglite(dataDir, { schema }) as unknown as Db;
  }
  g.__hiyvaruDb = _db;
  return _db;
}

/**
 * Apply SQL migrations from ./drizzle exactly once per process.
 * Called from instrumentation.ts (server boot), the socket server, and tests.
 */
export function ensureMigrated(): Promise<void> {
  if (g.__hiyvaruMigrated) return g.__hiyvaruMigrated;
  g.__hiyvaruMigrated = (async () => {
    const db = getDb();
    const folder = { migrationsFolder: "./drizzle" };
    if (process.env.DATABASE_URL) {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(db as never, folder);
    } else {
      const { migrate } = await import("drizzle-orm/pglite/migrator");
      await migrate(db as never, folder);
    }
  })();
  return g.__hiyvaruMigrated;
}

/** Test helper: reset the singleton so each test file gets a fresh in-memory DB. */
export function __resetDbForTests(): void {
  g.__hiyvaruDb = undefined;
  g.__hiyvaruMigrated = undefined;
}

export { schema };
