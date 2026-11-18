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
  /** Units in stock per size, e.g. { S: 3, M: 0 }. */
  sizeStock: Record<string, number>;
  /** Sum over all sizes. */
  stock: number;
  color: string;
  description: string;
  isNew: boolean;
  /** Commission for creators in percent of the item price (0 = no links). */
  commissionPercent: number;
  /** Fibre composition (Textilkennzeichnung), e.g. "100 % Baumwolle". */
  material: string;
  /** Care instructions. */
  care: string;
  /** All photos in display order. */
  images: string[];
  /** Shortcuts: first and second photo. */
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
  /** Days after shipping until a commission is released (covers the return period). */
  commissionHoldDays: number;
  /** How long a click on a creator link counts for a purchase. */
  refCookieDays: number;
  /** Seller / legal notice (Impressum). */
  legalOwner: string;
  legalBusiness: string;
  legalStreet: string;
  legalZipCity: string;
  legalEmail: string;
  legalPhone: string;
  /** USt-IdNr. per § 27a UStG, empty if none. */
  vatId: string;
  /** Kleinunternehmer per § 19 UStG: no VAT is charged or shown. */
  smallBusiness: boolean;
  shippingCents: number;
  /** Free shipping from this order value; 0 = never free. */
  freeShippingFromCents: number;
  /** Bank details for prepayment, sent with the order confirmation. */
  bankDetails: string;
  /** Optional replacement texts for the legal pages (empty = generated text). */
  legalOverrides: Partial<Record<LegalPage, string>>;
};

export type LegalPage = "impressum" | "datenschutz" | "agb" | "widerruf" | "versand" | "partnerbedingungen";
export const LEGAL_PAGES: { key: LegalPage; label: string; href: string }[] = [
  { key: "impressum", label: "Impressum", href: "/impressum" },
  { key: "datenschutz", label: "Datenschutz", href: "/datenschutz" },
  { key: "agb", label: "AGB", href: "/agb" },
  { key: "widerruf", label: "Widerrufsbelehrung", href: "/widerruf" },
  { key: "versand", label: "Versand & Zahlung", href: "/versand" },
  { key: "partnerbedingungen", label: "Partnerprogramm", href: "/partnerbedingungen" },
];

export const DEFAULT_SETTINGS: Settings = {
  banner: "",
  heroTitle: "Herbst Winter 26",
  heroImageUrl: null,
  dropName: "",
  dropText: "",
  dropAt: null,
  shippingText: "Versand innerhalb Deutschlands, Lieferzeit 2–4 Werktage nach Zahlungseingang.\n14 Tage Widerrufsrecht. Die Kosten der Rücksendung trägst du.",
  commissionHoldDays: 21,
  refCookieDays: 30,
  legalOwner: "",
  legalBusiness: "Vectresscorp",
  legalStreet: "Eschauer Allee 10",
  legalZipCity: "",
  legalEmail: "Vectresscorp@web.de",
  legalPhone: "",
  vatId: "",
  smallBusiness: false,
  shippingCents: 495,
  freeShippingFromCents: 0,
  bankDetails: "",
  legalOverrides: {},
};

type ShopTerms = Pick<Settings, "shippingCents" | "freeShippingFromCents" | "smallBusiness">;
export function shippingFor(subtotalCents: number, t: ShopTerms) {
  if (subtotalCents <= 0) return 0;
  return t.freeShippingFromCents > 0 && subtotalCents >= t.freeShippingFromCents ? 0 : t.shippingCents;
}
/** Short price note next to prices. */
export const taxNote = (t: ShopTerms) => (t.smallBusiness ? "Kein Ausweis der USt. (§ 19 UStG)" : "inkl. MwSt.");

export type OrderStatus = "neu" | "bezahlt" | "versendet" | "storniert" | "retourniert";
export const FINAL_STATUSES: OrderStatus[] = ["storniert", "retourniert"];
export const STATUS_LABEL: Record<OrderStatus, string> = {
  neu: "Eingegangen",
  bezahlt: "Bezahlt",
  versendet: "Versendet",
  storniert: "Storniert",
  retourniert: "Retourniert",
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
  shippedAt: string | null;
  refCode: string | null;
  shippingCents: number;
};

export type Withdrawal = {
  id: string; createdAt: string; name: string; email: string; orderRef: string; orderId: string | null; items: string; handled: boolean;
};

export type CommissionStatus = "vorgemerkt" | "freigegeben" | "ausgezahlt" | "storniert";
export const COMMISSION_LABEL: Record<CommissionStatus, string> = {
  vorgemerkt: "Vorgemerkt",
  freigegeben: "Zur Auszahlung frei",
  ausgezahlt: "Ausgezahlt",
  storniert: "Storniert",
};
export type Commission = {
  id: string; orderId: string; creatorId: string; code: string; productName: string;
  amountCents: number; status: CommissionStatus; createdAt: string; releaseAt: string | null;
};
export type CreatorLink = { code: string; creatorId: string; productId: string; productName: string; clicks: number; sales: number; earnedCents: number };
export type Creator = {
  id: string; email: string; name: string; token: string; active: boolean; payout: string; createdAt: string;
  links: number; clicks: number; sales: number;
  pendingCents: number; releasedCents: number; paidCents: number;
};

export const sizesOf = (p: Pick<Product, "sizes">) => (p.sizes.length ? p.sizes : ["One Size"]);
export const stockOf = (p: Pick<Product, "sizeStock">, size: string) => Math.max(0, Number(p.sizeStock[size] ?? 0));
export const MAX_IMAGES = 12;

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
