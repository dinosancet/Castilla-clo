"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COMMISSION_LABEL, STATUS_LABEL, eur, type Commission, type Creator, type CreatorLink, type Order } from "@/lib/catalog";
import type { CustomerProfile } from "@/lib/customer";
import CopyLink from "./CopyLink";
import PayoutForm from "./PayoutForm";

type Partner = { creator: Creator; links: CreatorLink[]; commissions: Commission[]; holdDays: number; cookieDays: number } | null;
type Tab = "orders" | "earn" | "data";
const fmt = (iso: string) => new Date(iso).toLocaleDateString("de-DE");

export default function AccountDashboard({ email, profile, orders, partner }: { email: string; profile: CustomerProfile; orders: Order[]; partner: Partner }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(partner ? "earn" : "orders");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function logout() {
    await fetch("/api/konto/logout", { method: "POST" });
    router.replace("/konto");
    router.refresh();
  }

  return (
    <main className="wrap" style={{ maxWidth: 1040 }}>
      <div className="admin-top" style={{ paddingTop: "clamp(32px,5vw,56px)" }}>
        <div>
          <h1 className="acc-title">Hallo{profile.name ? ` ${profile.name.split(" ")[0]}` : ""}</h1>
          <p className="small">{email}</p>
        </div>
        <button className="link" onClick={logout}>Abmelden</button>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "earn"} onClick={() => setTab("earn")}>Provision</button>
        <button role="tab" aria-selected={tab === "orders"} onClick={() => setTab("orders")}>Bestellungen ({orders.length})</button>
        <button role="tab" aria-selected={tab === "data"} onClick={() => setTab("data")}>Meine Daten</button>
      </div>

      {tab === "orders" && (
        orders.length ? orders.map((o) => (
          <div className="order" key={o.id}>
            <div className="top"><span>Nr. {o.id} <span className="small">{fmt(o.createdAt)}</span></span><span className="status">{STATUS_LABEL[o.status]}</span></div>
            <div style={{ marginTop: 10, fontSize: 14 }}>{o.items.map((i, n) => <div key={n}>{i.qty} × {i.name}, {i.size}</div>)}</div>
            <div style={{ marginTop: 8 }}>{eur(o.totalCents)}</div>
            {o.status !== "storniert" && o.status !== "retourniert" ? <Link className="link" style={{ display: "inline-block", marginTop: 8 }} href={`/widerrufen?bestellung=${o.id}`}>Vertrag widerrufen</Link> : null}
          </div>
        )) : <p className="small">Du hast noch nichts bestellt. <Link className="textlink" href="/shop">Zum Shop</Link></p>
      )}

      {tab === "earn" && (partner ? (
        <>
          <div className="kpis">
            <div><b>{partner.creator.clicks}</b><span>Klicks</span></div>
            <div><b>{partner.creator.sales}</b><span>Käufe</span></div>
            <div><b>{eur(partner.creator.pendingCents)}</b><span>Vorgemerkt</span></div>
            <div><b>{eur(partner.creator.releasedCents)}</b><span>Zur Auszahlung frei</span></div>
            <div><b>{eur(partner.creator.paidCents)}</b><span>Ausgezahlt</span></div>
          </div>
          {!partner.creator.active ? <p className="msg err">Dein Partnerzugang ist derzeit pausiert. Neue Käufe über deine Links bringen keine Provision.</p> : null}
          <section className="sec" style={{ paddingTop: 40 }}>
            <div className="sec-title"><h2>Deine Links</h2></div>
            {partner.links.map((l) => (
              <div key={l.code} className="order">
                <div className="top"><span>{l.productName}</span><span className="small">{l.clicks} Klicks · {l.sales} {l.sales === 1 ? "Kauf" : "Käufe"} · {eur(l.earnedCents)}</span></div>
                <div style={{ marginTop: 10 }}><CopyLink url={`${origin}/r/${l.code}`} /></div>
              </div>
            ))}
          </section>
          <section className="sec" style={{ paddingTop: 40 }}>
            <div className="sec-title"><h2>Provisionen</h2></div>
            {partner.commissions.length ? (
              <div className="table-wrap"><table>
                <thead><tr><th>Datum</th><th>Produkt</th><th>Betrag</th><th>Status</th></tr></thead>
                <tbody>{partner.commissions.map((x) => (
                  <tr key={x.id}><td>{fmt(x.createdAt)}</td><td>{x.productName}</td><td>{eur(x.amountCents)}</td>
                    <td>{COMMISSION_LABEL[x.status]}{x.status === "vorgemerkt" && x.releaseAt ? <span className="small"> (ab {fmt(x.releaseAt)})</span> : null}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="small">Noch keine Verkäufe über deine Links. Teile sie auf Instagram, TikTok oder in deiner Story.</p>}
          </section>
          <section className="sec" style={{ paddingTop: 40 }}>
            <div className="sec-title"><h2>Auszahlung</h2></div>
            <PayoutForm token={partner.creator.token} initial={partner.creator.payout} />
            <p className="small" style={{ maxWidth: "70ch", marginTop: 20 }}>
              Ein Klick auf deinen Link zählt {partner.cookieDays} Tage. Provision gibt es für das Produkt, zu dem der Link gehört. Sie wird {partner.holdDays} Tage nach Versand freigegeben, wenn die Bestellung nicht storniert oder zurückgeschickt wurde. Käufe über den eigenen Link zählen nicht. Bitte kennzeichne deine Beiträge als Werbung.
            </p>
          </section>
        </>
      ) : (
        <div className="earn" style={{ marginTop: 0 }}>
          <h2>Verdiene mit, wenn du CASTILLA zeigst</h2>
          <p>Mit jedem Kauf eines Produkts mit Provision bekommst du deinen persönlichen Link. Teilst du ihn und jemand kauft darüber, bekommst du eine Provision. Hier siehst du dann Klicks, Käufe und deinen Verdienst.</p>
          <Link className="btn" href="/shop">Zum Shop</Link>
        </div>
      ))}

      {tab === "data" && <ProfileForm profile={profile} />}
    </main>
  );
}

function ProfileForm({ profile }: { profile: CustomerProfile }) {
  const [p, setP] = useState(profile);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof CustomerProfile, v: string) => setP((x) => ({ ...x, [k]: v }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/konto/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: p.name, street: p.street, zip: p.zip, city: p.city }) }).catch(() => null);
    setMsg(res?.ok ? { ok: true, text: "Gespeichert. Die Adresse wird an der Kasse automatisch eingetragen." } : { ok: false, text: "Speichern hat nicht geklappt." });
  }
  return (
    <form className="pform" onSubmit={save} style={{ maxWidth: 640 }}>
      <label className="l full">Vor- und Nachname<input className="field" value={p.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" /></label>
      <label className="l full">Straße und Hausnummer<input className="field" value={p.street} onChange={(e) => set("street", e.target.value)} autoComplete="street-address" /></label>
      <label className="l">PLZ<input className="field" value={p.zip} onChange={(e) => set("zip", e.target.value)} autoComplete="postal-code" /></label>
      <label className="l">Ort<input className="field" value={p.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" /></label>
      <div className="full"><button className="btn">Speichern</button><div className={`msg ${msg ? (msg.ok ? "ok" : "err") : ""}`}>{msg?.text}</div></div>
      <p className="small full" style={{ margin: 0 }}>Deine E-Mail-Adresse ist dein Login. Alle Bestellungen mit dieser Adresse erscheinen automatisch in deinem Konto.</p>
    </form>
  );
}
