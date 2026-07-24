"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Socket } from "socket.io-client";

export type ChatMessage = { id: string; senderId: string; text: string; at: string };

export default function ChatWindow({
  socket,
  conversationId,
  selfId,
  onEnded,
  extraButtons,
}: {
  socket: Socket;
  conversationId: string;
  selfId: string;
  onEnded?: () => void;
  extraButtons?: React.ReactNode;
}) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [ended, setEnded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    socket.emit("conv:join", conversationId, (r: { ok?: boolean; ended?: boolean; messages?: ChatMessage[] }) => {
      if (r?.ok) {
        setMessages(r.messages ?? []);
        setEnded(!!r.ended);
      }
    });
    const onMessage = (m: ChatMessage) => setMessages((prev) => [...prev, m]);
    const onTyping = (p: { userId: string; typing: boolean }) => {
      if (p.userId !== selfId) setPeerTyping(p.typing);
    };
    const onEndedEvt = () => {
      setEnded(true);
      onEnded?.();
    };
    socket.on("conv:message", onMessage);
    socket.on("conv:typing", onTyping);
    socket.on("conv:ended", onEndedEvt);
    return () => {
      socket.off("conv:message", onMessage);
      socket.off("conv:typing", onTyping);
      socket.off("conv:ended", onEndedEvt);
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
