import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { CITY } from "@/lib/localities";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-ink/5 bg-cream/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
        <Logo size="sm" />
        <p className="max-w-[40ch] text-sm text-ink/55">
          Grown in-house and by trusted local nurseries. Plants & professional grounds services
          across {CITY}.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/55">
          <a href="/#shop" className="transition hover:text-ink">
            Shop
          </a>
          <a href="/#services" className="transition hover:text-ink">
            Grounds
          </a>
          <Link to="/vendor" className="transition hover:text-ink">
            Sell on Roots
          </Link>
          <Link to="/vendor/guidelines" className="transition hover:text-ink">
            Vendor guidelines
          </Link>
          <Link to="/admin" className="transition hover:text-ink">
            Inventory
          </Link>
        </div>
      </div>
    </footer>
  );
}
