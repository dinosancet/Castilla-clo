import Link from "next/link";

export default function NotFound() {
  return (
    <main className="nf">
      <p>Diese Seite gibt es nicht.</p>
      <Link className="btn" href="/shop">Zum Shop</Link>
    </main>
  );
}
