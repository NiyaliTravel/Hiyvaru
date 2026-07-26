# NEEDS_MOHAMED — decisions & inputs only you can give

## Decisions I made that you should ratify (spec didn't fully cover)
1. **No Docker on this workstation** (ARM64 Windows, no WSL). I kept the fixed
   stack (Postgres/Redis/Docker Compose are all in the repo for real
   deployments) and added a dev/test fallback: embedded PGlite (real Postgres
   in-process) + in-process queue when `DATABASE_URL`/`REDIS_URL` are empty.
   Exit tests run against PGlite locally. Install Docker Desktop (or deploy to
   a VPS) to run the real stack — nothing in the code changes.
2. **Auth library:** spec said "Lucia or Auth.js". Lucia was deprecated by its
   author in 2025; its recommended replacement is exactly the hand-rolled
   session pattern I implemented in `lib/auth/session.ts` (hashed tokens,
   httpOnly cookie). Boring, auditable, no third-party identity leakage.
3. **Signup asks full DOB in a date field** then stores year only (per spec).
   The age check runs before the OTP send, so under-16s never receive a code.
4. **Default locale is `en`** (your call, 2026-07-24: most Maldivians read
   English comfortably); `/` redirects to `/en`. Dhivehi (Thaana RTL) stays
   fully built and one tap away in the language switcher, and members can
   still request Dhivehi-language chats.

5. **ID documents live encrypted in Postgres**, not a separate S3 bucket
   (spec §6 suggested S3). At MVP scale rows are simpler, and they exist only
   between application and decision (purged after). Move to S3 if volume grows.
6. **Staff dashboards (moderator/admin) are English-only** — staff tooling;
   member/listener surfaces are fully bilingual.
7. **Escalate button is available to both participants** (listener button per
   spec, plus a member-triggered path counts as `member_button`).

## Police referral — arrangement needed
- [ ] **Agree a coordination channel with the Maldives Police Service** and put
      its number in `POLICE_ALERT_PHONE`. Right now it's a placeholder
      (332 2111). An automated platform→police life-safety referral should go
      to an agreed contact, not the public 119 line — this is part of the
      pre-launch "courtesy meeting with Police" already on the checklist.
- [ ] Decide retention: how long the `escalations` record + a member's
      encrypted phone are kept after an incident (lawyer input).
- Note: police referral now fires on the listener's Escalate tap
  (human-confirmed model you chose 2026-07-25). Contact stored recoverably;
  privacy policy + terms updated to disclose the exception.

## Mobile app store (U5) — blocked on you
- [ ] **Apple Developer Program** ($99/yr) — decide NeoTranscend vs personal
      before enrolling; moving it later is painful.
- [ ] **Google Play Console** ($25 one-time).
- [ ] **A macOS machine with Xcode** to build/submit iOS (no way around it;
      a cloud Mac service works).
- [ ] **Reviewer test account** — both stores will reject the app if reviewers
      can't get past the SMS one-time code. Give me a phone number you control
      and I'll document it in the review notes.
- [ ] **Firebase project** (Android `google-services.json` + iOS APNs .p8) so
      native push actually delivers. Tokens are already captured and stored.
- [ ] **App icon 1024×1024 + screenshots** — currently placeholder art.
See `MOBILE.md` for the full build and submission runbook.

## Inputs needed from you
- [ ] **Native Dhivehi review of every string in `messages/dv.json`.** I wrote
      real Thaana but it must be reviewed by a native speaker before pilot.
- [ ] **Psychologist review of the Dhivehi risk lexicon**
      (`lib/safety/lexicons.ts`, editable in the `config` table) — spec §D
      explicitly calls for this before pilot.
- [ ] Review the listener training content (`lib/training/content.ts`) — it
      encodes the crisis script and no-advice rule; word it your way.
- [ ] Twilio credentials in `.env` when you want real SMS.
- [ ] §1 spec note (research doc §5 flag): when moderators call police vs.
      only urging the member to call — policy wording is yours to finalise.
- [ ] Lawyer review of terms/privacy before pilot (Phase D placeholders).
