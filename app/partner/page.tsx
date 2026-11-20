import { notFound } from "next/navigation";
import { getPartner } from "@/lib/affiliate";
import { COMMISSION_LABEL, eur } from "@/lib/catalog";
import { linkUrl } from "@/lib/site";
import CopyLink from "@/components/CopyLink";
import PayoutForm from "@/components/PayoutForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partnerbereich", robots: { index: false } };

export default async function PartnerPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const data = t ? await getPartner(t) : null;
  if (!data) notFound();
  const { creator: c, links, commissions, holdDays, cookieDays } = data;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("de-DE");
  return (
    <main className="wrap" style={{ maxWidth: 980 }}>
      <div className="shop-head" style={{ textAlign: "left" }}>
        <h1>Partnerbereich</h1>
        <p>Hallo {c.name}{c.active ? "" : ". Dein Partnerzugang ist derzeit pausiert."}</p>
      </div>
      <div className="kpis">
        <div><b>{c.clicks}</b><span>Klicks</span></div>
        <div><b>{c.sales}</b><span>Käufe</span></div>
        <div><b>{eur(c.pendingCents)}</b><span>Vorgemerkt</span></div>
        <div><b>{eur(c.releasedCents)}</b><span>Zur Auszahlung frei</span></div>
        <div><b>{eur(c.paidCents)}</b><span>Ausgezahlt</span></div>
      </div>

      <section className="sec" style={{ paddingTop: 48 }}>
        <div className="sec-title"><h2>Deine Links</h2></div>
        {links.map((l) => (
          <div key={l.code} className="order">
            <div className="top"><span>{l.productName}</span><span className="small">{l.clicks} Klicks · {l.sales} {l.sales === 1 ? "Kauf" : "Käufe"} · {eur(l.earnedCents)}</span></div>
            <div style={{ marginTop: 10 }}><CopyLink url={linkUrl(l.code)} /></div>
          </div>
        ))}
      </section>

      <section className="sec" style={{ paddingTop: 48 }}>
        <div className="sec-title"><h2>Provisionen</h2></div>
        {commissions.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Datum</th><th>Produkt</th><th>Betrag</th><th>Status</th></tr></thead>
              <tbody>
                {commissions.map((x) => (
                  <tr key={x.id}>
                    <td>{fmt(x.createdAt)}</td><td>{x.productName}</td><td>{eur(x.amountCents)}</td>
                    <td>{COMMISSION_LABEL[x.status]}{x.status === "vorgemerkt" && x.releaseAt ? <span className="small"> (ab {fmt(x.releaseAt)})</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="small">Noch keine Verkäufe über deine Links.</p>}
      </section>

      <section className="sec" style={{ paddingTop: 48 }}>
        <div className="sec-title"><h2>Auszahlung</h2></div>
        <PayoutForm token={c.token} initial={c.payout} />
      </section>

      <section className="sec" style={{ paddingTop: 40 }}>
        <p className="small" style={{ maxWidth: "70ch" }}>
          So funktioniert es: Klickt jemand auf deinen Link, wird der Kauf {cookieDays} Tage lang dir zugeordnet. Provision gibt es für das Produkt, zu dem dein Link gehört.
          Sie ist zunächst vorgemerkt und wird {holdDays} Tage nach Versand freigegeben, wenn die Bestellung nicht storniert oder zurückgeschickt wurde.
          Eigene Käufe über den eigenen Link zählen nicht. Bitte kennzeichne deine Beiträge als Werbung. Diesen Link nicht weitergeben, er ist dein persönlicher Zugang.
        </p>
      </section>
    </main>
  );
}
