"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Category } from "@/lib/catalog";

export type CartLine = {
  id: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  category: Category;
  color: string;
  size: string;
  qty: number;
  maxQty: number;
};

type Ctx = {
  lines: CartLine[];
  count: number;
  totalCents: number;
  add: (l: Omit<CartLine, "qty">) => void;
  setQty: (id: string, size: string, qty: number) => void;
  remove: (id: string, size: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "castilla-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((l: Omit<CartLine, "qty">) => {
    setLines((prev) => {
      const hit = prev.find((x) => x.id === l.id && x.size === l.size);
      if (hit) return prev.map((x) => (x === hit ? { ...x, qty: Math.min(x.qty + 1, Math.max(1, l.maxQty)) } : x));
      return [...prev, { ...l, qty: 1 }];
    });
    setOpen(true);
  }, []);
  const setQty = useCallback((id: string, size: string, qty: number) => {
    setLines((prev) => prev.map((x) => (x.id === id && x.size === size ? { ...x, qty: Math.max(1, Math.min(qty, Math.max(1, x.maxQty), 20)) } : x)));
  }, []);
  const remove = useCallback((id: string, size: string) => setLines((prev) => prev.filter((x) => !(x.id === id && x.size === size))), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(
    () => ({
      lines,
      count: lines.reduce((a, l) => a + l.qty, 0),
      totalCents: lines.reduce((a, l) => a + l.qty * l.priceCents, 0),
      add, setQty, remove, clear, open, setOpen,
    }),
    [lines, add, setQty, remove, clear, open],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
