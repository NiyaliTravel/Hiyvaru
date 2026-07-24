"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { io, type Socket } from "socket.io-client";
import ChatWindow from "@/components/ChatWindow";
import ReportButton from "@/components/ReportButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoutButton from "@/components/LogoutButton";

type ActiveConv = { id: string; lang: string; startedAt: string; escalated: boolean };

export default function ListenerDashboard() {
  const t = useTranslations();
  const [selfId, setSelfId] = useState("");
  const [available, setAvailable] = useState(false);
  const [convs, setConvs] = useState<ActiveConv[]>([]);
  const [openConv, setOpenConv] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const socket = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!socketRef.current) socketRef.current = io();
    return socketRef.current;
  }, []);

  async function refreshActive() {
    const d = await fetch("/api/chat/active").then((r) => r.json());
    setConvs(d.conversations ?? []);
  }

  useEffect(() => {
    if (!socket) return;
    fetch("/api/me").then((r) => r.json()).then((d) => setSelfId(d.id ?? ""));
    fetch("/api/listener/availability").then((r) => r.json()).then((d) => setAvailable(!!d.available));
    refreshActive();
    const onAssigned = (p: { conversationId: string }) => {
      refreshActive();
      setOpenConv(p.conversationId);
    };
    socket.on("match:assigned", onAssigned);
    return () => {
      socket.off("match:assigned", onAssigned);
    };
  }, [socket]);

  async function toggleAvailability() {
    const next = !available;
    setAvailable(next);
    await fetch("/api/listener/availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ available: next }),
    });
  }

  return (
    <main className="container">
      <div className="topbar">
        <span className="brand">{t("common.appName")}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LanguageSwitcher />
          <LogoutButton label={t("common.logout")} />
        </div>
      </div>

      <div className="card">
        <label style={{ display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
          <input
            type="checkbox"
            checked={available}
            onChange={toggleAvailability}
            style={{ width: "auto" }}
          />
          {available ? t("chat.available") : t("chat.unavailable")}
        </label>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("chat.activeChats")}</h3>
        {convs.length === 0 && <p className="hint">{t("chat.noActive")}</p>}
        {convs.map((c) => (
          <button
            key={c.id}
            className="btn secondary block"
            style={{ marginBlock: 4 }}
            onClick={() => setOpenConv(c.id)}
          >
            {new Date(c.startedAt).toLocaleTimeString()} · {c.lang}
          </button>
        ))}
      </div>

      {openConv && socket && selfId && (
        <ChatWindow
          key={openConv}
          socket={socket}
          conversationId={openConv}
          selfId={selfId}
          onEnded={refreshActive}
          extraButtons={<ReportButton conversationId={openConv} />}
        />
      )}
    </main>
  );
}
