/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getProducts, getSettings } from "@/lib/data";
import { sortRecommended } from "@/lib/catalog";
import ProductTile from "@/components/ProductTile";
import Countdown from "@/components/Countdown";
import NewsletterForm from "@/components/NewsletterForm";
import { TempleSmall } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, s] = await Promise.all([getProducts(), getSettings()]);
  const sorted = sortRecommended(products);
  const fresh = sorted.filter((p) => p.isNew);
  const featured = (fresh.length >= 4 ? fresh : sorted).slice(0, 4);

  return (
    <main>
      {s.heroImageUrl ? (
        <section className="hero photo">
          <img className="bgimg" src={s.heroImageUrl} alt="" />
          <div className="hero-inner">
            <h1 className="htitle">{s.heroTitle}</h1>
            <Link href="/shop" className="btn white">Jetzt shoppen</Link>
          </div>
        </section>
      ) : (
        <section className="hero">
          <div className="hero-inner">
            <img className="temple" src="/logo-temple.webp" alt="CASTILLA Tempel" width={478} height={330} />
            <h1 className="name">CASTILLA</h1>
            <div className="season">{s.heroTitle}</div>
            <Link href="/shop" className="btn paper cta">Kollektion entdecken</Link>
          </div>
        </section>
      )}

      <div className="wrap">
        <section className="sec">
          <div className="sec-title"><h2>Neuheiten</h2><Link className="textlink" href="/shop">Alle ansehen</Link></div>
          <div className="grid">
            {featured.length ? featured.map((p) => <ProductTile key={p.id} p={p} />) : <p className="empty">Die Kollektion ist noch leer.</p>}
          </div>
        </section>
      </div>

      {s.dropAt ? <Countdown at={s.dropAt} name={s.dropName} text={s.dropText} /> : null}

      <div className="wrap">
        <section className="statement">
          <TempleSmall />
          <p>CASTILLA steht für Kleidung mit Haltung. Schwere Stoffe, ruhige Farben und klare Schnitte, gefertigt in kleinen Auflagen statt Massenware.</p>
        </section>
        <NewsletterForm />
      </div>
    </main>
  );
}
