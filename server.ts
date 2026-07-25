// Custom server: Next.js + Socket.IO on one HTTP server, plus the matching
// worker. Run with `npm run dev` (tsx) or in Docker with NODE_ENV=production.
import { createServer } from "http";
import next from "next";
import { attachSocket } from "./lib/socket/server";
import { startMatchWorker } from "./lib/queue";
import { ensureMigrated } from "./lib/db";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);

async function main() {
  // Sentry hook — enabled only when SENTRY_DSN is set (solo-maintainer
  // friendly: zero overhead otherwise). Uses @sentry/node if installed.
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = await import("@sentry/node" as string);
      Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
      console.log("[sentry] enabled");
    } catch {
      console.warn("[sentry] SENTRY_DSN set but @sentry/node not installed — run: npm i @sentry/node");
    }
  }

  const app = next({ dev });
  await app.prepare();
  const handler = app.getRequestHandler();

  await ensureMigrated();

  const server = createServer((req, res) => handler(req, res));
  attachSocket(server);
  await startMatchWorker();

  server.listen(port, () => {
    console.log(`Hiyvaru ready on http://localhost:${port} (${dev ? "dev" : "prod"})`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
