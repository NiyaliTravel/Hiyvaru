"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type Step = "details" | "code" | "welcome";

export default function SignupPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [lang, setLang] = useState<"dv" | "en" | "both">(locale === "dv" ? "dv" : "en");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assignedName, setAssignedName] = useState<string>("");

  async function requestCode() {
    setError(null);
    // Client-side age pre-check: server re-validates (the real gate), but we
    // route obvious under-16s to the helpline page before any OTP is sent.
    if (!dob) return setError(t("errInvalidDate"));
    setBusy(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          phone: channel === "sms" ? phone : undefined,
          email: channel === "email" ? email : undefined,
          dob,
          purpose: "signup",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.reason === "under_16") return router.push(`/${locale}/under-16`);
        setError(errText(data.reason));
        return;
      }
      setStep("code");
    } finally {
      setBusy(false);
    }
  }

  async function submitSignup() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          phone: channel === "sms" ? phone : undefined,
          email: channel === "email" ? email : undefined,
          dob,
          code,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.reason === "under_16") return router.push(`/${locale}/under-16`);
        setError(errText(data.reason));
        return;
      }
      // Warm reveal of the anonymous identity before entering the app.
      setAssignedName(data.displayName ?? "");
      setStep("welcome");
    } finally {
      setBusy(false);
    }
  }

  function errText(reason: string): string {
    switch (reason) {
      case "invalid_destination":
        return channel === "sms" ? t("errInvalidPhone") : t("errInvalidEmail");
      case "bad_otp":
        return t("errBadCode");
      case "cooldown":
        return t("errCooldown");
      case "already_registered":
        return t("errAlreadyRegistered");
      case "invalid_date":
      case "implausible":
        return t("errInvalidDate");
      default:
        return t("errBadCode");
    }
  }

  return (
    <main className="container">
      <div className="topbar">
        <span className="brand">{tc("appName")}</span>
        <LanguageSwitcher />
      </div>
      <div className="card">
        <h1>{t("signupTitle")}</h1>
        {step === "details" && (
          <>
            {channel === "sms" ? (
              <>
                <label htmlFor="phone">{t("phone")}</label>
                <p className="hint">{t("phoneHint")}</p>
                <input
                  id="phone"
                  dir="ltr"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+960 7XXXXXX"
                />
                <p className="hint">
                  <button type="button" className="linklike" onClick={() => setChannel("email")}
                    style={{ background: "none", border: 0, color: "var(--teal)", cursor: "pointer", padding: 0 }}>
                    {t("useEmail")}
                  </button>
                </p>
              </>
            ) : (
              <>
                <label htmlFor="email">{t("email")}</label>
                <input
                  id="email"
                  dir="ltr"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="hint">
                  <button type="button" onClick={() => setChannel("sms")}
                    style={{ background: "none", border: 0, color: "var(--teal)", cursor: "pointer", padding: 0 }}>
                    {t("usePhone")}
                  </button>
                </p>
              </>
            )}

            <label htmlFor="dob">{t("dob")}</label>
            <p className="hint">{t("dobWhy")}</p>
            <input id="dob" dir="ltr" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />

            <label htmlFor="lang">{t("langPref")}</label>
            <select id="lang" value={lang} onChange={(e) => setLang(e.target.value as never)}>
              <option value="dv">{t("langDv")}</option>
              <option value="en">{t("langEn")}</option>
              <option value="both">{t("langBoth")}</option>
            </select>

            {error && <p className="error">{error}</p>}
            <button className="btn block" style={{ marginTop: 16 }} disabled={busy} onClick={requestCode}>
              {t("sendCode")}
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <p>{t("codeSent")}</p>
            <label htmlFor="code">{t("code")}</label>
            <input
              id="code"
              dir="ltr"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error && <p className="error">{error}</p>}
            <button className="btn block" style={{ marginTop: 16 }} disabled={busy || code.length !== 6} onClick={submitSignup}>
              {t("verify")}
            </button>
          </>
        )}

        {step === "welcome" && (
          <div style={{ textAlign: "center" }}>
            <span className="avatar" aria-hidden="true" style={{ width: 76, height: 76, fontSize: "1.5rem", margin: "8px auto 16px" }}>
              {assignedName.slice(0, 2).toUpperCase()}
            </span>
            <p className="hint" style={{ marginBottom: 4 }}>{t("welcomeName")}</p>
            <h2 dir="ltr" style={{ color: "var(--teal-dark)", margin: "0 0 12px" }}>{assignedName}</h2>
            <p>{t("welcomeBody")}</p>
            <button className="btn block" style={{ marginTop: 16 }} onClick={() => router.push(`/${locale}/member`)}>
              {t("welcomeCta")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
