import { z } from "zod";

export const ProductInput = z.object({
  name: z.string().trim().min(1).max(120),
  priceCents: z.number().int().min(0).max(10_000_000),
  category: z.enum(["hoodie", "tee", "pants", "acc"]),
  sizes: z.array(z.string().trim().min(1).max(30)).max(20),
  stock: z.number().int().min(0).max(1_000_000),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  description: z.string().max(4000),
  isNew: z.boolean(),
  imageUrl: z.string().url().nullable(),
  imageUrl2: z.string().url().nullable(),
});
export type ProductInputT = z.infer<typeof ProductInput>;
