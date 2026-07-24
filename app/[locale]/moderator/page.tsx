"use client";

// Staff dashboard — English-only by design (staff tooling).
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type Escalation = {
  id: string;
  conversationId: string;
  trigger: string;
  createdAt: string;
  resolvedAt: string | null;
  actionsTaken: string | null;
};
type Report = {
  id: string;
  reporterId: string;
  targetId: string;
  conversationId: string | null;
  reason: string;
  status: string;
  createdAt: string;
};
type Transcript = {
  conversation: { id: string; memberId: string; listenerId: string; escalated: boolean };
  messages: Array<{ id: string; senderId: string; text: string; createdAt: string }>;
};

export default function ModeratorDashboard() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [live, setLive] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const socket = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!socketRef.current) socketRef.current = io();
    return socketRef.current;
  }, []);

  async function load() {
    const [e, r] = await Promise.all([
      fetch("/api/moderator/escalations").then((x) => x.json()),
      fetch("/api/moderator/reports").then((x) => x.json()),
    ]);
    setEscalations(e.escalations ?? []);
    setReports(r.reports ?? []);
  }

  useEffect(() => {
    load();
    if (!socket) return;
    const onCrisis = (p: { conversationId: string }) => {
      setLive(`CRISIS ALERT — conversation ${p.conversationId.slice(0, 8)}`);
      load();
    };
    socket.on("moderator:crisis", onCrisis);
    return () => {
      socket.off("moderator:crisis", onCrisis);
    };
  }, [socket]);

  async function view(conversationId: string) {
    const d = await fetch(`/api/moderator/conversation/${conversationId}`).then((r) => r.json());
    if (d.messages) setTranscript(d);
  }

  async function resolve(escalationId: string) {
    if (!resolveNote.trim()) return;
    await fetch("/api/moderator/escalations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ escalationId, actionsTaken: resolveNote }),
    });
    setResolveNote("");
    load();
  }

  async function reportAction(reportId: string, status: string, unlock = false) {
    await fetch("/api/moderator/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reportId, status, unlockConversation: unlock }),
    });
    load();
  }

  return (
    <main className="container" style={{ maxWidth: 860 }}>
      <h1>Moderator</h1>
      {live && (
        <div className="crisis-card" role="alert">
          <strong>{live}</strong>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Crisis escalations</h3>
        {escalations.length === 0 && <p className="hint">None.</p>}
        {escalations.map((e) => (
          <div key={e.id} style={{ borderTop: "1px solid #eee", paddingBlock: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <strong>{e.resolvedAt ? "resolved" : "OPEN"}</strong>
              <span>{new Date(e.createdAt).toLocaleString()}</span>
              <span className="hint">trigger: {e.trigger}</span>
              <button className="btn secondary" style={{ padding: "4px 10px" }} onClick={() => view(e.conversationId)}>
                View chat
              </button>
            </div>
            {e.actionsTaken && <p className="hint">Actions: {e.actionsTaken}</p>}
            {!e.resolvedAt && (
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  placeholder="Actions taken (e.g. called 1677, member safe)…"
                  value={resolveNote}
                  onChange={(ev) => setResolveNote(ev.target.value)}
                />
                <button className="btn" onClick={() => resolve(e.id)}>
                  Resolve
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Reports</h3>
        {reports.length === 0 && <p className="hint">None.</p>}
        {reports.map((r) => (
          <div key={r.id} style={{ borderTop: "1px solid #eee", paddingBlock: 8 }}>
            <div><strong>{r.status}</strong> · {new Date(r.createdAt).toLocaleString()}</div>
            <p style={{ margin: "4px 0" }}>{r.reason}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {r.conversationId && (
                <>
                  <button className="btn secondary" style={{ padding: "4px 10px" }}
                    onClick={() => reportAction(r.id, "reviewing", true)}>
                    Review + unlock chat
                  </button>
                  <button className="btn secondary" style={{ padding: "4px 10px" }} onClick={() => view(r.conversationId!)}>
                    View chat
                  </button>
                </>
              )}
              <button className="btn secondary" style={{ padding: "4px 10px" }} onClick={() => reportAction(r.id, "actioned")}>
                Mark actioned
              </button>
              <button className="btn secondary" style={{ padding: "4px 10px" }} onClick={() => reportAction(r.id, "dismissed")}>
                Dismiss
              </button>
              <UserActionButtons targetId={r.targetId} />
            </div>
          </div>
        ))}
      </div>

      {transcript && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            Transcript {transcript.conversation.id.slice(0, 8)}{" "}
            <span className="hint">(unlocked; view is audited)</span>
          </h3>
          {transcript.messages.map((m) => (
            <p key={m.id} style={{ margin: "4px 0" }}>
              <code>{m.senderId === transcript.conversation.memberId ? "member" : "listener"}:</code>{" "}
              {m.text}
            </p>
          ))}
          <div style={{ display: "flex", gap: 6 }}>
            <UserActionButtons targetId={transcript.conversation.listenerId} label="listener" />
            <UserActionButtons targetId={transcript.conversation.memberId} label="member" />
          </div>
          <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => setTranscript(null)}>
            Close
          </button>
        </div>
      )}
    </main>
  );
}

function UserActionButtons({ targetId, label }: { targetId: string; label?: string }) {
  async function act(action: string) {
    const reason = window.prompt(`Reason for ${action}${label ? ` (${label})` : ""}?`) ?? "";
    if (!reason) return;
    await fetch("/api/moderator/user-action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: targetId, action, reason }),
    });
    window.alert(`${action} applied`);
  }
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button className="btn secondary" style={{ padding: "4px 10px" }} onClick={() => act("suspend")}>
        Suspend{label ? ` ${label}` : ""}
      </button>
      <button className="btn danger" style={{ padding: "4px 10px" }} onClick={() => act("ban")}>
        Ban{label ? ` ${label}` : ""}
      </button>
    </span>
  );
}
