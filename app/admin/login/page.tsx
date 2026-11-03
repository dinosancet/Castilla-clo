"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) { router.replace("/admin"); router.refresh(); return; }
    setBusy(false);
    setErr(data?.error || "Anmelden fehlgeschlagen.");
  }
  return (
    <main className="login">
      <h1>Verwaltung</h1>
      <form className="form" onSubmit={submit}>
        <label className="l">Passwort<input className="field" type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        <button className="btn block" disabled={busy}>{busy ? "Wird geprüft …" : "Anmelden"}</button>
        <div className="msg err">{err}</div>
      </form>
    </main>
  );
}
