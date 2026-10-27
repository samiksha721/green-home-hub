import { ChevronDown, MapPin } from "lucide-react";
import { CITY, LOCALITY_NAMES, isLocality, useLocality } from "@/lib/localities";

/** Pill showing the shopper's Bangalore area; a native select underneath keeps it easy on phones. */
export function LocalityPicker({ compact = false }: { compact?: boolean }) {
  const [locality, setLocality] = useLocality();

  return (
    <label
      className="relative flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/10 bg-surface/60 px-3 py-2 text-sm transition hover:border-ink/25 focus-within:ring-2 focus-within:ring-sage/30"
      title={`Delivering in ${CITY}`}
    >
      <MapPin className="size-4 shrink-0 text-terra" aria-hidden />
      <span
        className={`truncate ${compact ? "max-w-[13ch]" : "max-w-[14ch]"} ${locality ? "font-medium" : "text-ink/60"}`}
      >
        {locality ?? "Choose area"}
      </span>
      <ChevronDown className="size-3.5 shrink-0 text-ink/45" aria-hidden />
      <select
        aria-label={`Your area in ${CITY}`}
        value={locality ?? ""}
        onChange={(e) => setLocality(isLocality(e.target.value) ? e.target.value : null)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="">All of {CITY}</option>
        {LOCALITY_NAMES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
