import { initials, type Pro } from "@/lib/catalog";

export function ProAvatar({ pro, size = "md" }: { pro: Pro; size?: "sm" | "md" }) {
  const box = size === "md" ? "size-14 text-lg" : "size-12 text-base";
  if (pro.image) {
    return (
      <img
        src={pro.image}
        alt={pro.name}
        loading="lazy"
        width={1024}
        height={1024}
        className={`${box} shrink-0 rounded-full border border-ink/5 object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${box} grid shrink-0 place-items-center rounded-full border border-ink/5 bg-sage/15 font-display font-semibold text-sage`}
    >
      {initials(pro.name)}
    </span>
  );
}
