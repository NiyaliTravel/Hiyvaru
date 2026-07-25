"use client";

import { useEffect } from "react";

// Registers the service worker; if VAPID is configured and the user is logged
// in, silently subscribes to web push (match + crisis alerts, generic bodies).
export default function PwaSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid || !("PushManager" in window)) return;
      const me = await fetch("/api/me");
      if (!me.ok) return;
      if (Notification.permission === "denied") return;
      try {
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapid,
          }));
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
      } catch {
        // user declined or unsupported — fine, sockets still work
      }
    });
  }, []);
  return null;
}
