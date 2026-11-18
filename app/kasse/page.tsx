"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { eur, taxNote } from "@/lib/catalog";
import { useCart } from "@/components/Cart";

export default function CheckoutPage() {
  const { lines, totalCents, shippingCents, terms, clear } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Logged-in customers: prefill name, e-mail and address.
  useEffect(() => {
    fetch("/api/konto/me").then((r) => r.json()).then(({ profile }) => {
      const f = formRef.current;
      if (!profile || !f) return;
      setEmail(profile.email);
      for (const k of ["name", "email", "street", "zip", "city"] as const) {
        const el = f.elements.namedItem(k) as HTMLInputElement | null;
        if (el && !el.value && profile[k]) el.value = profile[k];
      }
    }).catch(() => {});
  }, [lines.length]);

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
        <form className="form" onSubmit={submit} id="co" ref={formRef}>
          <h1>Kasse</h1>
          {email ? <p className="small" style={{ margin: 0 }}>Angemeldet als {email}. Die Bestellung erscheint in deinem Konto.</p> : <p className="small" style={{ margin: 0 }}>Schon bestellt? <Link className="textlink" style={{ textTransform: "none", letterSpacing: 0 }} href="/konto">Anmelden</Link>, dann sind deine Daten schon eingetragen.</p>}
          <label className="l">Vor- und Nachname<input className="field" name="name" required autoComplete="name" /></label>
          <label className="l">E-Mail<input className="field" name="email" type="email" required autoComplete="email" /></label>
          <label className="l">Straße und Hausnummer<input className="field" name="street" required autoComplete="street-address" /></label>
          <div className="two">
            <label className="l">PLZ<input className="field" name="zip" required autoComplete="postal-code" /></label>
            <label className="l">Ort<input className="field" name="city" required autoComplete="address-level2" /></label>
          </div>
          <p className="small" style={{ margin: 0 }}>Lieferung nur innerhalb Deutschlands, 2–4 Werktage nach Zahlungseingang.</p>
          <div className="order" style={{ margin: 0 }}>
            <div style={{ fontWeight: 500 }}>Zahlungsart: Vorkasse (Überweisung)</div>
            <div className="small">Die Bankverbindung erhältst du mit der Bestellbestätigung per E-Mail. Wir versenden nach Zahlungseingang.</div>
          </div>
        </form>
        <aside className="summary">
          {lines.map((l) => (
            <div className="sum" key={l.id + l.size}><span>{l.qty} × {l.name}, {l.size}</span><span>{eur(l.qty * l.priceCents)}</span></div>
          ))}
          <div className="sum" style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 12 }}><span>Zwischensumme</span><span>{eur(totalCents)}</span></div>
          <div className="sum"><span>Versand (Deutschland)</span><span>{shippingCents ? eur(shippingCents) : "kostenlos"}</span></div>
          <div className="sum" style={{ fontWeight: 500, fontSize: 17 }}><span>Gesamt</span><span>{eur(totalCents + shippingCents)}</span></div>
          <div className="small" style={{ marginBottom: 16 }}>{taxNote(terms)}</div>
          <button className="btn block" form="co" disabled={busy}>{busy ? "Wird gesendet …" : "Zahlungspflichtig bestellen"}</button>
          <div className="msg err">{err}</div>
          <p className="fine" style={{ margin: "6px 0 0" }}>
            Mit deiner Bestellung erklärst du dich mit unseren <Link href="/agb" target="_blank">AGB</Link> einverstanden.
            Hinweise zu deinem <Link href="/widerruf" target="_blank">Widerrufsrecht</Link> und zum <Link href="/datenschutz" target="_blank">Datenschutz</Link> findest du hier.
          </p>
        </aside>
      </div>
    </main>
  );
}
