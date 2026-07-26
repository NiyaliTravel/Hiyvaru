import type { CapacitorConfig } from "@capacitor/cli";

// ---------------------------------------------------------------------------
// Hiyvaru native shell (iOS + Android).
//
// ARCHITECTURE NOTE (decided in the UI/UX plan): Hiyvaru runs a custom server
// (SSR + live Socket.IO chat), so the native app does NOT ship a static export.
// Instead the shell loads the hosted app over HTTPS. That keeps ONE codebase
// and one source of truth for every safety mechanism — a stale bundled copy of
// the crisis flow on someone's phone would be dangerous.
//
// Consequence: the app requires a network connection (correct for a live
// listening service) and `server.url` must point at production before release.
// Set CAP_SERVER_URL at build time; it must be HTTPS for release builds.
// ---------------------------------------------------------------------------

const serverUrl = process.env.CAP_SERVER_URL ?? "https://hiyvaru.mv";

const config: CapacitorConfig = {
  appId: "mv.hiyvaru.app",
  appName: "Hiyvaru",
  // Unused when server.url is set, but Capacitor requires the directory to
  // exist. `npm run cap:prepare` creates it.
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false, // never allow plain HTTP — chats must be TLS-only
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
