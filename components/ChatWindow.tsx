"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Socket } from "socket.io-client";

export type ChatMessage = { id: string; senderId: string; text: string; at: string };

export default function ChatWindow({
  socket,
  conversationId,
  selfId,
  role = "member",
  onEnded,
  extraButtons,
}: {
  socket: Socket;
  conversationId: string;
  selfId: string;
  role?: "member" | "listener";
  onEnded?: () => void;
  extraButtons?: React.ReactNode;
}) {
  const t = useTranslations("chat");
  const tc = useTranslations("crisis");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [ended, setEnded] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [riskHint, setRiskHint] = useState(false);
  const [contactWarning, setContactWarning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    socket.emit(
      "conv:join",
      conversationId,
      (r: { ok?: boolean; ended?: boolean; escalated?: boolean; messages?: ChatMessage[] }) => {
        if (r?.ok) {
          setMessages(r.messages ?? []);
          setEnded(!!r.ended);
          setCrisis(!!r.escalated);
        }
      },
    );
    const onMessage = (m: ChatMessage) => setMessages((prev) => [...prev, m]);
    const onTyping = (p: { userId: string; typing: boolean }) => {
      if (p.userId !== selfId) setPeerTyping(p.typing);
    };
    const onEndedEvt = () => {
      setEnded(true);
      onEnded?.();
    };
    const onCrisis = () => setCrisis(true);
    const onRiskHint = () => setRiskHint(true);
    const onContactWarning = () => setContactWarning(true);
    socket.on("conv:message", onMessage);
    socket.on("conv:typing", onTyping);
    socket.on("conv:ended", onEndedEvt);
    socket.on("conv:crisis", onCrisis);
    socket.on("conv:risk-hint", onRiskHint);
    socket.on("conv:contact-warning", onContactWarning);
    return () => {
      socket.off("conv:message", onMessage);
      socket.off("conv:typing", onTyping);
      socket.off("conv:ended", onEndedEvt);
      socket.off("conv:crisis", onCrisis);
      socket.off("conv:risk-hint", onRiskHint);
      socket.off("conv:contact-warning", onContactWarning);
    };
  }, [socket, conversationId, selfId, onEnded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text || ended) return;
    socket.emit("conv:message", { conversationId, text });
    setInput("");
  }

  function onType(v: string) {
    setInput(v);
    socket.emit("conv:typing", { conversationId, typing: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => socket.emit("conv:typing", { conversationId, typing: false }),
      1200,
    );
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "70vh" }}>
      {/* SAFETY (Hard Rule 3): full-width calm crisis card. The chat stays
          open underneath — the listener does not disappear on the member. */}
      {crisis && role === "member" && (
        <div className="crisis-card" role="alert">
          <h3 style={{ marginTop: 0 }}>{tc("title")}</h3>
          <a className="btn danger block" href="tel:119">{tc("call119")}</a>
          <a className="btn block" href="tel:1677">{tc("call1677")}</a>
          <a className="btn secondary block" href="tel:3322111">{tc("call3322111")}</a>
          <p style={{ marginBottom: 0 }}>{tc("staying")}</p>
        </div>
      )}
      {crisis && role === "listener" && (
        <div className="crisis-card" role="alert">
          <h3 style={{ marginTop: 0 }}>{tc("scriptTitle")}</h3>
          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            <li>{tc("script1")}</li>
            <li>{tc("script2")}</li>
            <li>{tc("script3")}</li>
            <li>{tc("script4")}</li>
          </ul>
        </div>
      )}
      {riskHint && role === "listener" && !crisis && (
        <p className="hint" role="status" style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 10, padding: "8px 12px" }}>
          {tc("riskHint")}
        </p>
      )}
      {contactWarning && (
        <p className="hint" role="status" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "8px 12px" }}>
          {tc("contactWarning")}
        </p>
      )}
      <div style={{ flex: 1, overflowY: "auto", paddingBlock: 8 }}>
        {messages.length === 0 && <p className="hint">{t("connected")}</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              maxWidth: "80%",
              marginBlock: 6,
              padding: "8px 12px",
              borderRadius: 12,
              background: m.senderId === selfId ? "var(--teal)" : "#eef4f4",
              color: m.senderId === selfId ? "#fff" : "var(--ink)",
              marginInlineStart: m.senderId === selfId ? "auto" : 0,
            }}
          >
            {m.text}
          </div>
        ))}
        {peerTyping && <p className="hint">{t("typing")}</p>}
        {ended && <p className="hint">{t("ended")}</p>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("placeholder")}
          disabled={ended}
        />
        <button className="btn" onClick={send} disabled={ended || !input.trim()}>
          {t("send")}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {!ended && (
          <button
            className="btn secondary"
            style={{ padding: "8px 14px" }}
            onClick={() => socket.emit("conv:end", conversationId)}
          >
            {t("endChat")}
          </button>
        )}
        {extraButtons}
      </div>
    </div>
  );
}
