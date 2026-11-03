import Link from "next/link";
import { eur, type Product } from "@/lib/catalog";
import GarmentArt from "./GarmentArt";

export default function ProductTile({ p }: { p: Product }) {
  const out = p.stock <= 0;
  return (
    <Link className="tile" href={`/produkt/${p.id}`}>
      <div className="img">
        {out ? <span className="lab out">Ausverkauft</span> : p.isNew ? <span className="lab">Neu</span> : null}
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.name} loading="lazy" decoding="async" />
        ) : (
          <GarmentArt category={p.category} color={p.color} />
        )}
        {p.imageUrl && p.imageUrl2 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="alt" src={p.imageUrl2} alt="" loading="lazy" decoding="async" />
        ) : null}
      </div>
      <div className="nm">{p.name}</div>
      <div className="pr">{eur(p.priceCents)}</div>
    </Link>
  );
}
