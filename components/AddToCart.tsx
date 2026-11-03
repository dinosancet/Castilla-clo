"use client";
import { useState } from "react";
import { sizesOf, type Product } from "@/lib/catalog";
import { useCart } from "./Cart";

export default function AddToCart({ p }: { p: Product }) {
  const sizes = sizesOf(p);
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [err, setErr] = useState("");
  const { add } = useCart();
  const out = p.stock <= 0;
  return (
    <>
      <div className="lbl"><span>Größe{size ? `: ${size}` : ""}</span></div>
      <div className="sizes">
        {sizes.map((s) => (
          <button key={s} aria-pressed={size === s} disabled={out} onClick={() => { setSize(s); setErr(""); }}>{s}</button>
        ))}
      </div>
      <div className="stock">
        {out ? "Dieser Artikel ist ausverkauft." : p.stock <= 5 ? `Nur noch ${p.stock} Stück verfügbar` : "Auf Lager, sofort lieferbar"}
      </div>
      <button
        className="btn block"
        disabled={out}
        onClick={() => {
          if (!size) return setErr("Bitte wähle eine Größe.");
          add({ id: p.id, name: p.name, priceCents: p.priceCents, imageUrl: p.imageUrl, category: p.category, color: p.color, size, maxQty: p.stock });
        }}
      >
        {out ? "Ausverkauft" : "In den Warenkorb"}
      </button>
      <div className="msg err">{err}</div>
    </>
  );
}
