# TESTING.md — how to try Hiyvaru locally

## Start it

```bash
npm run seed   # first time only (creates admin, moderator, 3 listeners, 1 member)
npm run dev    # http://localhost:3000
```

Everything runs with **no Docker, no Postgres, no Twilio** — embedded PGlite,
in-process queue, and mocked SMS.

## Logging in (important)

Hiyvaru has no passwords. You log in with a phone number and a **6-digit code
sent by SMS** — and in local dev that "SMS" is written to a file:

```bash
tail -5 .data/outbox.jsonl
```

The last line for your number contains the code. Two rules that trip people up:
- codes are **single-use** — logging in consumes it, request a new one next time
- there's a **60-second cooldown** between code requests for the same number

## Test accounts

| Role | Phone | Sees |
|---|---|---|
| Member | `+9607000020` | Home, Talk, Calm, You |
| Listener | `+9607000010` | Dashboard, growth, lounge |
| Listener | `+9607000011` | (Dhivehi, family/work topics) |
| Listener | `+9607000012` | (English, loneliness/grief topics) |
| Moderator | `+9607000002` | Crisis alerts, reports, transcripts |
| Admin | `+9607000001` | Listener ID verification |

## A 5-minute tour

1. **Landing** — `/` shows the two front doors and live listener counts.
2. **Sign up as a new member** — try DOB **2012** first: rejected, routed to the
   1484/1677 page, and no code is ever sent. Then use a 1990s DOB and watch the
   anonymous-name reveal.
3. **Member app** — the bottom tab bar (sidebar on a wide window):
   - **Home** — greeting, mood check-in, big Talk button, your kept listeners
   - **Talk** — instant match *or* **Browse listeners** (filter by online /
     language / topic, then pick someone specific)
   - **Calm** — 6 exercises; open **Breathe** for the animated pacer
   - **You** — anonymous identity, language switch, log out
4. **Have a real chat** — open a second browser (or a private window), log in as
   listener `+9607000010`, toggle **Available**, then hit Talk from the member
   window. Both sides are live.
5. **Crisis drill** — in the listener window press **Escalate**. The member
   instantly sees the 119 / 1677 / 332 2111 card, the chat stays open, and the
   moderator alert + police referral appear in `.data/outbox.jsonl`.
6. **Delete** — end the chat, rate it, then "Delete this conversation forever".
   It's a true hard delete.
7. **Quick exit** — press **Esc three times** in a chat: instantly swaps to a
   neutral notes page with no history entry back.

Also worth seeing: `/en/moderator` (crisis queue, transcripts), `/en/admin`
(side-by-side ID verification), `/en/listener/growth` (badges, cheers).

Switch to **Dhivehi** with the language selector anywhere — the whole UI flips
to Thaana RTL. Toggle your OS dark mode to see the night theme.

## Automated checks

```bash
npm test              # 34 tests — every safety rule
npm run demo          # scripted signup → match → chat → escalate → delete
npm run drill:crisis  # crisis protocol + police referral drill
```

The scripted runs need the server up; they print each step and fail loudly.
