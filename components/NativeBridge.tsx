"use client";

import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Native-only enhancements, all no-ops on the web.
//
// SAFETY: nothing here is required for the crisis flow to work — the web app
// remains fully functional. These are comfort/reliability additions for the
// store builds only.
// ---------------------------------------------------------------------------

function isNative(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export default function NativeBridge() {
  useEffect(() => {
    if (!isNative()) return;
    let cleanup: Array<() => void> = [];

    (async () => {
      // Status bar tinted to the brand so the app doesn't look like a webview.
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Default });
      } catch {
        /* plugin absent — fine */
      }

      // Native push (iOS included — the reason we ship store apps at all).
      // Notification BODIES stay generic; see lib/push.ts. A locked phone
      // screen must never reveal chat content or who someone is talking to.
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.checkPermissions();
        let granted = perm.receive === "granted";
        if (perm.receive === "prompt") {
          granted = (await PushNotifications.requestPermissions()).receive === "granted";
        }
        if (granted) {
          await PushNotifications.register();
          const reg = await PushNotifications.addListener("registration", async (token) => {
            // Store the native token alongside web-push subscriptions.
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ nativeToken: token.value }),
            });
          });
          cleanup.push(() => void reg.remove());
        }
      } catch {
        /* plugin absent — web push still works */
      }

      // Android hardware back button: never let it drop someone out of an
      // active chat by accident — go back in history when we can.
      try {
        const { App } = await import("@capacitor/app");
        const h = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
        });
        cleanup.push(() => void h.remove());
      } catch {
        /* plugin absent */
      }
    })();

    return () => {
      cleanup.forEach((fn) => fn());
      cleanup = [];
    };
  }, []);

  return null;
}
