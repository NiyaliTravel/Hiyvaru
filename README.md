# Hiyvaru — ހިޔްވަރު

**Someone to talk to.** An anonymous peer-listening platform for the Maldives.
Members (16+) are matched with trained, ID-verified volunteer **listeners**
for private text chats in English or Dhivehi. No advice, no therapy claims —
just trained human listening, with a crisis-escalation protocol wired to the
Maldives' real helplines (Police **119**, Mental Health Helpline **1677**).

This is a community project. Contributions are welcome — read
[CONTRIBUTING.md](CONTRIBUTING.md) and **especially [SAFETY.md](SAFETY.md)**
first: this is a safety-critical product and every safety mechanism is
documented and tested there.

## Why

One in five Maldivians suffers from depression; the country has ~14
psychiatrists and the public mental-health waitlist runs to four digits.
There is a whole tier of need — "I just need someone to listen" — that no
service covers. Hiyvaru sits in that gap.

## What's built

- **Anonymous members** — auto-generated names (e.g. `BlueCoral42`), phone
  stored only as an irreversible hash, birth *year* only, hard 16+ age gate
  (under-16s are routed to helplines 1484/1677).
- **Verified listeners** — ID + selfie reviewed side-by-side by an admin
  (images encrypted, purged after decision), 5-module training with 100%
  quizzes, 10-chat probation with mentor review.
- **Real-time chat** — Socket.IO, AES-256-GCM encryption at rest with
  per-conversation keys, member-initiated **hard delete** (destroys messages
  *and* the key).
- **Safety layer** — crisis escalation (member sees tap-to-call 119/1677,
  duty moderator gets SMS), dv+en risk-keyword flagging, explicit-content and
  contact-info messages blocked before delivery, panic button with decoy
  page, report/block, full audit log.
- **Moderator & admin dashboards**, Listener Lounge (debrief space), PWA with
  web push, rate limiting, i18n (English default, Dhivehi/Thaana RTL).

## Stack

Next.js 15 (App Router, TS) · custom Node server with Socket.IO · PostgreSQL
+ Drizzle ORM · BullMQ + Redis · Twilio (mock mode built in) · next-intl.

## Run it locally (no Docker needed)

```bash
npm install
cp .env.example .env   # fill the three *_KEY/SECRET values (any random hex)
npm run seed           # admin, moderator, one verified listener, one member
npm run dev            # http://localhost:3000
```

With no `DATABASE_URL`/`REDIS_URL` the app runs on embedded PGlite and an
in-process queue — full functionality, zero infrastructure. With Docker:
`docker compose up`. SMS is mocked to `.data/outbox.jsonl` (OTP codes appear
there) until Twilio credentials are set.

Seeded dev logins (OTP arrives in the outbox file): admin `+9607000001`,
moderator `+9607000002`, listener `+9607000010`, member `+9607000020`.

## Tests & drills

```bash
npm test               # 27 tests — every safety rule has one
npm run demo           # full journey: signup→match→chat→escalate→delete
npm run drill:crisis   # crisis-protocol drill (server must be running)
```

## Status

MVP complete (phases A–D of the build plan), pre-pilot. Open items before
launch: native-speaker review of Dhivehi strings, psychologist review of the
risk lexicon, legal review of terms/privacy, Twilio + hosting.

## License & conduct

Community CSR project — no ads, no data sales, ever. Be kind; this codebase
exists so people in a hard moment have somewhere to turn.
