import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { plantImage, type Plant } from "@/lib/plants";

export interface CartLine {
  id: string;
  name: string;
  tagline: string;
  price: number;
  image: string;
  vendorName: string | null;
  serviceAreas: string[] | null;
  qty: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (plant: Plant) => void;
  updateQty: (id: string, delta: number) => void;
  clear: () => void;
  qtyOf: (id: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "roots-cart";
const MAX_QTY = 20;

function readStored(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? (parsed as CartLine[])
          .filter((l) => l && l.id && l.qty > 0)
          // Bags saved before delivery areas existed: treat as deliverable everywhere until refreshed.
          .map((l) => ({ ...l, serviceAreas: l.serviceAreas ?? null }))
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  // Restore after mount so server and first client render agree.
  useEffect(() => {
    setLines(readStored());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable: the bag lasts for this visit
    }
  }, [lines, loaded]);

  const add = useCallback((plant: Plant) => {
    setLines((current) => {
      const existing = current.find((l) => l.id === plant.id);
      if (existing) {
        return current.map((l) =>
          l.id === plant.id
            ? {
                ...l,
                qty: Math.min(MAX_QTY, l.qty + 1),
                price: plant.price,
                serviceAreas: plant.serviceAreas,
              }
            : l,
        );
      }
      return [
        ...current,
        {
          id: plant.id,
          name: plant.name,
          tagline: plant.tagline,
          price: plant.price,
          image: plantImage(plant),
          vendorName: plant.vendorName,
          serviceAreas: plant.serviceAreas,
          qty: 1,
        },
      ];
    });
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setLines((current) =>
      current
        .map((l) =>
          l.id === id ? { ...l, qty: Math.min(MAX_QTY, Math.max(0, l.qty + delta)) } : l,
        )
        .filter((l) => l.qty > 0),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((sum, l) => sum + l.price * l.qty, 0),
      open,
      setOpen,
      add,
      updateQty,
      clear,
      qtyOf: (id) => lines.find((l) => l.id === id)?.qty ?? 0,
    }),
    [lines, open, add, updateQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
