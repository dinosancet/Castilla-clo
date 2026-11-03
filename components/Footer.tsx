/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/catalog";

export default function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="fgrid">
          <div>
            <img src="/logo-temple-gold.webp" alt="" />
            <div className="wm">CASTILLA</div>
          </div>
          <div>
            <h4>Shop</h4>
            <Link href="/shop/neu">Neu</Link>
            <Link href="/shop">Shop all</Link>
            {CATEGORY_KEYS.map((k) => (
              <Link key={k} href={`/shop/${CATEGORIES[k].slug}`}>{CATEGORIES[k].label}</Link>
            ))}
          </div>
          <div>
            <h4>Service</h4>
            <Link href="/kasse">Warenkorb &amp; Kasse</Link>
            <Link href="/admin">Verwaltung</Link>
          </div>
        </div>
        <div className="legal">© {new Date().getFullYear()} CASTILLA</div>
      </div>
    </footer>
  );
}
