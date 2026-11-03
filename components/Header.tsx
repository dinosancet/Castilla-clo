"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_KEYS, type Product } from "@/lib/catalog";
import { useCart } from "./Cart";
import { BagIcon, CloseIcon, SearchIcon } from "./Icons";
import { TempleSmall } from "./Logo";
import ProductTile from "./ProductTile";

const NAV = [
  { href: "/shop/neu", label: "Neu" },
  { href: "/shop", label: "Shop all" },
  ...CATEGORY_KEYS.map((k) => ({ href: `/shop/${CATEGORIES[k].slug}`, label: CATEGORIES[k].label })),
];

export default function Header({ products }: { products: Product[] }) {
  const path = usePathname();
  const { count, setOpen } = useCart();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setSearching(false), [path]);
  useEffect(() => {
    if (searching) setTimeout(() => input.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSearching(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searching]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return products
      .filter((p) => `${p.name} ${CATEGORIES[p.category].label} ${p.description}`.toLowerCase().includes(t))
      .slice(0, 8);
  }, [q, products]);

  return (
    <>
      <header className="site">
        <div className="wrap bar">
          <div className="left">
            <button className="iconbtn" aria-label="Suchen" onClick={() => { setQ(""); setSearching(true); }}>
              <SearchIcon />
            </button>
          </div>
          <Link href="/" className="brand" aria-label="CASTILLA Startseite">
            <TempleSmall />
            <span className="wordmark">CASTILLA</span>
          </Link>
          <div className="right">
            <button className="iconbtn" aria-label="Warenkorb" onClick={() => setOpen(true)}>
              <BagIcon />
              <span className="dot">{count || ""}</span>
            </button>
          </div>
        </div>
        <nav className="cats" aria-label="Kategorien">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className={`overlay${searching ? " open" : ""}`} aria-hidden={!searching}>
        <div className="shade" onClick={() => setSearching(false)} />
        <div className="searchbox" role="dialog" aria-label="Suche">
          <div className="wrap">
            <div className="row">
              <SearchIcon />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Wonach suchst du?" autoComplete="off" />
              <button className="iconbtn" aria-label="Suche schließen" onClick={() => setSearching(false)}><CloseIcon /></button>
            </div>
            <div className="sresults grid">
              {q.trim() && !results.length ? <p className="empty">Keine Treffer für „{q.trim()}“.</p> : results.map((p) => <ProductTile key={p.id} p={p} />)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
