import { useState } from "react";
import { X, ShoppingBag } from "lucide-react";
import type { Plant } from "@/lib/catalog";

interface CartDrawerProps {
  open: boolean;
  items: { plant: Plant; qty: number }[];
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onCheckout: () => void;
}

export function CartDrawer({ open, items, onClose, onUpdateQty, onCheckout }: CartDrawerProps) {
  const subtotal = items.reduce((sum, i) => sum + i.plant.price * i.qty, 0);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-ink/10 bg-cream/90 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Shopping bag"
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Your bag {items.length > 0 && `(${items.reduce((n, i) => n + i.qty, 0)})`}
          </h2>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-ink/10 bg-white/60 transition hover:border-ink/30"
            aria-label="Close bag"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag className="size-10 text-ink/25" />
              <p className="font-display text-lg font-medium">Your bag is empty</p>
              <p className="max-w-[26ch] text-sm text-ink/55">
                Add something living from the greenhouse and it will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-5">
              {items.map(({ plant, qty }) => (
                <li key={plant.id} className="flex items-center gap-4">
                  <img
                    src={plant.image}
                    alt={plant.name}
                    loading="lazy"
                    width={1024}
                    height={1024}
                    className="size-16 shrink-0 rounded-xl border border-ink/5 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-semibold leading-tight">{plant.name}</p>
                    <p className="text-sm text-ink/55">{plant.tagline}</p>
                    <div className="mt-1.5 inline-flex items-center gap-3 rounded-full border border-ink/10 bg-white/60 px-2 py-0.5">
                      <button
                        onClick={() => onUpdateQty(plant.id, -1)}
                        className="px-1 text-ink/60 transition hover:text-terra"
                        aria-label={`Remove one ${plant.name}`}
                      >
                        −
                      </button>
                      <span className="min-w-3 text-center text-sm font-medium">{qty}</span>
                      <button
                        onClick={() => onUpdateQty(plant.id, 1)}
                        className="px-1 text-ink/60 transition hover:text-sage"
                        aria-label={`Add one ${plant.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <span className="font-display text-base font-semibold">${plant.price * qty}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-ink/10 px-6 py-5">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-ink/55">
                <span>Subtotal</span>
                <span>${subtotal}</span>
              </div>
              <div className="flex justify-between text-ink/55">
                <span>Delivery</span>
                <span className="text-sage">Free</span>
              </div>
              <div className="flex justify-between pt-1 font-display text-lg font-semibold">
                <span>Total</span>
                <span>${subtotal}</span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="mt-4 w-full rounded-full bg-terra px-5 py-3 text-sm font-medium text-white transition hover:bg-terra/90"
            >
              Checkout
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
