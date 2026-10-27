import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatINR } from "@/lib/format";

type Vendor = Tables<"vendors">;
type Listing = Tables<"plants">;
type Status = "pending" | "approved" | "rejected";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-sagelight text-ink/70",
  approved: "bg-sage/15 text-sage",
  rejected: "bg-terra/10 text-terra",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  rejected: "Needs changes",
};

/** Admin queue for vendor sign-ups and their plant listings. */
export function VendorReview() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    const [v, l] = await Promise.all([
      supabase.from("vendors").select("*").order("created_at", { ascending: false }),
      supabase
        .from("plants")
        .select("*")
        .not("vendor_id", "is", null)
        .order("created_at", { ascending: false }),
    ]);
    if (v.error || l.error) setError((v.error ?? l.error)!.message);
    setVendors(v.data ?? []);
    setListings(l.data ?? []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const decide = async (kind: "vendor" | "listing", id: string, status: Status) => {
    const note = notes[id]?.trim() ?? "";
    if (status === "rejected" && !note) {
      setError("Add a short note so the vendor knows what to change.");
      return;
    }
    setBusyId(id);
    setError("");
    const patch = { status, review_note: status === "rejected" ? note : "" };
    const { error: updateError } =
      kind === "vendor"
        ? await supabase.from("vendors").update(patch).eq("user_id", id)
        : await supabase.from("plants").update(patch).eq("id", id);
    setBusyId("");
    if (updateError) return setError(updateError.message);
    await refresh();
  };

  const pendingVendors = vendors.filter((v) => v.status === "pending");
  const pendingListings = listings.filter((l) => l.status === "pending");
  const vendorName = (id: string | null) =>
    vendors.find((v) => v.user_id === id)?.business_name ?? "Unknown vendor";
  const vendorStatus = (id: string | null) => vendors.find((v) => v.user_id === id)?.status;

  const decisionButtons = (kind: "vendor" | "listing", id: string) => (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        onClick={() => decide(kind, id, "approved")}
        disabled={busyId === id}
        className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-cream transition hover:bg-ink/90 disabled:opacity-50"
      >
        Approve
      </button>
      <input
        value={notes[id] ?? ""}
        onChange={(e) => setNotes((n) => ({ ...n, [id]: e.target.value }))}
        placeholder="Note for the vendor if changes are needed"
        maxLength={300}
        className="min-w-0 flex-1 rounded-full border border-ink/10 bg-surface/60 px-3 py-2 text-xs outline-none focus:border-sage"
      />
      <button
        onClick={() => decide(kind, id, "rejected")}
        disabled={busyId === id}
        className="rounded-full border border-terra/40 px-4 py-2 text-xs font-medium text-terra transition hover:bg-terra/10 disabled:opacity-50"
      >
        Needs changes
      </button>
    </div>
  );

  return (
    <section className="rounded-3xl border border-ink/5 bg-surface/60 p-6 backdrop-blur-xl">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-terra">Marketplace</p>
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">Vendor review</h2>
      <p className="mt-1 text-sm text-ink/55">
        {pendingVendors.length} vendor{pendingVendors.length === 1 ? "" : "s"} and{" "}
        {pendingListings.length} listing
        {pendingListings.length === 1 ? "" : "s"} waiting · {vendors.length} vendor
        {vendors.length === 1 ? "" : "s"} in total
      </p>
      {error && <p className="mt-3 text-sm text-terra">{error}</p>}

      <h3 className="mt-6 text-sm font-semibold">New vendors</h3>
      {pendingVendors.length === 0 ? (
        <p className="mt-2 text-sm text-ink/50">Nothing waiting.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {pendingVendors.map((v) => (
            <li key={v.user_id} className="rounded-2xl bg-sagelight/50 p-4">
              <p className="font-display text-base font-semibold">{v.business_name}</p>
              <p className="text-sm text-ink/65">
                {v.contact_name} · {v.phone} · {v.email}
              </p>
              <p className="text-sm text-ink/55">
                {v.locality}
                {v.address && ` · ${v.address}`}
                {v.gstin && ` · GSTIN ${v.gstin}`}
              </p>
              <p className="text-sm text-ink/55">Delivers to: {v.service_areas.join(", ")}</p>
              {v.about && <p className="mt-1 text-sm text-ink/60">{v.about}</p>}
              {decisionButtons("vendor", v.user_id)}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-sm font-semibold">Listings to review</h3>
      {pendingListings.length === 0 ? (
        <p className="mt-2 text-sm text-ink/50">Nothing waiting.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {pendingListings.map((l) => (
            <li key={l.id} className="flex gap-4 rounded-2xl bg-sagelight/50 p-4">
              {l.image_url ? (
                <a href={l.image_url} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={l.image_url} alt={l.name} className="size-24 rounded-xl object-cover" />
                </a>
              ) : (
                <span className="grid size-24 shrink-0 place-items-center rounded-xl bg-surface text-xs text-terra">
                  No photo
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-base font-semibold">{l.name}</p>
                  <p className="font-display font-semibold">{formatINR(Number(l.price))}</p>
                </div>
                <p className="text-sm text-ink/60">
                  {vendorName(l.vendor_id)}
                  {vendorStatus(l.vendor_id) !== "approved" && " (vendor not approved yet)"} ·{" "}
                  {l.category} · {l.tag || "no tag"} · {l.stock} in stock
                </p>
                {l.tagline && <p className="text-sm text-ink/70">{l.tagline}</p>}
                <p className="mt-1 text-sm text-ink/60">{l.description}</p>
                {decisionButtons("listing", l.id)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {vendors.some((v) => v.status !== "pending") && (
        <>
          <h3 className="mt-6 text-sm font-semibold">All vendors</h3>
          <ul className="mt-2 divide-y divide-ink/5">
            {vendors
              .filter((v) => v.status !== "pending")
              .map((v) => (
                <li
                  key={v.user_id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{v.business_name}</span>
                    <span className="text-ink/50">
                      {" "}
                      · {v.locality} · {listings.filter((l) => l.vendor_id === v.user_id).length}{" "}
                      listings
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[v.status]}`}
                  >
                    {STATUS_LABEL[v.status]}
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}
