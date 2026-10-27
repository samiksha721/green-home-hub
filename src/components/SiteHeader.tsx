import { Link } from "@tanstack/react-router";
import { ChevronDown, LogOut, Package, Store, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { firstName, useSessionUser } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocalityPicker } from "@/components/LocalityPicker";
import { openSignIn } from "@/components/AuthSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  ["/#shop", "Shop plants"],
  ["/#services", "Grounds"],
  ["/vendor", "Sell on Roots"],
] as const;

/** Floating header shared by every shopper-facing page. */
export function SiteHeader({ showBag = true }: { showBag?: boolean }) {
  const { user } = useSessionUser();
  const { count, setOpen } = useCart();

  return (
    <div className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-full border border-ink/10 bg-surface/85 py-2 pl-2.5 pr-2 shadow-lg shadow-ink/5 backdrop-blur-xl">
        <Link to="/" className="shrink-0 rounded-full pr-1" aria-label="Roots home">
          <Logo tagline />
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {NAV.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3.5 py-1.5 text-sm text-ink/65 transition hover:bg-sage/10 hover:text-ink"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <div className="hidden sm:block">
            <LocalityPicker />
          </div>
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 rounded-full px-2.5 py-2 text-sm font-medium transition hover:bg-sage/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/30">
                <UserIcon className="size-4 sm:hidden" aria-hidden />
                <span className="hidden max-w-[12ch] truncate sm:inline">{firstName(user)}</span>
                <ChevronDown className="size-3.5 text-ink/45" aria-hidden />
                <span className="sr-only">Account menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-44 rounded-2xl border-ink/10 bg-popover p-1.5"
              >
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link to="/orders">
                    <Package /> My orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link to="/vendor">
                    <Store /> Vendor dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-xl" onSelect={() => supabase.auth.signOut()}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={() => openSignIn()}
              className="rounded-full px-3 py-2 text-sm text-ink/65 transition hover:text-ink"
            >
              Sign in
            </button>
          )}
          {showBag && (
            <button
              onClick={() => setOpen(true)}
              className="relative shrink-0 rounded-full border border-ink/10 bg-surface/60 px-4 py-2 text-sm font-medium backdrop-blur-md transition hover:border-ink/20"
            >
              Bag
              {count > 0 && (
                <span className="ml-1.5 inline-grid size-5 place-items-center rounded-full bg-terra text-[11px] font-semibold text-cream">
                  {count}
                </span>
              )}
            </button>
          )}
        </div>
      </nav>
      {/* Phones: area picker sits under the bar */}
      <div className="mx-auto mt-2 flex max-w-7xl sm:hidden">
        <LocalityPicker compact />
      </div>
    </div>
  );
}
