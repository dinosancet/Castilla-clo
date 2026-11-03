"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { eur } from "@/lib/catalog";
import { useCart } from "@/components/Cart";

export default function CheckoutPage() {
  const { lines, totalCents, clear } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const customer = Object.fromEntries(["name", "email", "street", "zip", "city"].map((k) => [k, String(f.get(k) || "")]));
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lines.map((l) => ({ id: l.id, size: l.size, qty: l.qty })), customer }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok && data?.id) {
      clear();
      router.push(`/bestellung/${data.id}`);
      return;
    }
    setBusy(false);
    setErr(data?.error || "Die Bestellung konnte nicht gesendet werden. Prüfe deine Verbindung und versuche es erneut.");
  }

  if (!lines.length) {
    return (
      <main className="page-narrow" style={{ textAlign: "center" }}>
        <h1>Kasse</h1>
        <p className="small">Dein Warenkorb ist leer.</p>
        <Link className="btn" href="/shop">Zum Shop</Link>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="checkout">
        <form className="form" onSubmit={submit} id="co">
          <h1>Kasse</h1>
          <label className="l">Vor- und Nachname<input className="field" name="name" required autoComplete="name" /></label>
          <label className="l">E-Mail<input className="field" name="email" type="email" required autoComplete="email" /></label>
          <label className="l">Straße und Hausnummer<input className="field" name="street" required autoComplete="street-address" /></label>
          <div className="two">
            <label className="l">PLZ<input className="field" name="zip" required autoComplete="postal-code" /></label>
            <label className="l">Ort<input className="field" name="city" required autoComplete="address-level2" /></label>
          </div>
          <p className="small" style={{ margin: 0 }}>Zahlung per Rechnung. Die Zahlungsdaten erhältst du nach der Bestellung per E-Mail.</p>
        </form>
        <aside className="summary">
          {lines.map((l) => (
            <div className="sum" key={l.id + l.size}><span>{l.qty} × {l.name}, {l.size}</span><span>{eur(l.qty * l.priceCents)}</span></div>
          ))}
          <div className="sum" style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 12 }}><span>Gesamt</span><span>{eur(totalCents)}</span></div>
          <div className="small" style={{ marginBottom: 16 }}>inkl. MwSt.</div>
          <button className="btn block" form="co" disabled={busy}>{busy ? "Wird gesendet …" : "Zahlungspflichtig bestellen"}</button>
          <div className="msg err">{err}</div>
        </aside>
      </div>
    </main>
  );
}
