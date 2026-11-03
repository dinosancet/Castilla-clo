"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { eur } from "@/lib/catalog";
import { useCart } from "./Cart";
import GarmentArt from "./GarmentArt";
import { CloseIcon } from "./Icons";

export default function CartDrawer() {
  const { lines, totalCents, open, setOpen, setQty, remove } = useCart();
  const path = usePathname();
  useEffect(() => setOpen(false), [path, setOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <div className={`overlay${open ? " open" : ""}`} aria-hidden={!open}>
      <div className="shade" onClick={() => setOpen(false)} />
      <div className="panel" role="dialog" aria-label="Warenkorb">
        <div className="phead">
          <h3>Warenkorb</h3>
          <button className="iconbtn" aria-label="Schließen" onClick={() => setOpen(false)}><CloseIcon /></button>
        </div>
        <div className="pbody">
          {!lines.length ? (
            <>
              <p className="small" style={{ paddingTop: 16 }}>Dein Warenkorb ist leer.</p>
              <Link className="btn" href="/shop">Zum Shop</Link>
            </>
          ) : (
            lines.map((l) => (
              <div className="line" key={l.id + l.size}>
                <Link className="th" href={`/produkt/${l.id}`}>
                  {l.imageUrl ? <img src={l.imageUrl} alt="" /> : <GarmentArt category={l.category} color={l.color} />}
                </Link>
                <div>
                  <div>{l.name}</div>
                  <div className="small">Größe {l.size}</div>
                  <div className="qty">
                    <button aria-label="Weniger" onClick={() => setQty(l.id, l.size, l.qty - 1)}>−</button>
                    <span>{l.qty}</span>
                    <button aria-label="Mehr" onClick={() => setQty(l.id, l.size, l.qty + 1)}>+</button>
                  </div>
                  <div><button className="link" onClick={() => remove(l.id, l.size)}>Entfernen</button></div>
                </div>
                <div>{eur(l.qty * l.priceCents)}</div>
              </div>
            ))
          )}
        </div>
        {lines.length ? (
          <div className="pfoot">
            <div className="sum"><span>Zwischensumme</span><span>{eur(totalCents)}</span></div>
            <div className="small" style={{ marginBottom: 14 }}>inkl. MwSt., zzgl. Versand</div>
            <Link className="btn block" href="/kasse">Zur Kasse</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
