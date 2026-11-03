"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_KEYS, sortRecommended, type Product } from "@/lib/catalog";
import { FilterIcon } from "./Icons";
import ProductTile from "./ProductTile";

type Sort = "rec" | "new" | "asc" | "desc";

export default function ShopGrid({ products, title, current }: { products: Product[]; title: string; current: string }) {
  const [sort, setSort] = useState<Sort>("rec");
  const [dense, setDense] = useState(false);
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  useEffect(() => {
    try { setDense(localStorage.getItem("castilla-dense") === "1"); } catch {}
  }, []);
  const changeDense = (d: boolean) => {
    setDense(d);
    try { localStorage.setItem("castilla-dense", d ? "1" : "0"); } catch {}
  };

  const list = useMemo(() => {
    let l = onlyAvail ? products.filter((p) => p.stock > 0) : products;
    if (sort === "asc") l = l.slice().sort((a, b) => a.priceCents - b.priceCents);
    else if (sort === "desc") l = l.slice().sort((a, b) => b.priceCents - a.priceCents);
    else if (sort === "new") l = l.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    else l = sortRecommended(l);
    return l;
  }, [products, sort, onlyAvail]);

  const chips = [{ href: "/shop", label: "Alle" }, { href: "/shop/neu", label: "Neu" }, ...CATEGORY_KEYS.map((k) => ({ href: `/shop/${CATEGORIES[k].slug}`, label: CATEGORIES[k].label }))];

  return (
    <div className="wrap">
      <div className="shop-head">
        <h1>{title}</h1>
        <p>{list.length} {list.length === 1 ? "Produkt" : "Produkte"}</p>
      </div>
      <div className="toolbar">
        <button className="tb-btn" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}><FilterIcon />Filter</button>
        <div className="tb-right">
          <div className="dens">
            <button aria-pressed={!dense} aria-label="Große Ansicht" onClick={() => changeDense(false)}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" /><rect x="13" y="3" width="8" height="8" /><rect x="3" y="13" width="8" height="8" /><rect x="13" y="13" width="8" height="8" /></svg>
            </button>
            <button aria-pressed={dense} aria-label="Kompakte Ansicht" onClick={() => changeDense(true)}>
              <svg viewBox="0 0 24 24"><rect x="2" y="3" width="5.5" height="8" /><rect x="9.25" y="3" width="5.5" height="8" /><rect x="16.5" y="3" width="5.5" height="8" /><rect x="2" y="13" width="5.5" height="8" /><rect x="9.25" y="13" width="5.5" height="8" /><rect x="16.5" y="13" width="5.5" height="8" /></svg>
            </button>
          </div>
          <select className="sort" aria-label="Sortieren" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="rec">Empfohlen</option>
            <option value="new">Neueste</option>
            <option value="asc">Preis aufsteigend</option>
            <option value="desc">Preis absteigend</option>
          </select>
        </div>
      </div>
      <div className={`filterpanel${filterOpen ? " on" : ""}`}>
        <div className="chips">
          {chips.map((c) => <Link key={c.href} href={c.href} aria-current={current === c.href ? "page" : undefined}>{c.label}</Link>)}
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} /> Nur verfügbare Artikel
        </label>
      </div>
      <div className={`grid${dense ? " dense" : ""}`}>
        {list.length ? list.map((p) => <ProductTile key={p.id} p={p} />) : (
          <p className="empty">Hier gibt es gerade nichts. <Link className="textlink" href="/shop">Alle Produkte ansehen</Link></p>
        )}
      </div>
    </div>
  );
}
