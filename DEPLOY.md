# DEPLOY.md — hosting Hiyvaru

## Recommended architecture

| Piece | Where | Why |
|---|---|---|
| App (Next.js + Socket.IO) | **DigitalOcean droplet**, 2GB, Docker | You already run droplets; one long-lived Node process is all it needs |
| PostgreSQL | **DO Managed Database** | Automated daily backups + point-in-time recovery. Holds encrypted chats, ID-verification records, the audit log — losing or leaking this is catastrophic, and a solo maintainer should not be hand-rolling backups |
| Redis | **On the droplet** (Docker) | Only a job queue (matching, alerts). Losing it loses nothing permanent — not worth a managed instance |
| Domain / DNS | **Hostinger** (registrar), A record → droplet IP | No migration needed; just point an A record |
| TLS | **Caddy** on the droplet | Automatic Let's Encrypt certificates, zero config |

**Region: Frankfurt (or Amsterdam).** The spec is explicit that data must live
outside local reach — "in a small society a breach isn't embarrassing, it's
life-ruining" — and the privacy page says so publicly. The EU also has the
strongest data-protection regime, which is the better story to tell members and
grant funders. Latency to Malé is ~150ms; for text chat that is imperceptible.

**Use a dedicated droplet.** Do not put Hiyvaru on a box that also runs Neo
Brain or business projects — a mental-health platform should not share a blast
radius, credentials, or noisy neighbours with anything else.

### Cost

Roughly **$27–45/month**: droplet $12–24 + managed Postgres $15. That sits
inside the $30–60 estimate in the spec.

If you want to start cheaper, run Postgres in Docker on the same droplet
(everything is already in `docker-compose.yml`) for ~$12–24/month total — but
then **you** own backups. If you go that route, set up an automated `pg_dump`
to DO Spaces on day one, and test a restore. An untested backup is not a backup.

## First deploy

```bash
# on a fresh Ubuntu droplet
apt update && apt install -y docker.io docker-compose-plugin git
git clone https://github.com/NiyaliTravel/Hiyvaru.git
cd Hiyvaru
cp .env.example .env
```

Fill `.env` — generate each key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

You need `MESSAGE_MASTER_KEY`, `ID_DOC_MASTER_KEY`, `CONTACT_MASTER_KEY`,
`PHONE_HASH_SECRET`, plus `DATABASE_URL` (managed DB connection string),
`REDIS_URL`, Twilio credentials, `POLICE_ALERT_PHONE`, and
`DUTY_MODERATOR_PHONES`.

```bash
docker compose up -d
```

Then point Hostinger DNS: A record `@` and `www` → droplet IP.

### TLS with Caddy

```
hiyvaru.mv {
    reverse_proxy localhost:3000
}
```

Caddy fetches and renews certificates automatically. **Websockets work through
`reverse_proxy` with no extra config** — important, because Socket.IO carries
every chat.

## Before going live

- [ ] `NODE_ENV=production` (session cookies become `Secure`)
- [ ] Verify TLS: `https://hiyvaru.mv` — Socket.IO must connect over `wss://`
- [ ] Run `npm run seed` once, then **change or remove the seeded staff
      accounts** — the seeded phone numbers are public in this repo
- [ ] Confirm a backup exists and **restore it once** to prove it works
- [ ] Set `SENTRY_DSN` for error alerts
- [ ] Uptime monitor (DO has one free) pointed at `/` — if Hiyvaru is down,
      someone in crisis meets a blank page
- [ ] Firewall: allow only 80/443 and your SSH key; Postgres and Redis must
      never be publicly reachable

## Key rotation warnings

- Rotating `MESSAGE_MASTER_KEY` makes **all existing chats undecryptable**.
- Rotating `PHONE_HASH_SECRET` **breaks every existing login**.
- Rotating `CONTACT_MASTER_KEY` makes stored emergency contacts unrecoverable —
  which would silently break the police referral.

Back these up somewhere safe and offline before you ever change them.
