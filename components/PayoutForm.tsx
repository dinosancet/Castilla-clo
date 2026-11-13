"use client";
import { useState } from "react";

export default function PayoutForm({ token, initial }: { token: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/partner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, payout: value }) }).catch(() => null);
    setMsg(res?.ok ? { ok: true, text: "Gespeichert." } : { ok: false, text: "Speichern hat nicht geklappt. Versuche es erneut." });
  }
  return (
    <form className="form" onSubmit={save} style={{ paddingTop: 0 }}>
      <label className="l">PayPal-E-Mail oder IBAN mit Kontoinhaber
        <textarea className="field" rows={2} value={value} onChange={(e) => setValue(e.target.value)} placeholder="z. B. paypal@beispiel.de oder DE12 3456 …, Max Muster" />
      </label>
      <div><button className="btn">Speichern</button></div>
      <div className={`msg ${msg ? (msg.ok ? "ok" : "err") : ""}`}>{msg?.text}</div>
    </form>
  );
}
