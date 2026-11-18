import Link from "next/link";
import { LEGAL_PAGES, type LegalPage as Key } from "@/lib/catalog";
import { getSettings } from "@/lib/data";
import { legalText } from "@/lib/legal";

/** Renders the tiny markup from lib/legal.ts: "## " / "### " headings, "- " lists, blank line = paragraph. */
export function LegalText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="legal-text">
      {blocks.map((b, i) => {
        if (b.startsWith("### ")) return <h3 key={i}>{b.slice(4)}</h3>;
        if (b.startsWith("## ")) return <h2 key={i}>{b.slice(3)}</h2>;
        if (b.split("\n").every((l) => l.startsWith("- "))) return <ul key={i}>{b.split("\n").map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        const lines = b.split("\n");
        return <p key={i}>{lines.map((l, j) => <span key={j}>{l}{j < lines.length - 1 ? <br /> : null}</span>)}</p>;
      })}
    </div>
  );
}

export default async function LegalPage({ page, children }: { page: Key; children?: React.ReactNode }) {
  const s = await getSettings();
  const meta = LEGAL_PAGES.find((p) => p.key === page)!;
  return (
    <main className="page-narrow legal">
      <h1>{meta.label}</h1>
      <LegalText text={legalText(page, s)} />
      {children}
      <nav className="legal-nav">
        {LEGAL_PAGES.filter((p) => p.key !== page).map((p) => <Link key={p.key} href={p.href}>{p.label}</Link>)}
      </nav>
    </main>
  );
}
