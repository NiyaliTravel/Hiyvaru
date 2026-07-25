"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { io, type Socket } from "socket.io-client";
import ChatWindow from "@/components/ChatWindow";
import PanicButton from "@/components/PanicButton";
import ReportButton from "@/components/ReportButton";

type Stage = "waiting" | "chat" | "rate" | "done" | "timeout";

export default function TalkNowPage() {
  return (
    <Suspense fallback={<main className="container" />}>
      <TalkNow />
    </Suspense>
  );
}

function TalkNow() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredListenerId = searchParams.get("listener");
  const [stage, setStage] = useState<Stage>("waiting");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string>("");
  const socketRef = useRef<Socket | null>(null);
  const socket = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!socketRef.current) socketRef.current = io();
    return socketRef.current;
  }, []);

  // rating state
  const [stars, setStars] = useState(0);
  const [flag, setFlag] = useState(false);
  const [keep, setKeep] = useState<"favourite" | "never_again" | "none">("none");
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (!socket) return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setSelfId(d.id ?? ""));

    // Reconnect to an active chat if one exists, otherwise queue up.
    fetch("/api/chat/active")
      .then((r) => r.json())
      .then(async (d) => {
        if (d.conversations?.length > 0) {
          setConversationId(d.conversations[0].id);
          setStage("chat");
        } else {
          await fetch("/api/chat/request", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              lang: locale === "dv" ? "dv" : "en",
              preferredListenerId: preferredListenerId ?? undefined,
            }),
          });
        }
      });

    const onFound = (p: { conversationId: string }) => {
      setConversationId(p.conversationId);
      setStage("chat");
    };
    const onTimeout = () => setStage("timeout");
    socket.on("match:found", onFound);
    socket.on("match:timeout", onTimeout);
    return () => {
      socket.off("match:found", onFound);
      socket.off("match:timeout", onTimeout);
    };
  }, [socket, locale]);

  const onEnded = useCallback(() => setStage("rate"), []);

  async function submitRating() {
    if (conversationId && stars >= 1) {
      await fetch(`/api/chat/${conversationId}/rate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stars, flag, keep }),
      });
    }
    setStage("done");
  }

  async function hardDelete() {
    if (!conversationId) return;
    if (!window.confirm(t("chat.deleteConfirm"))) return;
    const res = await fetch(`/api/chat/${conversationId}/delete`, { method: "POST" });
    if (res.ok) setDeleted(true);
  }

  async function cancel() {
    await fetch("/api/chat/cancel", { method: "POST" });
    router.push(`/${locale}/member`);
  }

  return (
    <main className="container">
      <div className="topbar">
        <span className="brand">{t("common.appName")}</span>
        <PanicButton label={t("chat.panic")} />
      </div>

      {stage === "waiting" && (
        <div className="card" style={{ textAlign: "center" }}>
          <div className="breathe" />
          <p>{t("member.breathe")}</p>
          <p className="hint">{t("member.matching")}</p>
          <button className="btn secondary" onClick={cancel}>
            {t("member.cancel")}
          </button>
        </div>
      )}

      {stage === "timeout" && (
        <div className="card" style={{ textAlign: "center" }}>
          <p>{t("chat.timeout")}</p>
          <a className="btn block secondary" href="tel:1677">
            {t("helplines.helpline1677")}
          </a>
          <button className="btn block" style={{ marginTop: 8 }} onClick={() => router.push(`/${locale}/member`)}>
            {t("common.back")}
          </button>
        </div>
      )}

      {stage === "chat" && socket && conversationId && selfId && (
        <ChatWindow
          socket={socket}
          conversationId={conversationId}
          selfId={selfId}
          onEnded={onEnded}
          extraButtons={<ReportButton conversationId={conversationId} />}
        />
      )}

      {(stage === "rate" || stage === "done") && (
        <div className="card">
          {stage === "rate" && (
            <>
              <h2>{t("chat.rateTitle")}</h2>
              <div style={{ fontSize: "1.8rem", display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    aria-label={`star-${n}`}
                    onClick={() => setStars(n)}
                    style={{ background: "none", border: 0, cursor: "pointer", fontSize: "inherit", opacity: n <= stars ? 1 : 0.3 }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <label>
                <input type="checkbox" checked={flag} onChange={(e) => setFlag(e.target.checked)} style={{ width: "auto", marginInlineEnd: 8 }} />
                {t("chat.rateFlag")}
              </label>
              <label>
                <input type="radio" name="keep" checked={keep === "favourite"} onChange={() => setKeep("favourite")} style={{ width: "auto", marginInlineEnd: 8 }} />
                {t("chat.keepListener")}
              </label>
              <label>
                <input type="radio" name="keep" checked={keep === "never_again"} onChange={() => setKeep("never_again")} style={{ width: "auto", marginInlineEnd: 8 }} />
                {t("chat.neverListener")}
              </label>
              <label>
                <input type="radio" name="keep" checked={keep === "none"} onChange={() => setKeep("none")} style={{ width: "auto", marginInlineEnd: 8 }} />
                {t("chat.keepNeither")}
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn" disabled={stars < 1} onClick={submitRating}>
                  {t("chat.submit")}
                </button>
                <button className="btn secondary" onClick={() => setStage("done")}>
                  {t("chat.skip")}
                </button>
              </div>
            </>
          )}
          {stage === "done" && (
            <>
              {deleted ? (
                <p>{t("chat.deleteDone")}</p>
              ) : (
                <button className="btn danger block" onClick={hardDelete}>
                  {t("chat.deleteConvo")}
                </button>
              )}
              <button className="btn secondary block" style={{ marginTop: 10 }} onClick={() => router.push(`/${locale}/member`)}>
                {t("common.back")}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
