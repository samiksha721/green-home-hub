import { ChevronDown, MapPin } from "lucide-react";
import { CITY, openLocationSheet, useLocality } from "@/lib/localities";

/** "Delivering to · Koramangala ▾" — opens the location sheet, quick-commerce style. */
export function LocalityPicker({ compact = false }: { compact?: boolean }) {
  const [locality] = useLocality();

  return (
    <button
      type="button"
      onClick={openLocationSheet}
      className="flex min-w-0 items-center gap-1.5 rounded-full border border-ink/10 bg-surface/60 px-3 py-1.5 text-left transition hover:border-ink/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/30"
      aria-label={
        locality ? `Delivering to ${locality}. Change area` : `Choose your area in ${CITY}`
      }
    >
      <MapPin className="size-4 shrink-0 text-terra" aria-hidden />
      <span className="min-w-0 leading-tight">
        {!compact && (
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-ink/45">
            {locality ? "Delivering to" : CITY}
          </span>
        )}
        <span
          className={`block truncate text-sm ${compact ? "max-w-[18ch]" : "max-w-[14ch]"} ${locality ? "font-semibold" : "text-ink/65"}`}
        >
          {locality ?? "Choose area"}
        </span>
      </span>
      <ChevronDown className="size-3.5 shrink-0 text-ink/45" aria-hidden />
    </button>
  );
}
