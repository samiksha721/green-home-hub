import { useEffect, useRef, useState } from "react";
import { Crosshair, MapPin, Search, X } from "lucide-react";
import {
  CITY,
  LOCALITY_NAMES,
  localityForPincode,
  nearestLocality,
  onOpenLocationSheet,
  useLocality,
  type Locality,
} from "@/lib/localities";

const SKIPPED_KEY = "roots-location-skipped";

/** Whether the shopper chose "just browsing" earlier in this visit. */
export function locationSkipped(): boolean {
  try {
    return sessionStorage.getItem(SKIPPED_KEY) === "1";
  } catch {
    return false;
  }
}

type Locate =
  | { state: "idle" }
  | { state: "locating" }
  | { state: "denied" }
  | { state: "unavailable" }
  | { state: "far"; nearest: Locality; km: number };

/**
 * "Where should we deliver?" — quick-commerce style location step. Rendered once at the app root
 * and opened with openLocationSheet(); never blocks browsing.
 */
export function LocationSheet() {
  const [open, setOpen] = useState(false);
  const [locality, setLocality] = useLocality();
  const [query, setQuery] = useState("");
  const [pin, setPin] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [locate, setLocate] = useState<Locate>({ state: "idle" });
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      onOpenLocationSheet(() => {
        setQuery("");
        setPin("");
        setPinMessage("");
        setLocate({ state: "idle" });
        setOpen(true);
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const choose = (name: Locality) => {
    setLocality(name);
    setOpen(false);
  };

  const skip = () => {
    try {
      sessionStorage.setItem(SKIPPED_KEY, "1");
    } catch {
      // storage unavailable: we may ask again on the next page
    }
    setOpen(false);
  };

  const detect = () => {
    if (!("geolocation" in navigator)) return setLocate({ state: "unavailable" });
    setLocate({ state: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const match = nearestLocality(pos.coords.latitude, pos.coords.longitude);
        if (match.inRange) choose(match.name);
        else setLocate({ state: "far", nearest: match.name, km: Math.round(match.km) });
      },
      (err) => setLocate({ state: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const checkPin = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setPin(digits);
    setPinMessage("");
    if (digits.length < 6) return;
    const match = localityForPincode(digits);
    if (match) return choose(match);
    setPinMessage(
      digits.startsWith("560")
        ? "We don't deliver to that PIN code yet. Pick the nearest area below."
        : `We only deliver in ${CITY} right now.`,
    );
  };

  if (!open) return null;

  const areas = LOCALITY_NAMES.filter((n) => n.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm dark:bg-black/60"
        onClick={skip}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-title"
        className="animate-rise relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-ink/5 bg-cream shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 px-6 pb-2 pt-6">
          <div>
            <h2 id="location-title" className="font-display text-2xl font-semibold tracking-tight">
              Where should we deliver?
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              We're launching in {CITY}. Your area decides which plants and experts you'll see.
            </p>
          </div>
          <button
            onClick={skip}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-ink/10 bg-surface/60 transition hover:border-ink/30"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6">
          <button
            ref={firstButton}
            onClick={detect}
            disabled={locate.state === "locating"}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-sage/30 bg-sage/10 px-4 py-3.5 text-left transition hover:bg-sage/15 disabled:cursor-wait"
          >
            <Crosshair className="size-5 shrink-0 text-sage" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-sage">
                {locate.state === "locating" ? "Finding you…" : "Use my current location"}
              </span>
              <span className="block text-xs text-ink/55">
                Your browser will ask for permission
              </span>
            </span>
          </button>
          {locate.state === "denied" && (
            <p className="mt-2 text-xs text-terra">
              Location access is turned off for this site. Enter your PIN code or pick your area
              instead.
            </p>
          )}
          {locate.state === "unavailable" && (
            <p className="mt-2 text-xs text-terra">
              We couldn't get your location. Enter your PIN code or pick your area instead.
            </p>
          )}
          {locate.state === "far" && (
            <div className="mt-2 rounded-xl bg-terra/10 px-3 py-2 text-xs text-ink/70">
              <p className="font-medium text-terra">We don't deliver to your location yet.</p>
              <p className="mt-0.5">
                The nearest area we serve is {locate.nearest}, about {locate.km} km away.{" "}
                <button
                  onClick={() => choose(locate.nearest)}
                  className="font-medium text-terra underline"
                >
                  Use {locate.nearest}
                </button>{" "}
                or keep browsing.
              </p>
            </div>
          )}

          <label className="mt-5 block">
            <span className="text-sm font-medium">PIN code</span>
            <input
              value={pin}
              onChange={(e) => checkPin(e.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="e.g. 560034"
              className="mt-1.5 w-full rounded-xl border border-ink/10 bg-surface/60 px-3 py-2.5 text-sm outline-none transition placeholder:text-ink/35 focus:border-sage focus:ring-2 focus:ring-sage/20"
            />
            {pinMessage && <span className="mt-1 block text-xs text-terra">{pinMessage}</span>}
          </label>

          <div className="mt-5">
            <span className="text-sm font-medium">Or choose your area</span>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search areas"
                aria-label="Search areas"
                className="w-full rounded-xl border border-ink/10 bg-surface/60 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-sage focus:ring-2 focus:ring-sage/20"
              />
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {areas.map((name) => (
                <li key={name}>
                  <button
                    onClick={() => choose(name)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      locality === name
                        ? "bg-ink font-medium text-cream"
                        : "border border-ink/10 bg-surface/60 hover:border-ink/30"
                    }`}
                  >
                    <MapPin className="size-3.5 shrink-0 opacity-60" aria-hidden />
                    {name}
                  </button>
                </li>
              ))}
              {areas.length === 0 && (
                <li className="col-span-2 py-3 text-center text-sm text-ink/55">
                  No launch area matches "{query}".
                </li>
              )}
            </ul>
          </div>

          <button
            onClick={skip}
            className="mt-5 w-full text-center text-sm text-ink/55 underline-offset-2 hover:text-ink hover:underline"
          >
            {locality ? "Keep " + locality : "Just browsing — skip for now"}
          </button>
        </div>
      </div>
    </div>
  );
}
