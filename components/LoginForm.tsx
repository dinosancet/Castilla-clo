"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function LoginForm({ presetEmail = "", presetCode = "" }: { presetEmail?: string; presetCode?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">(presetCode ? "code" : "email");
  const [email, setEmail] = useState(presetEmail);
  const [code, setCode] = useState(presetCode);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const auto = useRef(false);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    return { ok: !!res?.ok, error: (data?.error as string) || "Das hat nicht geklappt. Prüfe deine Verbindung." };
  }
  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setMsg(null);
    const r = await post("/api/konto/code", { email });
    setBusy(false);
    if (r.ok) { setStep("code"); setCode(""); setMsg({ ok: true, text: `Wir haben dir einen Code an ${email} geschickt. Schau auch im Spam-Ordner nach.` }); }
    else setMsg({ ok: false, text: r.error });
  }
  async function login(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setMsg(null);
    const r = await post("/api/konto/login", { email, code });
    if (r.ok) { router.replace("/konto"); router.refresh(); return; }
    setBusy(false);
    setMsg({ ok: false, text: r.error });
  }
  // Link from the e-mail: log in automatically (a click in the browser, not by mail scanners).
  useEffect(() => {
    if (presetEmail && presetCode && !auto.current) { auto.current = true; login(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="login">
      <h1>Mein Konto</h1>
      {step === "email" ? (
        <form className="form" onSubmit={requestCode}>
          <p className="small" style={{ margin: 0, textAlign: "center" }}>Melde dich mit der E-Mail-Adresse an, mit der du bestellt hast. Du bekommst einen Code, ein Passwort brauchst du nicht.</p>
          <label className="l">E-Mail<input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <button className="btn block" disabled={busy}>{busy ? "Wird gesendet …" : "Code anfordern"}</button>
        </form>
      ) : (
        <form className="form" onSubmit={login}>
          <label className="l">6-stelliger Code
            <input className="field codefield" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
          </label>
          <button className="btn block" disabled={busy || code.length !== 6}>{busy ? "Wird geprüft …" : "Anmelden"}</button>
          <div className="row-actions" style={{ justifyContent: "space-between" }}>
            <button type="button" className="link" onClick={() => { setStep("email"); setMsg(null); }}>Andere E-Mail</button>
            <button type="button" className="link" onClick={() => requestCode()} disabled={busy}>Neuen Code senden</button>
          </div>
        </form>
      )}
      <div className={`msg ${msg ? (msg.ok ? "ok" : "err") : ""}`} style={{ textAlign: "center" }}>{msg?.text}</div>
    </main>
  );
}
