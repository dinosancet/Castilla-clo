import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProducts } from "@/lib/data";
import { CATEGORIES, categoryFromSlug } from "@/lib/catalog";
import ShopGrid from "@/components/ShopGrid";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ kategorie?: string }> };

// /shop/hoodies is rewritten to /shop?kategorie=hoodies (see next.config.mjs)
async function resolve(searchParams: Props["searchParams"]) {
  const { kategorie } = await searchParams;
  if (!kategorie) return { kind: "all" as const, title: "Shop all", href: "/shop" };
  if (kategorie === "neu") return { kind: "new" as const, title: "Neu", href: "/shop/neu" };
  const cat = categoryFromSlug(kategorie);
  return cat ? { kind: cat, title: CATEGORIES[cat].label, href: `/shop/${kategorie}` } : null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const r = await resolve(searchParams);
  return { title: r?.title ?? "Shop" };
}

export default async function ShopPage({ searchParams }: Props) {
  const r = await resolve(searchParams);
  if (!r) notFound();
  const all = await getProducts();
  const products = r.kind === "all" ? all : r.kind === "new" ? all.filter((p) => p.isNew) : all.filter((p) => p.category === r.kind);
  return <main><ShopGrid products={products} title={r.title} current={r.href} /></main>;
}
