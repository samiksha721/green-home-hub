import { Sprout } from "lucide-react";

export const SITE_NAME = "Roots";

export function Logo({ size = "md", tagline = false }: { size?: "sm" | "md"; tagline?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`grid place-items-center rounded-full bg-sage/15 text-sage ${size === "md" ? "size-9" : "size-8"}`}
      >
        <Sprout className={size === "md" ? "size-[18px]" : "size-4"} strokeWidth={2.25} />
      </span>
      <span
        className={`font-display font-semibold tracking-tight ${size === "md" ? "text-xl" : "text-lg"}`}
      >
        {SITE_NAME}
      </span>
      {tagline && (
        <span className="mt-1 hidden font-display text-xs italic text-ink/45 lg:inline">
          greenhouse & grounds
        </span>
      )}
    </span>
  );
}
