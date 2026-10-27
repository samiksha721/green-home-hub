import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { DELIVERY_FEE, FREE_DELIVERY_FROM, deliveryFee, formatINR } from "@/lib/format";

export function CartDrawer() {
  const { lines, count, subtotal, open, setOpen, updateQty } = useCart();
  const navigate = useNavigate();
  const fee = deliveryFee(subtotal);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const checkout = () => {
    setOpen(false);
    navigate({ to: "/checkout" });
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/60 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-ink/10 bg-cream/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Shopping bag"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Your bag {count > 0 && `(${count})`}
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="grid size-9 place-items-center rounded-full border border-ink/10 bg-surface/60 transition hover:border-ink/30"
            aria-label="Close bag"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag className="size-10 text-ink/25" />
              <p className="font-display text-lg font-medium">Your bag is empty</p>
              <p className="max-w-[26ch] text-sm text-ink/55">
                Add something living from the greenhouse and it will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-5">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center gap-4">
                  {line.image ? (
                    <img
                      src={line.image}
                      alt={line.name}
                      loading="lazy"
                      className="size-16 shrink-0 rounded-xl border border-ink/5 object-cover"
                    />
                  ) : (
                    <div className="grid size-16 shrink-0 place-items-center rounded-xl border border-ink/5 bg-sagelight font-display text-xl font-semibold text-sage/60">
                      {line.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-semibold leading-tight">
                      {line.name}
                    </p>
                    <p className="truncate text-sm text-ink/55">
                      {line.vendorName ? `by ${line.vendorName}` : line.tagline}
                    </p>
                    <div className="mt-1.5 inline-flex items-center gap-3 rounded-full border border-ink/10 bg-surface/60 px-2 py-0.5">
                      <button
                        onClick={() => updateQty(line.id, -1)}
                        className="px-1 text-ink/60 transition hover:text-terra"
                        aria-label={`Remove one ${line.name}`}
                      >
                        −
                      </button>
                      <span className="min-w-3 text-center text-sm font-medium">{line.qty}</span>
                      <button
                        onClick={() => updateQty(line.id, 1)}
                        className="px-1 text-ink/60 transition hover:text-sage"
                        aria-label={`Add one ${line.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <span className="font-display text-base font-semibold">
                    {formatINR(line.price * line.qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-ink/10 px-6 py-5">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-ink/55">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink/55">
                <span>Delivery</span>
                {fee === 0 ? (
                  <span className="text-sage">Free</span>
                ) : (
                  <span>{formatINR(fee)}</span>
                )}
              </div>
              {fee > 0 && (
                <p className="text-xs text-ink/45">
                  Add {formatINR(FREE_DELIVERY_FROM - subtotal)} more for free delivery (otherwise{" "}
                  {formatINR(DELIVERY_FEE)}).
                </p>
              )}
              <div className="flex justify-between pt-1 font-display text-lg font-semibold">
                <span>Total</span>
                <span>{formatINR(subtotal + fee)}</span>
              </div>
            </div>
            <button
              onClick={checkout}
              className="mt-4 w-full rounded-full bg-terra px-5 py-3 text-sm font-medium text-cream transition hover:bg-terra/90"
            >
              Checkout
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
