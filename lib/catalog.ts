export type Category = "hoodie" | "tee" | "pants" | "acc";

export const CATEGORIES: Record<Category, { label: string; slug: string }> = {
  hoodie: { label: "Hoodies", slug: "hoodies" },
  tee: { label: "T-Shirts", slug: "t-shirts" },
  pants: { label: "Hosen", slug: "hosen" },
  acc: { label: "Accessoires", slug: "accessoires" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

export function categoryFromSlug(slug: string): Category | null {
  const hit = CATEGORY_KEYS.find((k) => CATEGORIES[k].slug === slug);
  return hit ?? null;
}

export type Product = {
  id: string;
  name: string;
  priceCents: number;
  category: Category;
  sizes: string[];
  stock: number;
  color: string;
  description: string;
  isNew: boolean;
  imageUrl: string | null;
  imageUrl2: string | null;
  updatedAt: string;
};

export type Settings = {
  banner: string;
  heroTitle: string;
  heroImageUrl: string | null;
  dropName: string;
  dropText: string;
  dropAt: string | null;
  shippingText: string;
};

export const DEFAULT_SETTINGS: Settings = {
  banner: "",
  heroTitle: "Herbst Winter 26",
  heroImageUrl: null,
  dropName: "",
  dropText: "",
  dropAt: null,
  shippingText: "Versand innerhalb Deutschlands in 2–4 Werktagen.\nRückgabe innerhalb von 14 Tagen nach Erhalt.",
};

export type OrderStatus = "neu" | "bezahlt" | "versendet" | "storniert";
export const STATUS_LABEL: Record<OrderStatus, string> = {
  neu: "Eingegangen",
  bezahlt: "Bezahlt",
  versendet: "Versendet",
  storniert: "Storniert",
};

export type OrderItem = { productId: string; name: string; size: string; qty: number; priceCents: number };
export type Customer = { name: string; email: string; street: string; zip: string; city: string };
export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  totalCents: number;
  customer: Customer;
};

export const sizesOf = (p: Pick<Product, "sizes">) => (p.sizes.length ? p.sizes : ["One Size"]);

export function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function sortRecommended<T extends Product>(list: T[]) {
  return list
    .slice()
    .sort(
      (a, b) =>
        Number(b.isNew) - Number(a.isNew) ||
        Number(a.stock <= 0) - Number(b.stock <= 0) ||
        a.name.localeCompare(b.name, "de"),
    );
}
