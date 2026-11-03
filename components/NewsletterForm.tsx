"use client";
import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok) { setMsg({ ok: true, text: "Danke, du bist angemeldet." }); setEmail(""); }
    else setMsg({ ok: false, text: data?.error || "Anmelden hat nicht geklappt. Versuche es gleich noch einmal." });
  }
  return (
    <section className="news">
      <h3>Newsletter</h3>
      <p>Erfahre als Erstes von neuen Drops und Kollektionen.</p>
      <form onSubmit={submit}>
        <input type="email" required placeholder="E-Mail-Adresse" aria-label="E-Mail-Adresse" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={busy}>Anmelden</button>
      </form>
      <div className={`msg ${msg ? (msg.ok ? "ok" : "err") : ""}`}>{msg?.text}</div>
    </section>
  );
}
