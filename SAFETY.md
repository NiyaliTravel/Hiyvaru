# SAFETY.md — every safety mechanism in Hiyvaru and how to test it

This file is the single source of truth for safety-critical behaviour.
If you touch any file referenced here, re-run the named tests.

## 1. 16+ age gate (Hard Rule 1)
- **Where:** `lib/auth/age.ts` (checkAge), `lib/auth/signup.ts` (completeSignup — the only user INSERT path), `app/api/auth/request-otp/route.ts` (gate runs before any OTP is sent).
- **Behaviour:** full DOB validated server-side, then discarded — only `birth_year` is stored. Under-16 → HTTP 403 `under_16` → client routes to `/{locale}/under-16` (helplines 1484 + 1677, tap-to-call). No OTP is sent and no row is written for a rejected attempt.
- **Test:** `tests/age.test.ts`, `tests/signup.test.ts` (`npm test`).

## 2. Anonymity (Hard Rule 4)
- **Where:** `lib/auth/crypto.ts` (hashPhone — HMAC, plaintext never stored), `lib/auth/names.ts` (auto display names), schema comments in `lib/db/schema.ts`.
- **Behaviour:** members are `AdjectiveNounNN`. Phone exists only as HMAC hash; email only for account recovery; neither is ever rendered to listeners/members. No photos or file sharing exist anywhere in the product.
- **Test:** `tests/signup.test.ts` asserts no plaintext phone on the user row.

## 3. Helplines always visible (Hard Rule 3, part 1)
- **Where:** `components/HelplineCorner.tsx`, rendered by `app/[locale]/member/layout.tsx` (wraps every member screen).
- **Test:** open any member page — 1677/119 corner with `tel:` links.

## 4. Session security
- **Where:** `lib/auth/session.ts`. Random 256-bit token in httpOnly cookie; DB stores sha256(token) only; banned/suspended users are cut off at lookup.

## 5. OTP integrity
- **Where:** `lib/auth/otp.ts`. Codes hashed (sha256) at rest, 10-min TTL, 5 attempts max, 60s resend cooldown.

## 6. No-therapy language (Hard Rule 5)
- **Where:** `messages/en.json` / `messages/dv.json` — `common.listenerNote` and all copy say "listeners", never counsellor/therapist/advisor. Keep it that way in every new string.

## 7. Message encryption at rest (Phase B)
- **Where:** `lib/chat/encryption.ts`, used by `lib/chat/service.ts`.
- **Behaviour:** AES-256-GCM; per-conversation random key, stored only wrapped
  by `MESSAGE_MASTER_KEY`. Plaintext never touches the DB.
- **Test:** `tests/chat.test.ts` (ciphertext-only rows, round-trip).

## 8. Member hard delete (Hard Rule 4, Phase B)
- **Where:** `lib/chat/service.ts` hardDeleteConversation, route
  `app/api/chat/[id]/delete`.
- **Behaviour:** member-only. Deletes all message rows + keyword flags AND
  destroys the wrapped conversation key, so stray ciphertext is undecryptable.
- **Test:** `tests/chat.test.ts` + live drill `scripts/e2e-chat.ts`.

## 9. Listener matching gate (Hard Rule 2, enforced early in Phase B)
- **Where:** `lib/chat/matching.ts` findEligibleListener.
- **Behaviour:** only `verified_at IS NOT NULL` + `training_completed_at IS
  NOT NULL` + level ≠ applicant listeners are ever matchable, regardless of
  availability. Concurrency caps: probation 1, full/mentor 2.
- **Test:** `tests/chat.test.ts` ("matching only ever selects verified…").

## 10. Panic / quick exit (Phase B)
- **Where:** `components/PanicButton.tsx`, decoy page `app/notes/page.tsx`.
- **Behaviour:** button or 3×Escape → `location.replace("/notes")` (unbranded
  notes page, no history entry back to Hiyvaru).
- **Test:** manual — click Quick exit in a chat; back button must not return.

## 11. Report & block (Phase B)
- **Where:** `app/api/report/route.ts`, `components/ReportButton.tsx`;
  never-again prefs in `app/api/chat/[id]/rate`.

## 12. Crisis escalation (Hard Rule 3, Phase C)
- **Where:** `lib/safety/escalate.ts`, route `app/api/chat/[id]/escalate`,
  UI `components/EscalateButton.tsx` + crisis card in `components/ChatWindow.tsx`.
- **Behaviour:** member instantly sees the calm full-width card (tap-to-call
  119 / 1677 / 332 2111; chat stays open); listener sees the crisis script;
  conversation unlocks for moderators; duty moderators get socket ping + SMS
  (Twilio or mock outbox); escalations + audit_log rows written.
- **Test:** `tests/safety.test.ts` + live drill `scripts/e2e-crisis.ts`.

## 13. Risk keyword flagging (Phase C)
- **Where:** `lib/safety/lexicons.ts` (editable via `config` table),
  `lib/safety/scan.ts`, wired in `lib/socket/server.ts` after delivery.
- **Behaviour:** dv+en lexicons; match → message flagged + keyword_flags row +
  soft banner to listener + audit entry. Never blocks or auto-calls anyone —
  a human decides. Dhivehi list needs psychologist review before pilot.

## 14. Grooming defences (Hard Rule 6, Phase C)
- **Where:** contact regexes in `lib/safety/scan.ts`; warning banner to both
  parties via `conv:contact-warning`; no photo/file sharing exists anywhere;
  off-platform solicitation = instant-ban offence (training module
  `boundaries` documents it; moderators enforce via user-action API).

## 15. Listener ID verification & purge (Hard Rule 2, Phase C)
- **Where:** `lib/listener/application.ts`, admin routes
  `app/api/admin/applications`, UI `app/[locale]/admin/page.tsx`.
- **Behaviour:** ID + selfie stored AES-256-GCM encrypted (separate master
  key), decryptable only by admin for side-by-side review; hard-purged the
  moment a decision is made (approve or reject); only verified ✓/doc type/
  expiry retained. Approval sets role=listener, level=probation.
- **Test:** `tests/safety.test.ts` (purge + activation assertions).

## 16. Training gate & probation (Phase C)
- **Where:** `lib/training/*`, probation logic in `lib/chat/service.ts`
  endConversation.
- **Behaviour:** 5 modules, quiz pass = 100% only; training_completed_at set
  only when all pass (matcher requires it). Probation: first 10 chats audited
  for mentor review, then auto-promote to full.
- **Test:** `tests/safety.test.ts`.

## 17. Moderator access control (Phase C)
- **Where:** `app/api/moderator/*`.
- **Behaviour:** chat content visible only when moderator_unlocked (crisis or
  report review); every transcript view is audited; suspend/ban kills the
  target's sessions immediately; admins cannot be actioned.

## 18. Rate limits & new-account throttles (Phase D)
- **Where:** `lib/ratelimit.ts`; applied in request-otp (10/IP/hr), chat
  request (20/member/hr + 5/day for accounts younger than 24h), report
  (10/hr), apply (3/day).
- **Note:** in-memory store (single-process deploy). Move to Redis if the app
  ever runs multi-instance.

## 19. Listener care (Phase D)
- **Where:** Listener Lounge (`app/api/lounge`, listener/mentor/moderator
  only), debrief nudge after escalated chats in the listener dashboard,
  daily-cap column on profiles.

## 20. Push notification privacy (Phase D)
- **Where:** `lib/push.ts`, `public/sw.js`.
- **Behaviour:** notification bodies are always generic ("Someone would like
  to talk") — chat content and names never appear on lock screens. The
  service worker never caches /api or /socket.io responses.

## How to run everything
```bash
npm test          # all safety tests
npm run dev       # local dev (PGlite + mock SMS — no Docker needed)
docker compose up # full stack with real Postgres/Redis
```
Mock SMS outbox: `.data/outbox.jsonl`.
