import { z } from "zod";
import { MAX_IMAGES } from "./catalog";

export const ProductInput = z.object({
  name: z.string().trim().min(1).max(120),
  priceCents: z.number().int().min(0).max(10_000_000),
  category: z.enum(["hoodie", "tee", "pants", "acc"]),
  /** Sizes in display order, each with its own stock. */
  sizes: z
    .array(z.object({ name: z.string().trim().min(1).max(30), stock: z.number().int().min(0).max(1_000_000) }))
    .min(1)
    .max(20)
    .refine((list) => new Set(list.map((s) => s.name.toLowerCase())).size === list.length, "Jede Größe darf nur einmal vorkommen."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  description: z.string().max(4000),
  isNew: z.boolean(),
  images: z.array(z.string().url()).max(MAX_IMAGES),
});
export type ProductInputT = z.infer<typeof ProductInput>;

/** Column values derived from the validated input. */
export function productColumns(p: ProductInputT) {
  const sizes = p.sizes.map((s) => s.name);
  const sizeStock = Object.fromEntries(p.sizes.map((s) => [s.name, s.stock]));
  const stock = p.sizes.reduce((a, s) => a + s.stock, 0);
  return { sizes, sizeStock, stock, imageUrl: p.images[0] ?? null, imageUrl2: p.images[1] ?? null };
}
