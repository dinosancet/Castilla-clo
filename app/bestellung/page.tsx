import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, getSettings } from "@/lib/data";
import { linksForOrder } from "@/lib/affiliate";
import { linkUrl, partnerUrl } from "@/lib/site";
import CopyLink from "@/components/CopyLink";
import { STATUS_LABEL, eur } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bestellung", robots: { index: false } };

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const order = id ? await getOrder(id) : null;
  if (!order) notFound();
  const [{ token, links }, settings] = await Promise.all([
    linksForOrder(order.customer.email, order.items.map((i) => i.productId)),
    getSettings(),
  ]);
  return (
    <main className="page-narrow">
      <h1>Vielen Dank</h1>
      <p>Deine Bestellung Nr. {order.id} ist bei uns eingegangen. Die Zahlungsdaten erhältst du per E-Mail an {order.customer.email}.</p>
      <div className="order">
        <div className="top"><span>Nr. {order.id}</span><span className="status">{STATUS_LABEL[order.status]}</span></div>
        <div style={{ marginTop: 12, fontSize: 14 }}>
          {order.items.map((i, n) => <div key={n}>{i.qty} × {i.name}, {i.size}</div>)}
        </div>
        <div style={{ marginTop: 10 }}>{eur(order.totalCents)}</div>
      </div>
      {links.length ? (
        <section className="earn">
          <h2>Verdiene mit, wenn du CASTILLA zeigst</h2>
          <p>Das ist dein persönlicher Link. Teile ihn auf Instagram, TikTok oder wo du willst. Kauft jemand über deinen Link, bekommst du eine Provision.</p>
          {links.map((l) => (
            <div key={l.code} className="earn-link">
              <div className="small">{l.productName}</div>
              <CopyLink url={linkUrl(l.code)} />
            </div>
          ))}
          <p className="small">
            Die Provision wird {settings.commissionHoldDays} Tage nach Versand der vermittelten Bestellung freigegeben, also nach Ablauf der Rückgabefrist. Bitte kennzeichne deine Beiträge als Werbung.
            {token ? <> Klicks, Verkäufe und deine Provision siehst du im <Link className="textlink" style={{ textTransform: "none", letterSpacing: 0 }} href={partnerUrl(token).replace(/^https?:\/\/[^/]+/, "")}>Partnerbereich</Link>.</> : null}
          </p>
        </section>
      ) : null}
      <p className="small">Speichere dir diese Seite, um den Status später nachzusehen.</p>
      <Link className="btn" href="/shop">Weiter einkaufen</Link>
    </main>
  );
}
