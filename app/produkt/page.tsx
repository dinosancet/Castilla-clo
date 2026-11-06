/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct, getProducts, getSettings } from "@/lib/data";
import { CATEGORIES, eur, sortRecommended } from "@/lib/catalog";
import AddToCart from "@/components/AddToCart";
import GarmentArt from "@/components/GarmentArt";
import ProductTile from "@/components/ProductTile";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ id?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const id = (await searchParams).id;
  const p = id ? await getProduct(id) : null;
  return p ? { title: p.name, description: p.description.slice(0, 160), openGraph: p.imageUrl ? { images: [p.imageUrl] } : undefined } : { title: "Nicht gefunden" };
}

export default async function ProductPage({ searchParams }: Props) {
  const { id } = await searchParams;
  if (!id) notFound();
  const [p, all, s] = await Promise.all([getProduct(id), getProducts(), getSettings()]);
  if (!p) notFound();
  const imgs = p.images;
  const others = all.filter((x) => x.id !== p.id);
  const related = [...sortRecommended(others.filter((x) => x.category === p.category)), ...sortRecommended(others.filter((x) => x.category !== p.category))].slice(0, 4);
  const cat = CATEGORIES[p.category];

  return (
    <main className="wrap">
      <div className="crumbs">
        <Link href="/shop">Shop all</Link> / <Link href={`/shop/${cat.slug}`}>{cat.label}</Link> / {p.name}
      </div>
      <div className="pdp">
        <div className="gallery">
          {imgs.length ? (
            imgs.map((src, i) => (
              <div key={src} className={`g${imgs.length === 1 || (imgs.length % 2 === 1 && i === 0) ? " solo" : ""}`}>
                <img src={src} alt={i === 0 ? p.name : `${p.name}, Bild ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} />
              </div>
            ))
          ) : (
            <div className="g solo"><GarmentArt category={p.category} color={p.color} /></div>
          )}
        </div>
        <div className="buy">
          <h1>{p.name}</h1>
          <div className="price">{eur(p.priceCents)}</div>
          <div className="tax">inkl. MwSt., zzgl. Versand</div>
          <AddToCart p={p} />
          <div className="mt">
            <details open><summary>Beschreibung</summary><p>{p.description || "Keine Beschreibung vorhanden."}</p></details>
            <details><summary>Versand &amp; Rückgabe</summary><p>{s.shippingText}</p></details>
          </div>
        </div>
      </div>
      {related.length ? (
        <section className="sec">
          <div className="sec-title"><h2>Das könnte dir gefallen</h2></div>
          <div className="grid">{related.map((r) => <ProductTile key={r.id} p={r} />)}</div>
        </section>
      ) : null}
    </main>
  );
}
