# MOBILE.md — shipping Hiyvaru to the App Store & Play Store

Hiyvaru runs from **one codebase** on three surfaces:

| Surface | How it runs | Status |
|---|---|---|
| Web app | Next.js (SSR + Socket.IO) | live |
| Installable PWA | service worker + manifest | live |
| iOS / Android apps | Capacitor shell around the hosted app | code ready, needs store accounts |

## Architecture: why the shell loads the hosted app

Hiyvaru uses a **custom server** (server-side rendering plus live Socket.IO
chat), so the native apps do **not** bundle a static export. `capacitor.config.ts`
points `server.url` at the hosted site over HTTPS.

This is deliberate and safety-driven: there is exactly **one** copy of the
crisis-escalation flow, the age gate, and the message gate. A stale bundled
copy sitting on someone's phone for months could show an outdated crisis card
or miss a lexicon update — unacceptable for this product. The trade-off is
that the app needs a connection, which is correct for a live listening service.

## One-time setup (per machine)

```bash
npm install
npx cap add ios      # macOS + Xcode required
npx cap add android  # Android Studio required
```

`ios/` and `android/` are generated native projects. They are gitignored by
default in this repo — regenerate them with the commands above, or commit them
if you prefer to version native tweaks.

## Building

```bash
CAP_SERVER_URL=https://hiyvaru.mv npx cap sync
npx cap open ios       # then Product > Archive in Xcode
npx cap open android   # then Build > Generate Signed Bundle in Android Studio
```

`CAP_SERVER_URL` **must be HTTPS** for release builds — cleartext is disabled
in the config so chats can never travel unencrypted.

## What the native shell adds

- **Real push on iOS** (the main reason to ship store apps at all — iOS web
  push is unreliable). Bodies stay generic; a lock screen never shows chat
  content or who someone talked to.
- **Android back button** handling so it can't accidentally drop someone out
  of a live chat.
- **Status bar** tinted to the brand.
- Native **camera** for listener ID capture (the `<input capture>` already in
  the apply form uses it automatically inside the shell).

All of this is in `components/NativeBridge.tsx` and **no-ops on the web**.

## Before you can submit — accounts (Mohamed)

- **Apple Developer Program** — $99/year. Needed for TestFlight and the App
  Store. Register to NeoTranscend or personally (decide before enrolling; it
  is painful to move later).
- **Google Play Console** — $25 one-time.
- A **macOS machine with Xcode** is required to build and submit the iOS app.
  There is no way around this; a cloud Mac service works if you don't have one.

## Push credentials (needed for native push to actually fire)

Native tokens are already captured and stored, but delivery needs:
- **Android:** a Firebase project → `google-services.json` into `android/app/`.
- **iOS:** an APNs key (.p8) from the Apple Developer portal, uploaded to
  Firebase, plus `GoogleService-Info.plist` into `ios/App/App/`.
- Then wire an FCM send in `lib/push.ts` where native subscriptions are
  currently skipped (marked with a comment).

## Store listing content

Both stores will ask for these. Draft copy:

**Name:** Hiyvaru
**Subtitle:** Someone to talk to
**Description:**
> Hiyvaru connects you with a trained volunteer listener for a private,
> anonymous conversation — in Dhivehi or English, whenever you need it.
>
> You stay anonymous. We give you a random name, your number is never shown to
> anyone, and you can permanently delete any conversation.
>
> Our listeners are trained volunteers who listen. They are not counsellors or
> therapists and do not give advice. In an emergency call 119 (Police) or 1677
> (National Mental Health Helpline).

**Category:** Health & Fitness (both stores)
**Age rating:** 17+ / Mature — the app is 16+ by policy and covers mental
health topics. Declare "Infrequent/Mild Mature or Suggestive Themes".
**Privacy policy URL:** https://hiyvaru.mv/en/privacy (required by both stores)
**Support URL / email:** required — set one up before submitting.

### Review notes to include (avoids rejection)

> Hiyvaru is a peer-listening service, not a medical or counselling service.
> Listeners are trained volunteers, explicitly not therapists, and the app
> states this throughout. Accounts require age 16+. A crisis protocol surfaces
> the Maldives' emergency numbers (Police 119, Mental Health Helpline 1677)
> and alerts a duty moderator.
>
> Test account: use the phone number provided in App Store Connect notes; the
> one-time code will be sent by SMS. (Set up a reviewer test account before
> submitting — reviewers cannot pass an SMS gate otherwise.)

**IMPORTANT:** create a reviewer test account with a phone number you control,
or both stores will reject the app for being untestable behind OTP.

## Assets still needed

- App icon 1024×1024 (currently a placeholder teal square in `public/`).
- iOS screenshots: 6.7" and 5.5" required. Android: phone + 7" tablet.
- Feature graphic 1024×500 (Play Store).

A designer pass on the icon and screenshots is worth it before launch — see
NEEDS_MOHAMED.md.
