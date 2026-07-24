# Hiyvaru — ހިޔްވަރު

Anonymous peer-listening platform for the Maldives. Members 16+ get matched
with trained, ID-verified volunteer listeners for private text chats in
Dhivehi or English. See `SAFETY.md` for every safety mechanism and how to
test it, and `NEEDS_MOHAMED.md` for open founder decisions.

## Stack
Next.js 15 (App Router, TS) · PostgreSQL + Drizzle · Socket.IO · BullMQ +
Redis · Twilio (mock mode when unset) · next-intl (dv Thaana RTL + en) ·
AES-256 at rest · Docker Compose.

## Dev without Docker
`npm run dev` — uses embedded PGlite (`.data/pglite`) and an in-process queue;
SMS goes to `.data/outbox.jsonl`. With Docker: `docker compose up`.

## Tests
`npm test` — safety-critical paths (age gate, hard delete, escalation,
listener gating) are all covered; see SAFETY.md.
