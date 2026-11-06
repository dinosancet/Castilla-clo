"use client";
import { useState } from "react";
import { sizesOf, stockOf, type Product } from "@/lib/catalog";
import { useCart } from "./Cart";

export default function AddToCart({ p }: { p: Product }) {
  const sizes = sizesOf(p);
  const available = sizes.filter((s) => stockOf(p, s) > 0);
  const [size, setSize] = useState<string | null>(sizes.length === 1 && available.length === 1 ? sizes[0] : null);
  const [err, setErr] = useState("");
  const { add } = useCart();
  const out = available.length === 0;
  const left = size ? stockOf(p, size) : 0;

  let note = "Bitte wähle deine Größe.";
  if (out) note = "Dieser Artikel ist ausverkauft.";
  else if (size) note = left <= 0 ? `In ${size} ausverkauft.` : left <= 5 ? `Nur noch ${left} Stück in ${size} verfügbar` : "Auf Lager, sofort lieferbar";

  return (
    <>
      <div className="lbl"><span>Größe{size ? `: ${size}` : ""}</span></div>
      <div className="sizes">
        {sizes.map((s) => {
          const soldOut = stockOf(p, s) <= 0;
          return (
            <button
              key={s}
              aria-pressed={size === s}
              disabled={soldOut}
              className={soldOut ? "soldout" : undefined}
              title={soldOut ? `${s} ist ausverkauft` : undefined}
              onClick={() => { setSize(s); setErr(""); }}
            >
              {s}
            </button>
          );
        })}
      </div>
      <div className="stock">{note}</div>
      <button
        className="btn block"
        disabled={out}
        onClick={() => {
          if (!size) return setErr("Bitte wähle eine Größe.");
          add({ id: p.id, name: p.name, priceCents: p.priceCents, imageUrl: p.imageUrl, category: p.category, color: p.color, size, maxQty: left });
        }}
      >
        {out ? "Ausverkauft" : "In den Warenkorb"}
      </button>
      <div className="msg err">{err}</div>
    </>
  );
}
