import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { plantsQuery, plantImage, type PlantCategory } from "@/lib/plants";
import { PROS, prosServing, type Pro } from "@/lib/catalog";
import { CITY, useLocality } from "@/lib/localities";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";
import { BookingDialog } from "@/components/BookingDialog";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProAvatar } from "@/components/ProAvatar";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(plantsQuery),
  head: () => ({
    meta: [
      { title: "Roots — Plants, gardeners & grounds services in Bangalore" },
      {
        name: "description",
        content:
          "Shop curated plants and book vetted gardeners, landscape engineers, and exterior home pros across Bangalore.",
      },
      {
        property: "og:title",
        content: "Roots — Plants, gardeners & grounds services in Bangalore",
      },
      {
        property: "og:description",
        content:
          "Shop curated plants and book vetted gardeners, landscape engineers, and exterior home pros across Bangalore.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FILTERS: ("All" | PlantCategory)[] = ["All", "Foliage", "Flowering", "Terrace"];

function Index() {
  const [bookingPro, setBookingPro] = useState<Pro | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [locality, setLocality] = useLocality();
  const { data: plants } = useSuspenseQuery(plantsQuery);
  const cart = useCart();

  const visiblePlants = filter === "All" ? plants : plants.filter((p) => p.category === filter);
  const pros = prosServing(locality);

  return (
    <div className="min-h-screen bg-cream font-body text-ink antialiased selection:bg-sage/20">
      <div className="relative overflow-clip">
        {/* ambient blobs */}
        <div className="animate-drift pointer-events-none absolute -left-32 -top-40 size-[560px] rounded-full bg-sage/25 blur-3xl dark:opacity-50" />
        <div className="animate-drift-reverse pointer-events-none absolute right-[-160px] top-24 size-[520px] rounded-full bg-terra/15 blur-3xl dark:opacity-50" />
        <div className="animate-drift-slow pointer-events-none absolute bottom-0 left-1/3 size-[480px] rounded-full bg-sagelight/40 blur-3xl dark:opacity-50" />

        <SiteHeader />

        <header id="top" className="relative z-20">
          <section className="animate-rise mx-auto max-w-7xl px-6 pb-4 pt-12">
            <p className="mb-4 flex items-center gap-1.5 font-display text-sm italic text-sage">
              <MapPin className="size-3.5" aria-hidden />
              Now growing in {CITY} · grown, potted & tended
            </p>
            <h1 className="max-w-[16ch] text-balance font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
              Plants that <span className="italic text-sage">belong</span>, and hands that keep
              them.
            </h1>
            <p className="mt-6 max-w-[52ch] text-pretty text-lg leading-relaxed text-ink/65">
              Browse a curated wall of living things from Roots and trusted local nurseries, then
              book the gardener, landscaper, or exterior pro who will make them thrive at your home.
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
          <section id="shop" className="scroll-mt-24 pt-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 pb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">
                  The plant wall
                </p>
                <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">
                  In season this week
                </h2>
                <p className="mt-1 text-sm text-ink/55">
                  Delivered anywhere in {CITY} · free over {formatINR(999)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
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

            {visiblePlants.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink/55">
                No {filter.toLowerCase()} plants in stock right now.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                {visiblePlants.map((plant, i) => {
                  const inBag = cart.qtyOf(plant.id);
                  const soldOut = plant.stock <= 0;
                  const atLimit = inBag >= plant.stock;
                  return (
                    <div
                      key={plant.id}
                      className="animate-rise group flex flex-col rounded-2xl border border-ink/5 bg-surface/55 p-3 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-surface/75"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="relative overflow-hidden rounded-xl">
                        {plantImage(plant) ? (
                          <img
                            src={plantImage(plant)}
                            alt={plant.name}
                            loading="lazy"
                            width={1024}
                            height={1024}
                            className="aspect-square w-full bg-sagelight object-cover outline-1 -outline-offset-1 outline-ink/5"
                          />
                        ) : (
                          <div className="grid aspect-square w-full place-items-center bg-sagelight outline-1 -outline-offset-1 outline-ink/5">
                            <span className="font-display text-5xl font-semibold text-sage/60">
                              {plant.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        {plant.tag && (
                          <span className="absolute left-2 top-2 rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-ink/70 backdrop-blur">
                            {plant.tag}
                          </span>
                        )}
                        {soldOut && (
                          <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-cream">
                            Sold out
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 font-display text-lg font-semibold leading-tight">
                        {plant.name}
                      </h3>
                      <p className="text-sm text-ink/55">{plant.tagline}</p>
                      {plant.vendorName && (
                        <p className="mt-0.5 text-xs text-ink/45">Sold by {plant.vendorName}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="font-display text-lg font-semibold">
                          {formatINR(plant.price)}
                        </span>
                        <button
                          onClick={() => cart.add(plant)}
                          disabled={soldOut || atLimit}
                          className="rounded-full border border-ink/10 bg-surface/60 px-3 py-1.5 text-sm font-medium transition hover:border-terra hover:text-terra disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink/10 disabled:hover:text-ink"
                        >
                          {soldOut ? "Sold out" : inBag ? `Add (${inBag})` : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Professionals */}
          <section id="services" className="scroll-mt-24 pt-20">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 pb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">
                  The grounds team
                </p>
                <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">
                  People who keep it alive
                </h2>
                <p className="mt-1 text-sm text-ink/55">
                  {locality
                    ? `${pros.length} of ${PROS.length} experts travel to ${locality}`
                    : `Vetted, insured experts across ${CITY} — choose your area to see who comes to you`}
                </p>
              </div>
              {locality && (
                <button
                  onClick={() => setLocality(null)}
                  className="rounded-full px-3 py-1 text-xs font-medium text-ink/55 transition hover:text-ink"
                >
                  Show all areas
                </button>
              )}
            </div>

            {pros.length === 0 ? (
              <div className="rounded-2xl border border-ink/5 bg-surface/55 p-8 text-center">
                <p className="font-display text-lg font-semibold">No experts in {locality} yet</p>
                <p className="mt-1 text-sm text-ink/55">
                  We're adding new areas every month. See everyone across {CITY}:
                </p>
                <button
                  onClick={() => setLocality(null)}
                  className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90"
                >
                  Show all experts
                </button>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {pros.map((pro, i) => (
                  <div
                    key={pro.id}
                    className="animate-rise flex flex-col rounded-2xl border border-ink/5 bg-surface/55 p-4 backdrop-blur-xl"
                    style={{ animationDelay: `${(i + 1) * 60}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <ProAvatar pro={pro} />
                      <div>
                        <h3 className="font-display text-lg font-semibold leading-tight">
                          {pro.name}
                        </h3>
                        <p className="text-sm text-ink/55">{pro.role}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink/65">{pro.blurb}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-sage/10 px-2.5 py-1 text-xs text-sage">
                        Next: {pro.next}
                      </span>
                      <span className="rounded-full bg-surface/70 px-2.5 py-1 text-xs text-ink/65">
                        {formatINR(pro.rate)}/hr
                      </span>
                      <span className="rounded-full bg-surface/70 px-2.5 py-1 text-xs text-ink/65">
                        ★ {pro.rating.toFixed(1)} ({pro.reviews})
                      </span>
                    </div>
                    <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink/50">
                      <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
                      {pro.areas.join(" · ")}
                    </p>
                    <div className="flex-1" />
                    <button
                      onClick={() => setBookingPro(pro)}
                      className="mt-4 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90"
                    >
                      Book an appointment
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Vendors */}
          <section id="sell" className="scroll-mt-24 pt-16">
            <div className="relative overflow-hidden rounded-3xl border border-ink/5 bg-surface/55 p-6 backdrop-blur-xl sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-terra/15 blur-3xl dark:opacity-50" />
              <div className="relative grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">
                    For nurseries & growers
                  </p>
                  <h2 className="mt-2 max-w-[20ch] text-balance font-display text-3xl font-semibold leading-tight tracking-tight">
                    Sell your plants to homes across {CITY}
                  </h2>
                  <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-ink/65">
                    Register your nursery, upload your plants with photos and prices, and we'll list
                    them once our team has reviewed them. Roots handles the storefront and checkout.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 md:justify-end">
                  <Link
                    to="/vendor"
                    className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90"
                  >
                    Become a vendor
                  </Link>
                  <Link
                    to="/vendor/guidelines"
                    className="rounded-full border border-ink/15 bg-surface/50 px-6 py-3 text-sm font-medium transition hover:border-ink/30"
                  >
                    Read the guidelines
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>

      <BookingDialog pro={bookingPro} onClose={() => setBookingPro(null)} />
    </div>
  );
}
