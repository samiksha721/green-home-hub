import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { TIMES, upcomingDays, type Pro } from "@/lib/catalog";
import { LOCALITY_NAMES, isLocality, useLocality, type Locality } from "@/lib/localities";
import { formatINR } from "@/lib/format";
import { ProAvatar } from "@/components/ProAvatar";

interface BookingDialogProps {
  pro: Pro | null;
  onClose: () => void;
}

export function BookingDialog({ pro, onClose }: BookingDialogProps) {
  const [service, setService] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [day, setDay] = useState("");
  const [time, setTime] = useState(TIMES[1]);
  const [address, setAddress] = useState("");
  const [savedLocality] = useLocality();
  const [area, setArea] = useState<Locality | "">("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (pro) {
      const next = upcomingDays();
      setService(pro.services[0] ?? "");
      setDays(next);
      setDay(next[0] ?? "");
      setTime(TIMES[1]);
      setAddress("");
      setConfirmed(false);
      setArea(savedLocality && pro.areas.includes(savedLocality) ? savedLocality : "");
    }
  }, [pro, savedLocality]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pro) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div className="animate-rise relative w-full max-w-md rounded-3xl border border-ink/5 bg-cream/95 p-5 shadow-2xl backdrop-blur-2xl ring-1 ring-ink/5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">Appointment</p>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full border border-ink/10 bg-surface/60 transition hover:border-ink/30"
            aria-label="Close booking"
          >
            <X className="size-4" />
          </button>
        </div>

        {confirmed ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-sage/15 text-sage">
              <Check className="size-6" />
            </span>
            <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight">
              You're booked
            </h3>
            <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-ink/60">
              {pro.name} will see you in {area} on {day} at {time}. We'll text a confirmation and a
              reminder the day before.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-cream transition hover:bg-ink/90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sagelight/50 p-3">
              <ProAvatar pro={pro} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-display text-base font-semibold leading-tight">
                  {pro.name}
                </p>
                <p className="truncate text-sm text-ink/55">
                  {pro.role} · {formatINR(pro.rate)}/hr
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <span className="text-xs font-medium text-ink/50">Service</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {pro.services.map((s) => (
                    <button
                      key={s}
                      onClick={() => setService(s)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        service === s
                          ? "bg-ink text-cream"
                          : "border border-ink/10 bg-surface/60 text-ink/70 hover:border-ink/30"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-ink/50">Day</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {days.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDay(d)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        day === d
                          ? "bg-sage text-cream"
                          : "border border-ink/10 bg-surface/60 text-ink/70 hover:border-ink/30"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-ink/50">Time</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {TIMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        time === t
                          ? "bg-terra text-cream"
                          : "border border-ink/10 bg-surface/60 text-ink/70 hover:border-ink/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-ink/50">Area</span>
                <select
                  value={area}
                  onChange={(e) => setArea(isLocality(e.target.value) ? e.target.value : "")}
                  className="mt-1.5 w-full rounded-xl border border-ink/10 bg-surface/60 px-3 py-2.5 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20"
                >
                  <option value="">Choose your area…</option>
                  {LOCALITY_NAMES.filter((name) => pro.areas.includes(name)).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {savedLocality && !pro.areas.includes(savedLocality) && (
                  <span className="mt-1 block text-xs text-terra">
                    {pro.name.split(" ")[0]} doesn't travel to {savedLocality} yet — pick a nearby
                    area or another expert.
                  </span>
                )}
              </label>

              <label className="block">
                <span className="text-xs font-medium text-ink/50">Address</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={120}
                  placeholder="Flat / house no., street, landmark"
                  className="mt-1.5 w-full rounded-xl border border-ink/10 bg-surface/60 px-3 py-2.5 text-sm outline-none transition placeholder:text-ink/35 focus:border-sage focus:ring-2 focus:ring-sage/20"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
              <div>
                <p className="text-xs text-ink/50">Estimated total (2 hrs)</p>
                <p className="font-display text-xl font-semibold">{formatINR(pro.rate * 2)}</p>
              </div>
              <button
                onClick={() => setConfirmed(true)}
                disabled={!address.trim() || !area}
                className="rounded-full bg-terra px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-terra/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirm booking
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
