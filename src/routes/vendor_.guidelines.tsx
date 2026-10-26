import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Camera,
  Check,
  ClipboardList,
  IndianRupee,
  Leaf,
  Package,
  ShieldCheck,
  X,
} from "lucide-react";
import { CITY } from "@/lib/localities";
import { DELIVERY_FEE, FREE_DELIVERY_FROM, formatINR } from "@/lib/format";
import {
  CARE_TAGS,
  CATEGORIES,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  NAME_MAX,
  PHOTO_MIN_SIDE,
  PHOTO_RECOMMENDED_SIDE,
  PRICE_MAX,
  PRICE_MIN,
  TAGLINE_MAX,
} from "@/lib/vendor-rules";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/vendor_/guidelines")({
  head: () => ({
    meta: [
      { title: "Vendor guidelines — Roots" },
      {
        name: "description",
        content:
          "How to list your plants on Roots: photos, names, descriptions, categories and pricing in rupees for Bangalore nurseries.",
      },
    ],
  }),
  component: Guidelines,
});

const TOC = [
  ["start", "Getting started"],
  ["photos", "Photos"],
  ["details", "Name & description"],
  ["category", "Category & care tags"],
  ["pricing", "Pricing & stock"],
  ["quality", "Quality & packing"],
  ["review", "How review works"],
  ["example", "Example listing"],
] as const;

function Section({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-3xl border border-ink/5 bg-surface/60 p-6 backdrop-blur-xl sm:p-7"
    >
      <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold tracking-tight">
        <span className="grid size-9 place-items-center rounded-full bg-sage/15 text-sage">
          {icon}
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink/75">{children}</div>
    </section>
  );
}

function Do({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Check className="mt-1 size-4 shrink-0 text-sage" aria-label="Do" />
      <span>{children}</span>
    </li>
  );
}

function Dont({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <X className="mt-1 size-4 shrink-0 text-terra" aria-label="Don't" />
      <span>{children}</span>
    </li>
  );
}

function Guidelines() {
  return (
    <PageShell>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-28 space-y-1 text-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-ink/45">
              On this page
            </p>
            {TOC.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="block rounded-lg px-2 py-1 text-ink/60 transition hover:bg-sage/10 hover:text-ink"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <div className="space-y-6">
          <header>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">
              Sell on Roots
            </p>
            <h1 className="mt-1 max-w-[22ch] text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Vendor guidelines
            </h1>
            <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-ink/65">
              Everything you need to list plants on Roots — what to photograph, how to name and
              describe each plant, and how to price it. Listings that follow these guidelines are
              approved faster.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/vendor"
                className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition hover:bg-ink/90"
              >
                Register as a vendor
              </Link>
              <a
                href="#example"
                className="rounded-full border border-ink/15 bg-surface/50 px-6 py-3 text-sm font-medium transition hover:border-ink/30"
              >
                See an example listing
              </a>
            </div>
          </header>

          <Section id="start" icon={<ClipboardList className="size-4" />} title="Getting started">
            <p>
              Roots is launching in {CITY}. Nurseries, growers and plant studios based anywhere in
              the city can apply.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong>Create a Roots account</strong> — with Google, or with your email and a
                username.
              </li>
              <li>
                <strong>Register your business</strong> on the vendor dashboard: business name,
                contact person, mobile number, area in {CITY}, pickup address, and GSTIN if you're
                GST-registered.
              </li>
              <li>
                <strong>Add your plants</strong> — one listing per plant, each with a photo, name,
                description, category, price and stock. You can add listings while your business is
                being reviewed.
              </li>
              <li>
                <strong>Review</strong> — our team checks your business details and each listing.
                You'll see the status of each one on your dashboard.
              </li>
              <li>
                <strong>Go live</strong> — approved plants appear in the shop with "Sold by" and
                your business name.
              </li>
            </ol>
          </Section>

          <Section id="photos" icon={<Camera className="size-4" />} title="Photos">
            <p>
              The photo is what sells the plant. Every listing needs one clear photo of the plant
              you will actually send.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-sage/5 p-4">
                <p className="mb-2 text-sm font-semibold text-sage">Do</p>
                <ul className="space-y-2 text-sm">
                  <Do>Photograph the real plant, in the pot it will be delivered in.</Do>
                  <Do>Use soft daylight — near a window or outdoors in shade. No flash.</Do>
                  <Do>Use a plain, uncluttered background: a wall, a sheet, or a clean floor.</Do>
                  <Do>
                    Fit the whole plant and pot in the frame, centred, with a little space around
                    it.
                  </Do>
                  <Do>
                    Shoot square (1:1), at least {PHOTO_MIN_SIDE}×{PHOTO_MIN_SIDE} pixels —{" "}
                    {PHOTO_RECOMMENDED_SIDE}×{PHOTO_RECOMMENDED_SIDE} or larger is best.
                  </Do>
                </ul>
              </div>
              <div className="rounded-2xl bg-terra/5 p-4">
                <p className="mb-2 text-sm font-semibold text-terra">Don't</p>
                <ul className="space-y-2 text-sm">
                  <Dont>Use stock photos, catalogue images or pictures from other websites.</Dont>
                  <Dont>Add text, prices, logos, watermarks, borders or stickers.</Dont>
                  <Dont>Use heavy filters or editing that changes the leaf colour.</Dont>
                  <Dont>Show several different plants in one photo.</Dont>
                  <Dont>Upload blurry, dark, or tightly cropped photos.</Dont>
                </ul>
              </div>
            </div>
            <p className="text-sm text-ink/60">
              <strong>File format:</strong> JPG, PNG or WebP, up to 5 MB. Phone photos are perfect.
            </p>
          </Section>

          <Section id="details" icon={<Leaf className="size-4" />} title="Name & description">
            <p>
              <strong>Plant name</strong> (up to {NAME_MAX} characters): use the common name
              shoppers search for, with the variety if it matters. Add the botanical name in
              brackets if you know it.
            </p>
            <ul className="space-y-2 text-sm">
              <Do>
                "Snake Plant (Sansevieria trifasciata)", "Money Plant – Golden Pothos", "Areca Palm"
              </Do>
              <Dont>
                "BEST SNAKE PLANT!!! 🌿", "Plant – 6 inch – sale", "Sansevieria" alone with no
                common name
              </Dont>
            </ul>
            <p>
              <strong>Tagline</strong> (up to {TAGLINE_MAX} characters): one short line on why
              someone would want it — e.g. "Thrives on neglect and low light".
            </p>
            <p>
              <strong>Description</strong> ({DESCRIPTION_MIN}–{DESCRIPTION_MAX} characters).
              Include:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>
                Height including the pot, and pot size and material (e.g. "about 45 cm tall in a
                6-inch nursery pot")
              </li>
              <li>Light it needs, and how often to water in Bangalore weather</li>
              <li>Whether it's safe around cats and dogs, if you know</li>
              <li>
                Exactly what's included — the plant only, or with a ceramic pot, saucer or stones
              </li>
            </ul>
          </Section>

          <Section id="category" icon={<Leaf className="size-4" />} title="Category & care tags">
            <p>Choose the one category that fits best — shoppers filter the shop by these:</p>
            <ul className="space-y-2 text-sm">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <strong>{c.id}</strong> — {c.hint}
                </li>
              ))}
            </ul>
            <p>Then pick one care tag, shown on the photo:</p>
            <div className="flex flex-wrap gap-1.5">
              {CARE_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface/80 px-2.5 py-1 text-xs font-medium text-ink/70 ring-1 ring-ink/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Section>

          <Section id="pricing" icon={<IndianRupee className="size-4" />} title="Pricing & stock">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Prices are in <strong>Indian rupees, whole numbers only</strong> (₹649, not
                ₹649.50), between {formatINR(PRICE_MIN)} and {formatINR(PRICE_MAX)}.
              </li>
              <li>
                Enter the <strong>final price the shopper pays</strong> for exactly what's described
                — including the pot if it's included, and any taxes that apply to you. Don't add
                separate packing or handling charges.
              </li>
              <li>
                Delivery is charged by Roots at checkout: free on orders of{" "}
                {formatINR(FREE_DELIVERY_FROM)} or more, otherwise {formatINR(DELIVERY_FEE)}. Don't
                include delivery in your price.
              </li>
              <li>
                <strong>Stock</strong> is how many of this plant you can send right now. It goes
                down automatically with each order; set it to 0 when you run out and the plant shows
                as sold out.
              </li>
              <li>
                You can change price or stock at any time. A changed listing goes back for a quick
                review before it shows again.
              </li>
            </ul>
          </Section>

          <Section id="quality" icon={<Package className="size-4" />} title="Quality & packing">
            <ul className="space-y-2 text-sm">
              <Do>Send healthy, pest-free plants that match the photo and description.</Do>
              <Do>
                Water a day before dispatch, secure the soil, and wrap the pot so it can't tip or
                spill.
              </Do>
              <Do>Keep orders ready for pickup at the address on your vendor profile.</Do>
              <Dont>List protected or endangered species, or plants collected from the wild.</Dont>
              <Dont>List plants treated with banned pesticides.</Dont>
              <Dont>List seeds, cuttings or bulbs as if they were grown plants.</Dont>
            </ul>
          </Section>

          <Section id="review" icon={<ShieldCheck className="size-4" />} title="How review works">
            <p>Every new or edited listing is checked before it appears in the shop. We look at:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>A real, clear photo that follows the photo guidelines</li>
              <li>An accurate name, a helpful description, and the right category</li>
              <li>A sensible rupee price and real stock</li>
            </ul>
            <p>
              If something needs fixing, the listing is marked <strong>Needs changes</strong> with a
              note explaining why. Edit it and it goes back for review automatically.
            </p>
          </Section>

          <Section id="example" icon={<Check className="size-4" />} title="Example listing">
            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
              <div className="grid aspect-square place-items-center rounded-2xl bg-sagelight text-center text-xs text-ink/50">
                Square daylight photo
                <br />
                of the plant in its pot
              </div>
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-ink/50">Name</dt>
                <dd className="font-medium">Snake Plant (Sansevieria trifasciata)</dd>
                <dt className="text-ink/50">Tagline</dt>
                <dd>Thrives on neglect and low light</dd>
                <dt className="text-ink/50">Category</dt>
                <dd>Foliage</dd>
                <dt className="text-ink/50">Care tag</dt>
                <dd>Low light</dd>
                <dt className="text-ink/50">Price</dt>
                <dd>{formatINR(449)}</dd>
                <dt className="text-ink/50">Stock</dt>
                <dd>15</dd>
                <dt className="text-ink/50">Description</dt>
                <dd className="text-ink/70">
                  About 40 cm tall in a 6-inch white plastic nursery pot. Happy in low to bright
                  indirect light; water every 2–3 weeks, less in the monsoon. Mildly toxic to pets
                  if chewed. Plant and nursery pot only.
                </dd>
              </dl>
            </div>
          </Section>

          <div className="rounded-3xl bg-ink p-6 text-cream sm:p-8">
            <h2 className="font-display text-2xl font-semibold">Ready to list your plants?</h2>
            <p className="mt-2 max-w-[52ch] text-sm text-cream/75">
              Register your business and add your first listing in a few minutes.
            </p>
            <Link
              to="/vendor"
              className="mt-5 inline-block rounded-full bg-cream px-6 py-3 text-sm font-medium text-ink transition hover:bg-cream/90"
            >
              Go to the vendor dashboard
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
