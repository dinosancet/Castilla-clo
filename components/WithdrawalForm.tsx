"use client";
import { useState } from "react";

type Done = { createdAt: string; orderRef: string; items: string; name: string; email: string; mailed: boolean };

export default function WithdrawalForm({ presetOrder, presetEmail }: { presetOrder: string; presetEmail: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(["name", "email", "orderRef", "items"].map((k) => [k, String(f.get(k) || "")]));
    const res = await fetch("/api/widerruf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok) setDone(data as Done);
    else setErr(data?.error || "Der Widerruf konnte nicht gesendet werden. Bitte versuche es erneut oder schreib uns eine E-Mail.");
  }

  if (done) {
    const at = new Date(done.createdAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "long", timeStyle: "short" });
    return (
      <div className="earn" role="status">
        <h2>Dein Widerruf ist eingegangen</h2>
        <p>Eingegangen am <b style={{ fontWeight: 500 }}>{at} Uhr</b>.</p>
        <p className="small">
          Bestellung {done.orderRef} · {done.items || "gesamte Bestellung"}<br />
          {done.name} · {done.email}
        </p>
        <p className="small">
          {done.mailed ? "Eine Eingangsbestätigung haben wir dir per E-Mail geschickt." : "Bitte speichere diese Seite als Bestätigung. Die E-Mail-Bestätigung konnte gerade nicht verschickt werden."}{" "}
          Bitte sende die Ware innerhalb von 14 Tagen an uns zurück. Die Kosten der Rücksendung trägst du.
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="l">Vor- und Nachname<input className="field" name="name" required autoComplete="name" /></label>
      <label className="l">E-Mail-Adresse der Bestellung<input className="field" name="email" type="email" required autoComplete="email" defaultValue={presetEmail} /></label>
      <label className="l">Bestellnummer<input className="field" name="orderRef" required defaultValue={presetOrder} placeholder="z. B. JT9HSMT2JP" /></label>
      <label className="l">Welche Artikel? (leer lassen = gesamte Bestellung)<textarea className="field" name="items" rows={2} placeholder="z. B. Torre Hoodie, Größe M" /></label>
      <button className="btn block" disabled={busy}>{busy ? "Wird gesendet …" : "Widerruf bestätigen"}</button>
      <div className="msg err">{err}</div>
    </form>
  );
}
