# Contributing to Hiyvaru

Thank you — this is a community project and help is genuinely wanted:
code, Dhivehi translation, listener-training content, design, and (from
professionals) review of the risk lexicon and crisis protocol.

## The one rule that outranks everything

Hiyvaru is a safety-critical, mental-health-adjacent product. **Read
[SAFETY.md](SAFETY.md) before changing anything.** Every mechanism there is
non-negotiable:

1. 16+ only, enforced server-side; only birth year is ever stored.
2. Listeners take chats only after admin ID verification + 100% training.
3. Crisis escalation must surface Police 119 + Helpline 1677 and alert a
   moderator. Risk-of-harm disclosures are NEVER blocked or delayed.
4. Member anonymity is absolute: no plaintext phone numbers, no photos, no
   contact-info exchange, hard delete really deletes.
5. Listeners are "listeners" — never counsellors/therapists/advisors, in any
   language, anywhere in the UI (legal requirement).
6. Explicit/sexual content and contact information are blocked before
   delivery.

PRs that weaken any of these will be closed regardless of code quality.

## How to contribute

1. Fork, branch from `main`, keep changes small and boring (this is a
   solo-maintainer codebase — clarity beats cleverness).
2. `npm test` must pass; safety-related changes need a test.
3. If you touch a safety path, update SAFETY.md in the same PR.
4. Dhivehi corrections: edit `messages/dv.json` — native-speaker fixes are
   some of the most valuable PRs this project can receive.
5. Risk lexicon suggestions (`lib/safety/lexicons.ts`): welcome, but final
   sign-off rests with a mental-health professional.

## What NOT to file publicly

If you find a **security or safety vulnerability** (anything that could
deanonymize a member, expose chats, or break the crisis flow), do NOT open a
public issue — contact the maintainer privately via the email on the GitHub
profile.

## Good first areas

- Dhivehi translation review (`messages/dv.json`)
- Accessibility passes on member-facing screens
- Listener-training content improvements (`lib/training/content.ts`)
- Docs, deployment guides, load testing
