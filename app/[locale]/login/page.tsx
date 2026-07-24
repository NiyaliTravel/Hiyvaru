"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<"details" | "code">("details");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          phone: channel === "sms" ? phone : undefined,
          email: channel === "email" ? email : undefined,
          purpose: "login",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.reason === "no_account"
            ? t("errNoAccount")
            : data.reason === "cooldown"
              ? t("errCooldown")
              : channel === "sms"
                ? t("errInvalidPhone")
                : t("errInvalidEmail"),
        );
        return;
      }
      setStep("code");
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          phone: channel === "sms" ? phone : undefined,
          email: channel === "email" ? email : undefined,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.reason === "no_account" ? t("errNoAccount") : t("errBadCode"));
        return;
      }
      router.push(`/${locale}/${data.home}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="topbar">
        <span className="brand">{tc("appName")}</span>
        <LanguageSwitcher />
      </div>
      <div className="card">
        <h1>{t("loginTitle")}</h1>
        {step === "details" ? (
          <>
            {channel === "sms" ? (
              <>
                <label htmlFor="phone">{t("phone")}</label>
                <input id="phone" dir="ltr" inputMode="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)} placeholder="+960 7xxxxxx" />
                <p className="hint">
                  <button type="button" onClick={() => setChannel("email")}
                    style={{ background: "none", border: 0, color: "var(--teal)", cursor: "pointer", padding: 0 }}>
                    {t("useEmail")}
                  </button>
                </p>
              </>
            ) : (
              <>
                <label htmlFor="email">{t("email")}</label>
                <input id="email" dir="ltr" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
                <p className="hint">
                  <button type="button" onClick={() => setChannel("sms")}
                    style={{ background: "none", border: 0, color: "var(--teal)", cursor: "pointer", padding: 0 }}>
                    {t("usePhone")}
                  </button>
                </p>
              </>
            )}
            {error && <p className="error">{error}</p>}
            <button className="btn block" style={{ marginTop: 16 }} disabled={busy} onClick={requestCode}>
              {t("sendCode")}
            </button>
          </>
        ) : (
          <>
            <p>{t("codeSent")}</p>
            <label htmlFor="code">{t("code")}</label>
            <input id="code" dir="ltr" inputMode="numeric" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value)} />
            {error && <p className="error">{error}</p>}
            <button className="btn block" style={{ marginTop: 16 }} disabled={busy || code.length !== 6} onClick={submitLogin}>
              {t("verifyLogin")}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
