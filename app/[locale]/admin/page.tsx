"use client";

// Admin dashboard — listener verification (side-by-side ID review) + stats.
// Staff tooling, English-only by design.
import { useEffect, useState } from "react";

type Application = {
  userId: string;
  displayName: string;
  docType: string | null;
  docExpiry: string | null;
  bio: string | null;
  createdAt: string;
  trainingCompletedAt: string | null;
};
type Images = Array<{ kind: string; mimeType: string; dataBase64: string }>;

export default function AdminDashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [reviewing, setReviewing] = useState<Application | null>(null);
  const [images, setImages] = useState<Images>([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const d = await fetch("/api/admin/applications").then((r) => r.json());
    setApps(d.applications ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function openReview(app: Application) {
    setReviewing(app);
    setImages([]);
    const d = await fetch(`/api/admin/applications?userId=${app.userId}`).then((r) => r.json());
    setImages(d.images ?? []);
  }

  async function decide(approve: boolean) {
    if (!reviewing) return;
    const res = await fetch("/api/admin/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: reviewing.userId, approve, note }),
    });
    const d = await res.json();
    setMessage(
      `${approve ? "Approved" : "Rejected"} — ${d.purgedDocs} ID image(s) permanently purged.`,
    );
    setReviewing(null);
    setImages([]);
    setNote("");
    load();
  }

  return (
    <main className="container" style={{ maxWidth: 860 }}>
      <h1>Admin — listener verification</h1>
      {message && <div className="card" style={{ background: "#f0fdf4" }}>{message}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Pending applications</h3>
        {apps.length === 0 && <p className="hint">No pending applications with uploaded documents.</p>}
        {apps.map((a) => (
          <div key={a.userId} style={{ borderTop: "1px solid #eee", paddingBlock: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div>
              <strong dir="ltr">{a.displayName}</strong>{" "}
              <span className="hint">
                {a.docType} · expires {a.docExpiry} · training{" "}
                {a.trainingCompletedAt ? "complete ✓" : "not complete"}
              </span>
              {a.bio && <p className="hint" style={{ margin: "2px 0 0" }}>{a.bio}</p>}
            </div>
            <button className="btn" onClick={() => openReview(a)}>
              Review ID
            </button>
          </div>
        ))}
      </div>

      {reviewing && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            Side-by-side review — <span dir="ltr">{reviewing.displayName}</span>
          </h3>
          <p className="hint">
            Compare the ID photo with the selfie. Images decrypt only for this view and are
            permanently purged when you decide (either way).
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {images.map((img) => (
              <figure key={img.kind} style={{ margin: 0 }}>
                <figcaption className="hint">{img.kind === "id_front" ? "ID document" : "Selfie"}</figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={img.kind}
                  src={`data:${img.mimeType};base64,${img.dataBase64}`}
                  style={{ maxWidth: 360, maxHeight: 320, borderRadius: 8, border: "1px solid #ddd" }}
                />
              </figure>
            ))}
            {images.length === 0 && <p className="hint">Decrypting…</p>}
          </div>
          <label>Note (kept in audit log)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={() => decide(true)}>
              Approve — activate listener
            </button>
            <button className="btn danger" onClick={() => decide(false)}>
              Reject
            </button>
            <button className="btn secondary" onClick={() => setReviewing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
