import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Check, MapPin, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fullName, useSessionUser } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { deliversTo, plantsQuery } from "@/lib/plants";
import { deliveryFee, formatINR, FREE_DELIVERY_FROM } from "@/lib/format";
import { CITY, openLocationSheet, pincodeFor, storedLocality, useLocality } from "@/lib/localities";
import { PageShell, inputClass } from "@/components/PageShell";
import { openSignIn } from "@/components/AuthSheet";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Roots" },
      { name: "description", content: "Review your bag and choose delivery in Bangalore." },
    ],
  }),
  component: Checkout,
});

type Payment = "cod" | "upi_on_delivery";

const PAYMENTS: { id: Payment; title: string; body: string; icon: typeof Banknote }[] = [
  {
    id: "cod",
    title: "Cash on delivery",
    body: "Pay in cash when your plants arrive.",
    icon: Banknote,
  },
  {
    id: "upi_on_delivery",
    title: "UPI on delivery",
    body: "Scan the delivery partner's QR with GPay, PhonePe, Paytm or any UPI app.",
    icon: Smartphone,
  },
];

interface PlacedOrder {
  orderNumber: string;
  total: number;
  payment: Payment;
  locality: string;
}

function Checkout() {
  const { user, ready } = useSessionUser();
  const cart = useCart();
  const queryClient = useQueryClient();
  const { data: plants } = useQuery(plantsQuery);
  // The delivery area is the shopper's chosen area; "Change" reopens the location sheet.
  const [area] = useLocality();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<Payment>("cod");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  useEffect(() => {
    if (user && !name) setName(fullName(user));
    // Only prefill once the user is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fill the PIN for the area unless the shopper typed their own.
  const [autoPin, setAutoPin] = useState("");
  useEffect(() => {
    if (!area) return;
    setPincode((p) => (!p || p === autoPin ? pincodeFor(area) : p));
    setAutoPin(pincodeFor(area));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area]);

  // Quick-commerce flow: ask for the area, then sign-in, right here on the checkout page.
  useEffect(() => {
    if (!ready) return;
    if (!storedLocality()) openLocationSheet();
    else if (!user) openSignIn("to place your order. Your bag is saved.");
    // Only when the page first knows who's here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Reconcile the bag with live prices and stock.
  const lines = useMemo(
    () =>
      cart.lines.map((line) => {
        const live = plants?.find((p) => p.id === line.id);
        return {
          ...line,
          price: live?.price ?? line.price,
          available: plants ? Boolean(live) : true,
          stock: live?.stock ?? Infinity,
          deliverable: deliversTo(live ?? line, area),
        };
      }),
    [cart.lines, plants, area],
  );
  const unavailable = lines.filter((l) => !l.available || !l.deliverable);
  const overStock = lines.filter((l) => l.available && l.qty > l.stock);
  const subtotal = lines
    .filter((l) => l.available && l.deliverable)
    .reduce((s, l) => s + l.price * l.qty, 0);
  const fee = deliveryFee(subtotal);

  const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  const errors = {
    name: name.trim().length < 2 ? "Enter the name for delivery" : "",
    phone: /^[6-9]\d{9}$/.test(digits) ? "" : "Enter a 10-digit mobile number",
    address: address.trim().length < 5 ? "Enter your flat / house number and street" : "",
    area: area ? "" : `Choose your area in ${CITY}`,
    pincode: /^560\d{3}$/.test(pincode) ? "" : "Bangalore PIN codes start with 560",
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const placeOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user) return openSignIn("to place your order. Your bag is saved.");
    setSubmitted(true);
    if (hasErrors || unavailable.length || overStock.length || !lines.length) return;
    setPending(true);
    const { data, error: rpcError } = await supabase.rpc("place_order", {
      p_items: lines.map((l) => ({ plant_id: l.id, quantity: l.qty })),
      p_contact_name: name.trim(),
      p_phone: digits,
      p_address: address.trim(),
      p_locality: area ?? "",
      p_pincode: pincode,
      p_notes: notes.trim(),
      p_payment: payment,
    });
    setPending(false);
    if (rpcError) {
      // Stock may have changed since the page loaded.
      void queryClient.invalidateQueries({ queryKey: plantsQuery.queryKey });
      return setError(rpcError.message);
    }
    const order = data as { order_number: string; total: number };
    cart.clear();
    void queryClient.invalidateQueries({ queryKey: plantsQuery.queryKey });
    setPlaced({
      orderNumber: order.order_number,
      total: Number(order.total),
      payment,
      locality: area ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (placed) {
    return (
      <PageShell>
        <div className="animate-rise mx-auto max-w-lg rounded-3xl border border-ink/5 bg-surface/70 p-8 text-center shadow-xl ring-1 ring-ink/5 backdrop-blur-2xl">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-sage/15 text-sage">
            <Check className="size-6" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Order placed</h1>
          <p className="mt-2 text-sm text-ink/60">
            Order <span className="font-semibold text-ink">{placed.orderNumber}</span> is on its way
            to {placed.locality}. We'll call you to confirm a delivery slot.
          </p>
          <div className="mt-6 rounded-2xl bg-sagelight/50 p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-ink/60">Total</span>
              <span className="font-display text-lg font-semibold">{formatINR(placed.total)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-ink/60">Payment</span>
              <span>{PAYMENTS.find((p) => p.id === placed.payment)?.title}</span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/orders"
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90"
            >
              View my orders
            </Link>
            <Link
              to="/"
              className="rounded-full border border-ink/15 bg-surface/50 px-6 py-3 text-sm font-medium transition hover:border-ink/30"
            >
              Keep shopping
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!cart.lines.length) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md rounded-3xl border border-ink/5 bg-surface/70 p-8 text-center backdrop-blur-2xl">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Your bag is empty</h1>
          <p className="mt-2 text-sm text-ink/60">Add a few plants from the greenhouse first.</p>
          <a
            href="/#shop"
            className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90"
          >
            Browse plants
          </a>
        </div>
      </PageShell>
    );
  }

  const fieldError = (key: keyof typeof errors) =>
    submitted && errors[key] ? <p className="mt-1 text-xs text-terra">{errors[key]}</p> : null;

  return (
    <PageShell>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">Checkout</p>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
        Delivery & payment
      </h1>

      <form onSubmit={placeOrder} noValidate className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-ink/5 bg-surface/60 p-6 backdrop-blur-xl">
            <h2 className="font-display text-xl font-semibold">Deliver to</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Full name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  aria-invalid={submitted && !!errors.name}
                  className={inputClass}
                />
                {fieldError("name")}
              </label>
              <label className="block">
                <span className="text-sm font-medium">Mobile number</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 mt-[3px] -translate-y-1/2 text-sm text-ink/50">
                    +91
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="98765 43210"
                    maxLength={14}
                    aria-invalid={submitted && !!errors.phone}
                    className={`${inputClass} pl-11`}
                  />
                </div>
                {fieldError("phone")}
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium">Address</span>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                  rows={2}
                  maxLength={240}
                  placeholder="Flat / house no., building, street, landmark"
                  aria-invalid={submitted && !!errors.address}
                  className={`${inputClass} resize-none`}
                />
                {fieldError("address")}
              </label>
              <div className="block">
                <span className="text-sm font-medium">Area</span>
                <button
                  type="button"
                  onClick={openLocationSheet}
                  aria-invalid={submitted && !!errors.area}
                  className={`${inputClass} flex items-center justify-between gap-2 text-left`}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 text-terra" aria-hidden />
                    {area ?? <span className="text-ink/40">Choose your area</span>}
                  </span>
                  <span className="text-xs font-medium text-terra">
                    {area ? "Change" : "Choose"}
                  </span>
                </button>
                {fieldError("area")}
              </div>
              <label className="block">
                <span className="text-sm font-medium">PIN code</span>
                <input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="560034"
                  aria-invalid={submitted && !!errors.pincode}
                  className={inputClass}
                />
                {fieldError("pincode")}
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium">
                  Delivery notes <span className="font-normal text-ink/45">(optional)</span>
                </span>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={200}
                  placeholder="Gate code, best time to call, leave with security…"
                  className={inputClass}
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-ink/45">We currently deliver within {CITY} only.</p>
          </section>

          <section className="rounded-3xl border border-ink/5 bg-surface/60 p-6 backdrop-blur-xl">
            <h2 className="font-display text-xl font-semibold">Payment</h2>
            <div
              className="mt-4 grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Payment method"
            >
              {PAYMENTS.map(({ id, title, body, icon: Icon }) => (
                <label
                  key={id}
                  className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                    payment === id
                      ? "border-sage bg-sage/10 ring-2 ring-sage/20"
                      : "border-ink/10 bg-surface/50 hover:border-ink/25"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={id}
                    checked={payment === id}
                    onChange={() => setPayment(id)}
                    className="sr-only"
                  />
                  <Icon className="mt-0.5 size-5 shrink-0 text-sage" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">{body}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-3xl border border-ink/5 bg-surface/75 p-6 shadow-xl ring-1 ring-ink/5 backdrop-blur-2xl lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3">
                {line.image ? (
                  <img
                    src={line.image}
                    alt=""
                    className="size-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sagelight font-display font-semibold text-sage/60">
                    {line.name.charAt(0)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-ink/50">
                    {line.qty} × {formatINR(line.price)}
                    {line.vendorName && ` · ${line.vendorName}`}
                  </p>
                  {!line.available && (
                    <p className="text-xs text-terra">No longer available — please remove it.</p>
                  )}
                  {line.available && !line.deliverable && (
                    <p className="text-xs text-terra">
                      Not delivered to {area} — remove it or change your area.
                    </p>
                  )}
                  {line.available && line.qty > line.stock && (
                    <p className="text-xs text-terra">
                      Only {line.stock} left — please reduce the quantity.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 rounded-full border border-ink/10 px-1.5 text-sm">
                  <button
                    type="button"
                    onClick={() => cart.updateQty(line.id, -1)}
                    className="px-1 text-ink/60 hover:text-terra"
                    aria-label={`Remove one ${line.name}`}
                  >
                    −
                  </button>
                  <span className="min-w-3 text-center">{line.qty}</span>
                  <button
                    type="button"
                    onClick={() => cart.updateQty(line.id, 1)}
                    disabled={!line.available || line.qty >= line.stock}
                    className="px-1 text-ink/60 hover:text-sage disabled:opacity-30"
                    aria-label={`Add one ${line.name}`}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-1.5 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between text-ink/60">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink/60">
              <span>Delivery</span>
              {fee === 0 ? <span className="text-sage">Free</span> : <span>{formatINR(fee)}</span>}
            </div>
            {fee > 0 && (
              <p className="text-xs text-ink/45">
                Free delivery on orders over {formatINR(FREE_DELIVERY_FROM)}.
              </p>
            )}
            <div className="flex justify-between pt-1 font-display text-xl font-semibold">
              <span>Total</span>
              <span>{formatINR(subtotal + fee)}</span>
            </div>
          </div>

          {submitted && hasErrors && (
            <p className="mt-4 text-xs text-terra">
              Please complete the highlighted delivery details.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-terra/10 px-3 py-2 text-sm text-terra">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={
              pending ||
              !ready ||
              (Boolean(user) && (unavailable.length > 0 || overStock.length > 0))
            }
            className="mt-5 w-full rounded-full bg-terra px-5 py-3.5 text-sm font-semibold text-cream transition hover:bg-terra/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Placing your order…"
              : user
                ? `Place order · ${formatINR(subtotal + fee)}`
                : "Sign in to place order"}
          </button>
        </aside>
      </form>
    </PageShell>
  );
}
