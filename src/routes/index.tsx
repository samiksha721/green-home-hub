import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PLANTS, PROS, type Plant, type PlantCategory, type Pro } from "@/lib/catalog";
import { CartDrawer } from "@/components/CartDrawer";
import { BookingDialog } from "@/components/BookingDialog";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cormorant — Plants, gardeners & grounds services" },
      {
        name: "description",
        content:
          "Shop curated plants and book vetted gardeners, landscape engineers, and exterior home pros — all on one account.",
      },
      { property: "og:title", content: "Cormorant — Plants, gardeners & grounds services" },
      {
        property: "og:description",
        content:
          "Shop curated plants and book vetted gardeners, landscape engineers, and exterior home pros — all on one account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FILTERS: ("All" | PlantCategory)[] = ["All", "Foliage", "Flowering", "Terrace"];

function Index() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [bookingPro, setBookingPro] = useState<Pro | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.trim().split(/\s+/)[0] || user?.email || "";

  const cartCount = Object.values(cart).reduce((n, q) => n + q, 0);
  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ plant: PLANTS.find((p) => p.id === id)!, qty }))
        .filter((i) => i.plant && i.qty > 0),
    [cart],
  );

  const addPlant = (plant: Plant) => {
    setCart((c) => ({ ...c, [plant.id]: (c[plant.id] ?? 0) + 1 }));
  };

  const updateQty = (id: string, delta: number) => {
    setCart((c) => {
      const qty = Math.max(0, (c[id] ?? 0) + delta);
      const next = { ...c, [id]: qty };
      if (qty === 0) delete next[id];
      return next;
    });
  };

  const visiblePlants = filter === "All" ? PLANTS : PLANTS.filter((p) => p.category === filter);

  return (
    <div className="min-h-screen bg-cream font-body text-ink antialiased selection:bg-sage/20">
      <div className="relative overflow-hidden">
        {/* ambient blobs */}
        <div className="animate-drift pointer-events-none absolute -left-32 -top-40 size-[560px] rounded-full bg-sage/25 blur-3xl dark:opacity-50" />
        <div className="animate-drift-reverse pointer-events-none absolute right-[-160px] top-24 size-[520px] rounded-full bg-terra/15 blur-3xl dark:opacity-50" />
        <div className="animate-drift-slow pointer-events-none absolute bottom-0 left-1/3 size-[480px] rounded-full bg-sagelight/40 blur-3xl dark:opacity-50" />

        <header className="relative z-20">
          <nav className="border-b border-ink/5 bg-cream/60 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-sage/15 font-display text-lg font-semibold text-sage">
                  C
                </span>
                <span className="font-display text-xl font-semibold tracking-tight">Cormorant</span>
                <span className="mt-1 hidden font-display text-xs italic text-ink/45 sm:inline">
                  greenhouse & grounds
                </span>
              </div>
              <div className="hidden items-center gap-1 rounded-full border border-ink/5 bg-surface/50 p-1 backdrop-blur-md md:flex">
                <a
                  href="#shop"
                  className="rounded-full bg-surface/70 px-4 py-1.5 text-sm font-medium text-ink shadow-sm ring-1 ring-ink/5"
                >
                  Shop plants
                </a>
                <a href="#services" className="rounded-full px-4 py-1.5 text-sm text-ink/60 transition hover:text-ink">
                  Grounds
                </a>
                <a href="#booking" className="rounded-full px-4 py-1.5 text-sm text-ink/60 transition hover:text-ink">
                  Book a visit
                </a>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                {user ? (
                  <>
                    <span className="hidden max-w-[16ch] truncate px-1 text-sm font-medium text-ink sm:block">
                      {firstName}
                    </span>
                    <button
                      onClick={() => supabase.auth.signOut()}
                      className="hidden rounded-full px-3 py-1.5 text-sm text-ink/60 transition hover:text-ink sm:block"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="hidden rounded-full px-3 py-1.5 text-sm text-ink/60 transition hover:text-ink sm:block"
                  >
                    Sign in
                  </Link>
                )}
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative rounded-full border border-ink/10 bg-surface/60 px-4 py-2 text-sm font-medium backdrop-blur-md transition hover:border-ink/20"
                >
                  Bag
                  {cartCount > 0 && (
                    <span className="ml-1.5 inline-grid size-5 place-items-center rounded-full bg-terra text-[11px] font-semibold text-cream">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </nav>

          <section className="animate-rise mx-auto max-w-7xl px-6 pb-4 pt-14">
            <p className="mb-4 font-display text-sm italic text-sage">
              A living ledger · est. 2014 · grown, potted & tended
            </p>
            <h1 className="max-w-[16ch] text-balance font-display text-6xl font-semibold leading-[0.95] tracking-tight sm:text-7xl">
              Plants that <span className="italic text-sage">belong</span>, and hands that keep them.
            </h1>
            <p className="mt-6 max-w-[52ch] text-pretty text-lg leading-relaxed text-ink/65">
              Browse a curated wall of living things, then book the gardener, landscaper, or exterior pro who will make
              them thrive at your home.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#shop"
                className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90"
              >
                Shop the greenhouse
              </a>
              <a
                href="#services"
                className="rounded-full border border-ink/15 bg-surface/50 px-6 py-3 text-sm font-medium backdrop-blur-md transition hover:border-ink/30"
              >
                Book an expert
              </a>
            </div>
          </section>
        </header>

        <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
          {/* Plant shop */}
          <section id="shop" className="scroll-mt-6 pt-10">
            <div className="mb-6 flex items-end justify-between border-b border-ink/10 pb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">The plant wall</p>
                <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">In season this week</h2>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      filter === f ? "bg-sage/10 text-sage" : "text-ink/50 hover:text-ink"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {visiblePlants.map((plant, i) => (
                <div
                  key={plant.id}
                  className="animate-rise group rounded-2xl border border-ink/5 bg-surface/55 p-3 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-surface/75"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="relative overflow-hidden rounded-xl">
                    <img
                      src={plant.image}
                      alt={plant.name}
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="aspect-square w-full bg-sagelight object-cover outline-1 -outline-offset-1 outline-ink/5"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-ink/70 backdrop-blur">
                      {plant.tag}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold leading-tight">{plant.name}</h3>
                  <p className="text-sm text-ink/50">{plant.tagline}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-display text-lg font-semibold">${plant.price}</span>
                    <button
                      onClick={() => addPlant(plant)}
                      className="rounded-full border border-ink/10 bg-surface/60 px-3 py-1.5 text-sm font-medium transition hover:border-terra hover:text-terra"
                    >
                      {cart[plant.id] ? `Add (${cart[plant.id]})` : "Add"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Professionals */}
          <section id="services" className="scroll-mt-6 pt-20">
            <div className="mb-6 flex items-end justify-between border-b border-ink/10 pb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">The grounds team</p>
                <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">People who keep it alive</h2>
              </div>
              <p className="hidden max-w-[28ch] text-sm text-ink/55 md:block">
                Every expert is vetted, insured, and rated by homeowners within a 30-mile radius.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {PROS.map((pro, i) => (
                <div
                  key={pro.id}
                  className="animate-rise flex flex-col rounded-2xl border border-ink/5 bg-surface/55 p-4 backdrop-blur-xl"
                  style={{ animationDelay: `${(i + 1) * 60}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={pro.image}
                      alt={pro.name}
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="size-14 shrink-0 rounded-full border border-ink/5 object-cover"
                    />
                    <div>
                      <h3 className="font-display text-lg font-semibold leading-tight">{pro.name}</h3>
                      <p className="text-sm text-ink/50">{pro.role}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink/60">{pro.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-sage/10 px-2.5 py-1 text-xs text-sage">Next: {pro.next}</span>
                    <span className="rounded-full bg-surface/70 px-2.5 py-1 text-xs text-ink/60">${pro.rate}/hr</span>
                    <span className="rounded-full bg-surface/70 px-2.5 py-1 text-xs text-ink/60">
                      {pro.rating} ({pro.reviews})
                    </span>
                  </div>
                  <button
                    onClick={() => setBookingPro(pro)}
                    className="mt-4 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90"
                  >
                    Book an appointment
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Booking flow explainer */}
          <section id="booking" className="scroll-mt-6 pt-16">
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative overflow-hidden rounded-3xl border border-ink/5 bg-surface/50 p-6 backdrop-blur-xl">
                <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-terra/15 blur-3xl dark:opacity-50" />
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">Booking flow</p>
                <h2 className="mt-2 max-w-[18ch] text-balance font-display text-3xl font-semibold leading-tight tracking-tight">
                  Pick a time in thirty seconds
                </h2>
                <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-ink/60">
                  Choose what you need, a pro, and a slot that fits. We hold your spot and confirm by text.
                </p>
                <ol className="mt-6 space-y-3">
                  {["Choose your service", "Match a nearby expert", "Confirm & get reminders"].map((step, i) => (
                    <li key={step} className="flex items-center gap-3 text-sm">
                      <span className="grid size-6 place-items-center rounded-full bg-sage/15 font-display text-xs font-semibold text-sage">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-3xl border border-ink/5 bg-surface/70 p-5 ring-1 ring-ink/5 backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">Start a booking</p>
                  <span className="rounded-full bg-sage/10 px-2.5 py-1 text-xs font-medium text-sage">
                    Next openings this week
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink/60">
                  Pick any professional above to open live availability — service, day, time, and address in one sheet.
                </p>
                <div className="mt-4 space-y-2.5">
                  {PROS.map((pro) => (
                    <button
                      key={pro.id}
                      onClick={() => setBookingPro(pro)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-sagelight/50 p-3 text-left transition hover:bg-sagelight"
                    >
                      <img
                        src={pro.image}
                        alt={pro.name}
                        loading="lazy"
                        width={1024}
                        height={1024}
                        className="size-12 shrink-0 rounded-full border border-ink/5 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-semibold leading-tight">{pro.name}</p>
                        <p className="truncate text-sm text-ink/55">
                          {pro.role} · ${pro.rate}/hr
                        </p>
                      </div>
                      <span className="rounded-full bg-sage/10 px-2.5 py-1 text-xs font-medium text-sage">
                        {pro.next}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="relative z-10 border-t border-ink/5 bg-cream/40 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-sage/15 font-display font-semibold text-sage">
                C
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">Cormorant</span>
            </div>
            <p className="max-w-[40ch] text-sm text-ink/55">
              Grown in-house, planted with care. Plants & professional grounds services, on one account.
            </p>
            <div className="flex gap-5 text-sm text-ink/55">
              <a href="#shop" className="transition hover:text-ink">
                Shop
              </a>
              <a href="#services" className="transition hover:text-ink">
                Grounds
              </a>
              <a href="#booking" className="transition hover:text-ink">
                Book a visit
              </a>
            </div>
          </div>
        </footer>
      </div>

      <CartDrawer
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onUpdateQty={updateQty}
        onCheckout={() => setCartOpen(false)}
      />
      <BookingDialog pro={bookingPro} onClose={() => setBookingPro(null)} />
    </div>
  );
}
