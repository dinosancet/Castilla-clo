import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/data";
import { STATUS_LABEL, eur } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bestellung", robots: { index: false } };

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const order = id ? await getOrder(id) : null;
  if (!order) notFound();
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
      <p className="small">Speichere dir diese Seite, um den Status später nachzusehen.</p>
      <Link className="btn" href="/shop">Weiter einkaufen</Link>
    </main>
  );
}
