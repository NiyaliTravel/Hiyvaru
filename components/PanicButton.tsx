"use client";

import { useEffect } from "react";

// SAFETY — panic/quick-exit (spec §3.1). location.replace means the Hiyvaru
// page does NOT stay in history; the back button will not return here.
// /notes is a deliberately boring page with no Hiyvaru branding.
// Pressing Escape three times quickly also triggers it.
export default function PanicButton({ label }: { label: string }) {
  useEffect(() => {
    let presses: number[] = [];
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const now = Date.now();
      presses = [...presses.filter((t) => now - t < 1500), now];
      if (presses.length >= 3) window.location.replace("/notes");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button
      className="btn secondary"
      style={{ padding: "8px 14px" }}
      onClick={() => window.location.replace("/notes")}
    >
      {label}
    </button>
  );
}
